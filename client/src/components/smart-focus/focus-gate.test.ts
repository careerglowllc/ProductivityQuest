import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { SMART_FOCUS_SETTINGS_PATH, focusView, showsSortControl } from "./focus-gate";
import { FOCUS_MIN_GAP_MS, focusRefreshDue } from "./focus-refresh";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Smart Focus tab: on only when Smart Focus is enabled in settings", () => {
  assert.equal(focusView({ isError: false, data: { enabled: true } }), "on");
});

test("Smart Focus tab: disabled shows no quests", () => {
  assert.equal(focusView({ isError: false, data: { enabled: false } }), "off");
});

test("Smart Focus tab: waits for the setting instead of flashing quests", () => {
  assert.equal(focusView({ isError: false, data: undefined }), "loading");
  assert.equal(focusView({ isError: false, data: null }), "loading");
});

test("Smart Focus tab: a failed settings load is an error, not 'on'", () => {
  assert.equal(focusView({ isError: true, data: undefined }), "error");
});

test("Smart Focus tab: a refetch error keeps using the last known setting", () => {
  assert.equal(focusView({ isError: true, data: { enabled: true } }), "on");
  assert.equal(focusView({ isError: true, data: { enabled: false } }), "off");
});

test("Smart Focus settings: the page route, the settings list entry and the off-notice link all use the same path", () => {
  assert.equal(SMART_FOCUS_SETTINGS_PATH, "/settings/smart-focus");
  assert.ok(read("App.tsx").includes(`<Route path="${SMART_FOCUS_SETTINGS_PATH}" component={SmartFocusSettingsPage} />`), "route registered in App.tsx");
  assert.ok(read("pages/settings.tsx").includes(`path: "${SMART_FOCUS_SETTINGS_PATH}"`), "listed on the Settings page");
  assert.ok(read("components/smart-focus/focus-off-notice.tsx").includes("SMART_FOCUS_SETTINGS_PATH"), "off notice links to it");
  assert.ok(existsSync(new URL("../../pages/settings-smart-focus.tsx", import.meta.url)), "settings page exists");
});

test("Smart Focus settings page holds the on/off switch, refresh and private preferences", () => {
  const page = read("pages/settings-smart-focus.tsx");
  assert.match(page, /"Disable" : "Enable"/);
  assert.ok(page.includes("useRefreshFocus"));
  assert.ok(page.includes("FocusMemoryDialog"));
  assert.ok(page.includes("Before you enable Smart Focus"), "keeps the OpenAI consent notice");
});

test("Quests page: the old Smart Focus explanation panel is gone and the tab is gated by the setting", () => {
  const home = read("pages/home.tsx");
  assert.ok(!home.includes("FocusControls"), "no controls panel on the Quests page");
  assert.ok(!existsSync(new URL("./focus-controls.tsx", import.meta.url)), "panel component removed");
  assert.ok(home.includes("focusView(focusState)"));
  assert.ok(home.includes("<FocusOffNotice />"));
  assert.match(home, /smartView === "on"/);
});

test("the sort control is hidden on Smart Focus only", () => {
  assert.equal(showsSortControl("smart"), false);
  for (const filter of ["all", "due-today", "high-priority", "routines", "upcoming", "assignee-alex"]) assert.equal(showsSortControl(filter), true);
});

test("Smart Focus re-reads quests only once they are a few minutes old, never while first loading", () => {
  const now = 1_000_000_000;
  assert.equal(focusRefreshDue(undefined, now), false);
  assert.equal(focusRefreshDue(0, now), false);
  assert.equal(focusRefreshDue(now - 60_000, now), false);
  assert.equal(focusRefreshDue(now - FOCUS_MIN_GAP_MS, now), true);
  assert.equal(focusRefreshDue(now - 3 * 60 * 60_000, now), true);
});
