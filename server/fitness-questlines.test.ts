import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { run, EMAIL } = createRequire(import.meta.url)("../add-healthy-fit-body-questline.cjs") as {
  run: (sql: unknown, options?: { dry?: boolean; log?: (...args: unknown[]) => void }) => Promise<{ created: string[]; reparented: string[]; filed: string[]; skipped: string[] }>; EMAIL: string;
};

type Questline = { id: number; user_id: string; title: string; icon: string; parent_questline_id: number | null };
type Task = { id: number; user_id: string; title: string; questline_id: number | null; questline_order: number | null; parent_task_id: number | null; indent_level: number; completed: boolean; recycled_reason: string | null };

// A tiny in-memory stand-in for the database, answering just the queries the script sends.
function fakeDb(tasks: Task[], questlines: Questline[] = []) {
  let nextId = 100;
  const sql = async (strings: TemplateStringsArray, ...v: any[]) => {
    const text = strings.join("?").replace(/\s+/g, " ").trim();
    if (text.startsWith("SELECT id FROM users")) return v[0] === EMAIL ? [{ id: "u1" }] : [];
    if (text.startsWith("SELECT id FROM questlines")) return questlines.filter((q) => q.user_id === v[0] && q.title === v[1]).map((q) => ({ id: q.id }));
    if (text.startsWith("UPDATE questlines SET parent_questline_id")) { questlines.find((q) => q.id === v[1])!.parent_questline_id = v[0]; return []; }
    if (text.startsWith("INSERT INTO questlines")) { const q = { id: nextId++, user_id: v[0], title: v[1], icon: v[3], parent_questline_id: v[4] }; questlines.push(q); return [{ id: q.id }]; }
    if (text.startsWith("SELECT id, questline_id FROM tasks")) {
      return tasks.filter((t) => t.user_id === v[0] && t.title.trim() === v[1] && (t.recycled_reason === null || t.recycled_reason === "completed")).map((t) => ({ id: t.id, questline_id: t.questline_id })).slice(0, 1);
    }
    if (text.startsWith("UPDATE tasks SET questline_id")) { Object.assign(tasks.find((t) => t.id === v[2])!, { questline_id: v[0], questline_order: v[1], parent_task_id: null, indent_level: 0 }); return []; }
    throw new Error(`unexpected query: ${text}`);
  };
  return { sql, tasks, questlines };
}
const task = (id: number, title: string, extra: Partial<Task> = {}): Task => ({ id, user_id: "u1", title, questline_id: null, questline_order: null, parent_task_id: null, indent_level: 0, completed: false, recycled_reason: null, ...extra });
const quiet = { log: () => {} };

test("a north star comes off the core with Weightlifting and the cardio quest as its two separate children", async () => {
  const db = fakeDb([task(7926, "Weightlifting"), task(7909, " Cardio/Boxing Drilling/Sparring")]);
  const result = await run(db.sql, quiet);
  const byTitle = Object.fromEntries(db.questlines.map((q) => [q.title, q]));
  assert.equal(byTitle["Healthy & Fit Body"].parent_questline_id, null, "a spoke off Your Horizon");
  assert.equal(byTitle["Weightlifting"].parent_questline_id, byTitle["Healthy & Fit Body"].id);
  assert.equal(byTitle["Cardio, Boxing & Sparring"].parent_questline_id, byTitle["Healthy & Fit Body"].id);
  assert.notEqual(byTitle["Weightlifting"].id, byTitle["Cardio, Boxing & Sparring"].id);
  assert.deepEqual(result.created, ["Healthy & Fit Body", "Weightlifting", "Cardio, Boxing & Sparring"]);
});

test("the existing quests are filed into the right child, as top-level stages", async () => {
  const db = fakeDb([task(7926, "Weightlifting"), task(7909, " Cardio/Boxing Drilling/Sparring")]);
  await run(db.sql, quiet);
  const id = (title: string) => db.questlines.find((q) => q.title === title)!.id;
  assert.deepEqual(db.tasks.map((t) => [t.id, t.questline_id, t.questline_order, t.parent_task_id, t.indent_level]), [
    [7926, id("Weightlifting"), 1, null, 0],
    [7909, id("Cardio, Boxing & Sparring"), 1, null, 0],
  ]);
});

test("running it again changes nothing, and a quest already in another questline is left alone", async () => {
  const db = fakeDb([task(7926, "Weightlifting"), task(7909, "Cardio/Boxing Drilling/Sparring", { questline_id: 12 })]);
  const first = await run(db.sql, quiet);
  assert.match(first.skipped.join(), /Cardio\/Boxing Drilling\/Sparring \(already in questline 12\)/);
  assert.equal(db.tasks[1].questline_id, 12);
  const questlineCount = db.questlines.length;
  const second = await run(db.sql, quiet);
  assert.equal(db.questlines.length, questlineCount, "no duplicate questlines");
  assert.deepEqual(second.created, []);
  assert.equal(db.tasks[0].questline_id, db.questlines.find((q) => q.title === "Weightlifting")!.id);
});

test("a dry run writes nothing", async () => {
  const db = fakeDb([task(7926, "Weightlifting")]);
  const result = await run(db.sql, { dry: true, log: () => {} });
  assert.equal(db.questlines.length, 0);
  assert.equal(db.tasks[0].questline_id, null);
  assert.equal(result.created.length, 3);
});

test("a deleted quest is never filed, and a missing quest is reported", async () => {
  const db = fakeDb([task(7926, "Weightlifting", { recycled_reason: "deleted" })]);
  const result = await run(db.sql, quiet);
  assert.equal(db.tasks[0].questline_id, null);
  assert.deepEqual(result.skipped, ["Weightlifting (not found)", "Cardio/Boxing Drilling/Sparring (not found)"]);
});
