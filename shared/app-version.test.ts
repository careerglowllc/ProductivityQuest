import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const xcode = read("ios/App/App.xcodeproj/project.pbxproj");
const all = (pattern: RegExp) => Array.from(xcode.matchAll(pattern), (m) => m[1]);

test("the Settings footer shows the same version as the Xcode project", () => {
  const footer = /const APP_VERSION = "v([\d.]+)";/.exec(read("client/src/pages/settings.tsx"))?.[1];
  const marketing = new Set(all(/MARKETING_VERSION = ([\d.]+);/g));
  assert.ok(footer, "footer version found");
  assert.deepEqual([...marketing], [footer], "Debug and Release agree with the footer");
});

test("Debug and Release share one build number, and the plist reads both from the project", () => {
  const builds = new Set(all(/CURRENT_PROJECT_VERSION = (\d+);/g));
  assert.equal(builds.size, 1);
  assert.ok(Number([...builds][0]) >= 15);
  const plist = read("ios/App/App/Info.plist");
  assert.match(plist, /\$\(MARKETING_VERSION\)/);
  assert.match(plist, /\$\(CURRENT_PROJECT_VERSION\)/);
});
