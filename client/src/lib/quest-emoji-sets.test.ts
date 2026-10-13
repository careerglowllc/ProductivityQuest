import test from "node:test";
import assert from "node:assert/strict";
import { QUEST_EMOJI_ENTRIES, QUEST_EMOJI_SETS, mergeEmojiEntries } from "./quest-emoji-sets";

const find = (word: string) => QUEST_EMOJI_ENTRIES.filter(entry => entry.keywords.some(k => k.startsWith(word))).map(entry => entry.emoji);

test("lab, construction and office sets exist and are large enough to be useful", () => {
  assert.deepEqual(QUEST_EMOJI_SETS.map(set => set.label), ["Lab & Science", "Construction & Measuring", "Office Equipment"]);
  for (const set of QUEST_EMOJI_SETS) assert.ok(set.entries.length >= 25, `${set.label} has ${set.entries.length}`);
});

test("the requested objects can be found by name", () => {
  assert.ok(find("test").includes("🧪"), "test tube");
  assert.ok(find("beaker").includes("⚗️"), "beaker");
  assert.ok(find("microscope").includes("🔬"));
  assert.ok(find("petri").includes("🧫"));
  assert.ok(find("hammer").includes("🔨"));
  assert.ok(find("level").includes("📐"), "level");
  assert.ok(find("measure").includes("📏"), "measuring tools");
  assert.ok(find("stapler").includes("🖇️"), "stapler");
  assert.ok(find("screwdriver").includes("🪛"));
  assert.ok(find("printer").includes("🖨️"));
  assert.ok(find("filing").includes("🗄️"));
});

test("every entry is exactly one emoji with keywords, and none repeats within the combined list", () => {
  const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });
  const seen = new Set<string>();
  for (const entry of QUEST_EMOJI_ENTRIES) {
    assert.equal([...graphemes.segment(entry.emoji)].length, 1, `"${entry.emoji}" is not a single emoji`);
    assert.ok(!entry.emoji.includes("\uFFFD"), "corrupted character");
    assert.ok(entry.keywords.length >= 2 && entry.keywords.every(word => word.length > 0 && word === word.toLowerCase()));
    assert.ok(!seen.has(entry.emoji), `${entry.emoji} repeated`);
    seen.add(entry.emoji);
  }
});

test("merging keeps one row per emoji and every keyword", () => {
  const merged = mergeEmojiEntries([{ emoji: "🔨", keywords: ["hammer", "tool"] }], [{ emoji: "🔨", keywords: ["tool", "nail"] }, { emoji: "🪛", keywords: ["screw"] }]);
  assert.deepEqual(merged, [{ emoji: "🔨", keywords: ["hammer", "tool", "nail"] }, { emoji: "🪛", keywords: ["screw"] }]);
});
