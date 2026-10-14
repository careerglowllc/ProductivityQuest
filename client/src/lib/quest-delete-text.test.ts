import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describeStake, nameList } from "./quest-delete-text";

test("names are listed in plain words, with the rest counted", () => {
  assert.equal(nameList(["C"]), '"C"');
  assert.equal(nameList(["C", "D"]), '"C" and "D"');
  assert.equal(nameList(["C", "D", "E"]), '"C", "D" and "E"');
  assert.equal(nameList(["1", "2", "3", "4", "5", "6", "7"]), '"1", "2", "3", "4", "5" and 2 more');
});

test("deleting B with C and D after it: the question and both answers", () => {
  const text = describeStake({ deleting: ["B"], children: ["C", "D"], connectsTo: ["A"], toTop: false });
  assert.equal(text.title, 'Delete "B"?');
  assert.equal(text.intro, '"B" has 2 quests after it in the questline: "C" and "D". What should happen to them?');
  assert.equal(text.keepLabel, "Keep and move up");
  assert.equal(text.keepHint, 'They will connect to "A" instead.');
  assert.equal(text.deleteLabel, "Delete them too");
});

test("with a single quest after it, the words are singular and name that quest", () => {
  const text = describeStake({ deleting: ["B"], children: ["C"], connectsTo: ["A"], toTop: false });
  assert.equal(text.intro, '"B" has 1 quest after it in the questline: "C". What should happen to it?');
  assert.equal(text.keepHint, '"C" will connect to "A" instead.');
  assert.equal(text.deleteLabel, "Delete it too");
});

test("deleting the first quest says the next ones become first quests", () => {
  assert.equal(describeStake({ deleting: ["A"], children: ["B", "E"], connectsTo: [], toTop: true }).keepHint, "They become first quests of the questline.");
  assert.equal(describeStake({ deleting: ["A"], children: ["B"], connectsTo: [], toTop: true }).keepHint, "It becomes a first quest of the questline.");
});

test("when quests would land in different places, it says they move up without naming one", () => {
  assert.equal(describeStake({ deleting: ["B", "X"], children: ["C", "D"], connectsTo: ["A", "W"], toTop: false }).keepHint, "They move up to the next quest above them.");
  assert.equal(describeStake({ deleting: ["B"], children: ["C", "D"], connectsTo: ["A"], toTop: true }).keepHint, "They move up to the next quest above them.");
});

test("deleting several quests at once is worded for several", () => {
  const text = describeStake({ deleting: ["B", "C"], children: ["D"], connectsTo: ["A"], toTop: false });
  assert.equal(text.title, "Delete 2 quests?");
  assert.ok(text.intro.startsWith("These 2 quests have 1 quest after them in the questline"));
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the dialog offers keep and move up first, delete them too, and cancel; Escape cancels", () => {
  const dialog = read("../components/quest-delete-children-dialog.tsx");
  assert.ok(dialog.indexOf("delete-children-keep") < dialog.indexOf("delete-children-delete"));
  assert.ok(dialog.includes('onChoose("promote")') && dialog.includes('onChoose("delete")'));
  assert.ok(dialog.includes('data-testid="delete-children-cancel"'));
  assert.ok(dialog.includes("if (!open) onCancel()"));
});

test("the Quests page asks before deleting a selection that has quests after it, then deletes as chosen", () => {
  const home = read("../pages/home.tsx");
  assert.ok(home.includes("childrenAtStake(tasks as any[], Array.from(selectedTasks))"));
  assert.ok(home.includes("if (stake) { setDeletePrompt(stake); return; }"), "nothing is deleted until the user answers");
  assert.ok(home.includes('{ ...(children ? { children } : {}),'), "the choice is sent to the server");
  assert.ok(home.includes("onChoose={(choice) => { setDeletePrompt(null); void deleteSelectedQuests(choice); }}"));
  assert.ok(home.includes("taskIds: plan.deleteIds"), "undo covers the quests deleted along with it");
});

test("the questline editor asks the same question and updates its list from the answer", () => {
  const editor = read("../components/edit-questline-modal.tsx");
  assert.ok(editor.includes("childrenAtStake(orderedTasks, [taskId])"));
  assert.ok(editor.includes("onClick={() => requestDeleteTask(task.id)}"));
  assert.ok(editor.includes("?children=${children}"));
  assert.ok(editor.includes("gone.has(t.id)") && editor.includes("moved.get(t.id)!.indentLevel"));
});

test("the server plans before it deletes, and treats quests after a deleted one the same on both delete routes", () => {
  const routes = read("../../../server/routes.ts");
  assert.ok(routes.includes('req.body?.children === "delete" ? "delete" : "promote"'), "moving up is the default");
  assert.ok(routes.includes('req.query.children === "delete" ? "delete" : "promote"'));
  assert.ok(routes.includes("for (const taskId of plan.deleteIds)"));
  assert.ok(routes.indexOf("planQuestDelete(userId, [id], choice)") < routes.indexOf("storage.deleteTask(id, userId)"), "planned while the quest is still active");
  assert.equal((routes.match(/storage\.updateTask\(move\.id, \{ parentTaskId: move\.parentTaskId, indentLevel: move\.indentLevel \}/g) ?? []).length, 2);
});
