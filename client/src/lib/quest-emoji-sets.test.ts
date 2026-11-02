import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUEST_EMOJI_ENTRIES, QUEST_EMOJI_SETS, mergeEmojiEntries } from "./quest-emoji-sets";

const find = (word: string) => QUEST_EMOJI_ENTRIES.filter(entry => entry.keywords.some(k => k.startsWith(word))).map(entry => entry.emoji);

test("lab, construction, office and geography sets exist and are large enough to be useful", () => {
  assert.deepEqual(QUEST_EMOJI_SETS.map(set => set.label), ["Lab & Science", "Construction & Measuring", "Office Equipment", "Continents & Regions", "European Countries", "American Cities"]);
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

const setOf = (label: string) => QUEST_EMOJI_SETS.find(set => set.label === label)!.entries.map(entry => entry.emoji);

test("each continent can be found by name, with a globe for the whole world", () => {
  for (const word of ["europe", "asia", "africa", "america", "oceania", "antarctica", "australia"]) assert.ok(find(word).length > 0, word);
  assert.ok(find("europe").includes("🌍") && find("asia").includes("🌏") && find("america").includes("🌎"));
  assert.ok(find("world").includes("🌐") && find("world").includes("🗺️"));
  assert.ok(find("japan").includes("🗾") && find("india").includes("🛕") && find("china").includes("🐼"));
});

test("the European countries each have a flag, found by country or capital", () => {
  const flags = setOf("European Countries").filter(emoji => /^\p{Regional_Indicator}{2}$/u.test(emoji));
  assert.ok(flags.length >= 35, `${flags.length} flags`);
  for (const [word, flag] of [["france", "🇫🇷"], ["germany", "🇩🇪"], ["italy", "🇮🇹"], ["spain", "🇪🇸"], ["portugal", "🇵🇹"], ["ireland", "🇮🇪"], ["greece", "🇬🇷"], ["sweden", "🇸🇪"], ["poland", "🇵🇱"], ["paris", "🇫🇷"], ["rome", "🇮🇹"], ["holland", "🇳🇱"], ["union", "🇪🇺"]]) {
    assert.ok(find(word).includes(flag), `${word} finds ${flag}`);
  }
});

test("the American cities have an icon each, found by city name", () => {
  for (const [word, icon] of [["new york", "🗽"], ["francisco", "🌉"], ["angeles", "🌴"], ["vegas", "🎰"], ["austin", "🎸"], ["houston", "🚀"], ["chicago", "🏙️"], ["seattle", "🌲"], ["boston", "🦞"], ["washington", "🏛️"], ["miami", "🏖️"], ["honolulu", "🌺"], ["denver", "⛰️"], ["orleans", "🎷"], ["phoenix", "🌵"]] as const) {
    assert.ok(QUEST_EMOJI_ENTRIES.some(entry => entry.emoji === icon && entry.keywords.join(" ").includes(word)), `${word} finds ${icon}`);
  }
});

test("the add-quest picker has no corrupted emoji, and the globe is a single globe", () => {
  const modal = readFileSync(new URL("../components/add-task-modal.tsx", import.meta.url), "utf8");
  const picker = modal.slice(modal.indexOf("const TASK_EMOJIS"), modal.indexOf("...QUEST_EMOJI_ENTRIES.map"));
  assert.ok(!picker.slice(0, picker.indexOf("const EMOJI_SEARCH_MAP")).includes("\uFFFD"), "category lists are clean");
  assert.ok(!picker.includes("\uFFFD"), "search entries are clean");
  assert.ok(modal.includes('{ emoji: "🌍", keywords: "earth world global" }'), "the globe entry is just the globe");
});
