import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QUEST_TYPES, QUEST_TYPE_LABELS, type QuestType } from "../../../shared/quest-type";
import { QUEST_TYPE_UI, QuestTypeBadge, QuestTypeChooser } from "./quest-type-chooser";

type El = ReactElement<Record<string, any>>;
const isEl = (node: unknown): node is El => !!node && typeof node === "object" && "props" in (node as object);

// Collects every element in a rendered tree that matches, so tests can read props and call handlers.
function findAll(node: ReactNode, match: (el: El) => boolean, found: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((child) => findAll(child, match, found));
  else if (isEl(node)) {
    if (match(node)) found.push(node);
    findAll(node.props.children, match, found);
  }
  return found;
}
const textOf = (node: ReactNode): string =>
  Array.isArray(node) ? node.map(textOf).join(" ") : typeof node === "string" || typeof node === "number" ? String(node) : isEl(node) ? textOf(node.props.children) : "";

test("chooser: shows three buttons, one per quest type, in order", () => {
  const buttons = findAll(QuestTypeChooser({ onSelect: () => {} }), (el) => el.type === "button");
  assert.equal(buttons.length, 3);
  assert.deepEqual(buttons.map((b) => b.props["data-quest-type"]), [...QUEST_TYPES]);
  for (const b of buttons) assert.equal(b.props.type, "button", "must not submit a surrounding form");
});

test("chooser: each button carries its label and a short description", () => {
  const buttons = findAll(QuestTypeChooser({ onSelect: () => {} }), (el) => el.type === "button");
  buttons.forEach((button, i) => {
    const type = QUEST_TYPES[i];
    const text = textOf(button);
    assert.ok(text.includes(QUEST_TYPE_LABELS[type]), `${type} button shows its label`);
    assert.ok(text.includes(QUEST_TYPE_UI[type].blurb), `${type} button shows its description`);
  });
});

test("chooser: clicking a button reports exactly that quest type, once", () => {
  for (const type of QUEST_TYPES) {
    const picked: QuestType[] = [];
    const button = findAll(QuestTypeChooser({ onSelect: (t) => picked.push(t) }), (el) => el.type === "button" && el.props["data-quest-type"] === type)[0];
    assert.ok(button, `${type} button exists`);
    button.props.onClick();
    assert.deepEqual(picked, [type]);
  }
});

test("chooser: each type has its own icon and colour so they read apart at a glance", () => {
  const icons = QUEST_TYPES.map((type) => (QUEST_TYPE_UI[type].icon as El).type);
  assert.equal(new Set(icons).size, 3, "three different icons");
  assert.equal(new Set(QUEST_TYPES.map((type) => QUEST_TYPE_UI[type].tile)).size, 3, "three different colours");
});

test("chooser: the buttons are grouped under a heading for screen readers", () => {
  const tree = QuestTypeChooser({ onSelect: () => {} });
  const heading = findAll(tree, (el) => el.type === "h3")[0];
  const group = findAll(tree, (el) => el.props.role === "group")[0];
  assert.ok(heading && group);
  assert.equal(group.props["aria-labelledby"], heading.props.id);
  assert.equal(textOf(heading), "What kind of quest is this?");
});

test("chooser: renders to real markup with three buttons and no quest form fields yet", () => {
  const html = renderToStaticMarkup(QuestTypeChooser({ onSelect: () => {} }));
  assert.equal((html.match(/<button/g) ?? []).length, 3);
  for (const label of Object.values(QUEST_TYPE_LABELS)) assert.ok(html.includes(label));
  assert.ok(!/<input|<textarea|Create Quest|Quest Title/.test(html), "the form only appears after a choice");
});

test("badge: names the chosen type", () => {
  for (const type of QUEST_TYPES) assert.ok(renderToStaticMarkup(QuestTypeBadge({ type })).includes(QUEST_TYPE_LABELS[type]));
});
