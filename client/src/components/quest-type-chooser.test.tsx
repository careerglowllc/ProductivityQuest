import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QUEST_TYPES, QUEST_TYPE_LABELS, type QuestType } from "../../../shared/quest-type";
import { QUEST_TYPE_UI, QuestTypeBadge, QuestTypeChooser, QuestTypeIcon, QuestTypeSelector } from "./quest-type-chooser";

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

test("QuestTypeIcon: one distinct labelled icon per type", () => {
  const markup = QUEST_TYPES.map((type) => renderToStaticMarkup(<QuestTypeIcon type={type} />));
  QUEST_TYPES.forEach((type, i) => {
    assert.ok(markup[i].includes(`data-quest-type-icon="${type}"`));
    assert.ok(markup[i].includes(`title="${QUEST_TYPE_LABELS[type]}"`));
  });
  assert.equal(new Set(markup.map((m) => m.match(/<svg[^>]*class="([^"]*)"/)?.[1]?.split(" ").find((c) => c.startsWith("lucide-")))).size, 3);
});

test("QuestTypeIcon: missing or unknown type shows the general icon", () => {
  for (const type of [undefined, null, "", "bogus"]) {
    assert.ok(renderToStaticMarkup(<QuestTypeIcon type={type} />).includes('data-quest-type-icon="general"'));
  }
});

const selectorButtons = (props: Parameters<typeof QuestTypeSelector>[0]) =>
  findAll(QuestTypeSelector(props), (el) => el.type === "button");

test("selector: three buttons on one row, one per type, in order", () => {
  const tree = QuestTypeSelector({ value: "general", onChange: () => {} });
  assert.equal(tree.props["data-testid"], "quest-type-buttons");
  assert.match(tree.props.className, /grid-cols-3/, "all three share one row");
  const buttons = findAll(tree, (el) => el.type === "button");
  assert.deepEqual(buttons.map((b) => b.props["data-quest-type"]), [...QUEST_TYPES]);
  buttons.forEach((b, i) => {
    assert.ok(textOf(b).includes(QUEST_TYPE_LABELS[QUEST_TYPES[i]]));
    assert.equal(b.props.type, "button", "must not submit a surrounding form");
  });
});

test("selector: highlights exactly the current type, and unknown or missing values read as general", () => {
  for (const type of QUEST_TYPES) {
    const pressed = selectorButtons({ value: type, onChange: () => {} }).filter((b) => b.props["aria-pressed"]);
    assert.deepEqual(pressed.map((b) => b.props["data-quest-type"]), [type]);
  }
  for (const value of [undefined, null, "", "bogus"]) {
    const pressed = selectorButtons({ value, onChange: () => {} }).filter((b) => b.props["aria-pressed"]);
    assert.deepEqual(pressed.map((b) => b.props["data-quest-type"]), ["general"]);
  }
});

test("selector: clicking another type reports it once; clicking the current type does nothing", () => {
  for (const from of QUEST_TYPES) {
    for (const to of QUEST_TYPES) {
      const picked: QuestType[] = [];
      const button = selectorButtons({ value: from, onChange: (t) => picked.push(t) }).find((b) => b.props["data-quest-type"] === to)!;
      button.props.onClick();
      assert.deepEqual(picked, from === to ? [] : [to], `${from} -> ${to}`);
    }
  }
});

test("selector: buttons are disabled while a change is saving", () => {
  assert.ok(selectorButtons({ value: "general", onChange: () => {}, disabled: true }).every((b) => b.props.disabled));
  assert.ok(selectorButtons({ value: "general", onChange: () => {} }).every((b) => !b.props.disabled));
});

test("selector: renders real markup with three labelled buttons", () => {
  const html = renderToStaticMarkup(QuestTypeSelector({ value: "deadline", onChange: () => {} }));
  assert.equal((html.match(/<button/g) ?? []).length, 3);
  for (const label of Object.values(QUEST_TYPE_LABELS)) assert.ok(html.includes(label));
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
});

test("all three categories: each has a label, icon, colour, description and selector button", () => {
  assert.deepEqual([...QUEST_TYPES], ["reminder", "deadline", "general"]);
  const html = renderToStaticMarkup(QuestTypeSelector({ value: "reminder", onChange: () => {} }));
  for (const type of QUEST_TYPES) {
    assert.ok(QUEST_TYPE_LABELS[type] && QUEST_TYPE_UI[type].blurb && QUEST_TYPE_UI[type].tile);
    assert.ok(html.includes(`data-quest-type="${type}"`));
    assert.ok(renderToStaticMarkup(<QuestTypeIcon type={type} />).includes(`data-quest-type-icon="${type}"`));
  }
});
