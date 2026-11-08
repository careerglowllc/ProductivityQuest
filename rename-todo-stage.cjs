// Renames the kanban stage "To Do" to "Not Started" on every quest, so stored data matches the stages offered when
// creating and editing a quest (see shared/kanban-stages.ts). Quests with no stage are left alone. The ids it changes are
// written to a file first, so the change can be undone with --undo <file>.
//
// Preview: node -r dotenv/config rename-todo-stage.cjs --dry
// Run:     node -r dotenv/config rename-todo-stage.cjs
// Undo:    node -r dotenv/config rename-todo-stage.cjs --undo backups/todo-stage-ids-<time>.json
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const dry = process.argv.includes('--dry');
  const undoIndex = process.argv.indexOf('--undo');

  if (undoIndex !== -1) {
    const ids = JSON.parse(fs.readFileSync(process.argv[undoIndex + 1], 'utf8'));
    const r = await sql`UPDATE tasks SET kanban_stage = 'To Do' WHERE id = ANY(${ids}) AND kanban_stage = 'Not Started' RETURNING id`;
    console.log(`↩️ Put "To Do" back on ${r.length} of ${ids.length} quests.`);
    return;
  }

  const rows = await sql`SELECT id FROM tasks WHERE kanban_stage = 'To Do'`;
  const ids = rows.map((row) => row.id);
  console.log(`${ids.length} quests have the stage "To Do".`);
  if (dry || ids.length === 0) return;

  fs.mkdirSync('backups', { recursive: true });
  const file = `backups/todo-stage-ids-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(file, JSON.stringify(ids));
  const r = await sql`UPDATE tasks SET kanban_stage = 'Not Started' WHERE id = ANY(${ids}) AND kanban_stage = 'To Do' RETURNING id`;
  console.log(`✅ Renamed "To Do" to "Not Started" on ${r.length} quests. Ids saved to ${file}`);
}

run().catch(console.error);
