import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_KANBAN_STAGE, KANBAN_STAGES, isKanbanStage, kanbanStageLabel, normalizeKanbanStage } from "./kanban-stages";
import { INCUBATE_STAGE, stagePatch } from "./incubate";

const read = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("there is one list of stages, in order, and it includes Incubate", () => {
  assert.deepEqual(KANBAN_STAGES.map((s) => s.value), ["Not Started", "In Progress", "Incubate", "Review", "Done"]);
  assert.equal(DEFAULT_KANBAN_STAGE, "Not Started");
  assert.equal(INCUBATE_STAGE, "Incubate", "the incubate rules use the same name");
  assert.deepEqual(KANBAN_STAGES.map(kanbanStageLabel), ["📋 Not Started", "🔄 In Progress", "💡 Incubate", "👀 Review", "✅ Done"]);
  assert.ok(isKanbanStage("Review") && !isKanbanStage("To Do"));
});

test('"To Do", "todo" and blanks are the first stage, and the real names are kept', () => {
  for (const old of ["To Do", "to do", "TODO", "todo", "To-Do", "", "  ", null, undefined, "Not Started", "not started"]) {
    assert.equal(normalizeKanbanStage(old), "Not Started", `${JSON.stringify(old)}`);
  }
  for (const stage of ["In Progress", "Incubate", "Review", "Done"]) assert.equal(normalizeKanbanStage(stage), stage);
  assert.equal(normalizeKanbanStage("in progress"), "In Progress", "case is tidied");
  assert.equal(normalizeKanbanStage("Waiting on Dani"), "Waiting on Dani", "an unknown name is left as it is");
});

test("creating and editing a quest offer the same stages, from the same list", () => {
  const create = read("client/src/components/add-task-modal.tsx");
  const edit = read("client/src/components/task-detail-modal.tsx");
  for (const [name, source] of [["create", create], ["edit", edit]] as const) {
    assert.ok(source.includes("KANBAN_STAGES.map((stage) => <SelectItem key={stage.value} value={stage.value}>{kanbanStageLabel(stage)}</SelectItem>)"), `${name} lists the shared stages`);
  }
  assert.equal(create.includes('<SelectItem value="To Do">'), false, "the create screen no longer has its own list");
  assert.equal(create.includes('useState<string>("To Do")'), false);
  assert.ok(create.includes("useState<string>(DEFAULT_KANBAN_STAGE)") && create.includes("setKanbanStage(DEFAULT_KANBAN_STAGE)"), "new quests start at Not Started, also after a reset");
  assert.ok(edit.includes("value={normalizeKanbanStage(task.kanbanStage)}"), "a quest saved as To Do shows as Not Started instead of a blank");
});

test("choosing Incubate while creating asks for the day, and the quest is saved with it as its start date", () => {
  const create = read("client/src/components/add-task-modal.tsx");
  assert.ok(create.includes("if (value === INCUBATE_STAGE) { setIsIncubateOpen(true); return; }"), "the stage waits for a day");
  assert.ok(create.includes("onConfirm={(day) => { setKanbanStage(INCUBATE_STAGE); setStartDate(day); setIsIncubateOpen(false); }}"));
  assert.ok(create.includes("<IncubateDialog"));
  assert.ok(create.includes("An incubating quest needs a start date after today."), "it cannot be saved without a return day");
  assert.ok(create.includes("incubating ? storedDay(startDate) : startDate.toISOString()"), "stored the same way as when incubating an existing quest");
  assert.ok(create.includes('data-testid="incubate-create-note"'), "the chosen day is shown, with a way to change it");
});

test("leaving Incubate while creating lets go of the return day, as when editing", () => {
  const future = "2999-01-01T00:00:00.000Z";
  assert.deepEqual(stagePatch({ kanbanStage: INCUBATE_STAGE, startDate: future }, "In Progress", new Date()), { kanbanStage: "In Progress", startDate: null });
  assert.deepEqual(stagePatch({ kanbanStage: "Not Started", startDate: future }, "In Progress", new Date()), { kanbanStage: "In Progress" }, "an ordinary start date is kept");
  const create = read("client/src/components/add-task-modal.tsx");
  assert.ok(create.includes("if (patch.startDate === null) setStartDate(undefined);"));
});

test("the server and the Notion export use the same names", () => {
  const routes = read("server/routes.ts");
  assert.equal((routes.match(/bodyData\.kanbanStage = normalizeKanbanStage\(bodyData\.kanbanStage\)/g) ?? []).length, 2, "creating and updating a quest");
  assert.ok(read("server/notion.ts").includes("normalizeKanbanStage(task.kanbanStage)"), "Notion never receives \"To Do\", which is not one of its stages");
});
