import assert from "node:assert/strict";
import { test } from "node:test";
import { regionCardStyle } from "./region-card";

test("region card: dark mode keeps the dark navy fill", () => {
  const style = regionCardStyle("#fb923c", true);
  assert.match(style.background, /rgba\(13,20,42/);
  assert.equal(style.borderColor, "#fb923c44");
});

test("region card: light mode uses a light fill with no dark colours", () => {
  const style = regionCardStyle("#fb923c", false);
  assert.match(style.background, /#ffffff/);
  assert.match(style.background, /#f1f5f9/);
  assert.doesNotMatch(style.background, /rgba\(1[03],/);
  assert.equal(style.borderColor, "#fb923c66", "slightly stronger border so the card still reads on a light page");
});

test("region card: the region colour drives the border in both modes", () => {
  for (const isDark of [true, false]) {
    assert.ok(regionCardStyle("#a855f7", isDark).borderColor.startsWith("#a855f7"));
  }
});
