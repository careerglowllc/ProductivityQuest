// Adds "Whiten Teeth" and "Replace Cracked Front Tooth" quests to the "Looks Maximization"
// questline for alexbaer321@gmail.com, marked complete (mirrors storage.completeTask's
// one-time-task completion + storage.addGold side effects).
// Usage: node -r dotenv/config add-looks-max-teeth-quests.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const ql = await sql`SELECT id, title FROM questlines WHERE user_id = ${userId} AND title = 'Looks Maximization' LIMIT 1`;
  if (!ql.length) { console.error('Looks Maximization questline not found'); return; }
  const qlId = ql[0].id;

  const maxOrderRow = await sql`SELECT COALESCE(MAX(questline_order), 0) AS max_order FROM tasks WHERE questline_id = ${qlId} AND user_id = ${userId}`;
  let orderCounter = maxOrderRow[0].max_order;

  const duration = 30;
  const goldValue = Math.round(duration * 1.5); // Medium importance, matches server's add-stages formula

  const newTitles = ['Whiten Teeth', 'Replace Cracked Front Tooth'];

  for (const title of newTitles) {
    const exists = await sql`SELECT id FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId} AND title = ${title} LIMIT 1`;
    if (exists.length) {
      console.log(`"${title}" already exists in questline, id:`, exists[0].id);
      continue;
    }
    orderCounter += 1;
    const [task] = await sql`
      INSERT INTO tasks (
        user_id, title, description, duration, gold_value, importance, recur_type,
        business_work_filter, campaign, completed, completed_at, recycled, recycled_at,
        recycled_reason, skill_tags, questline_id, questline_order, emoji, parent_task_id, indent_level
      ) VALUES (
        ${userId}, ${title}, '', ${duration}, ${goldValue}, 'Medium', '⏳One-time',
        'General', 'unassigned', true, now(), true, now(),
        'completed', '[]'::jsonb, ${qlId}, ${orderCounter}, '📝', NULL, 0
      )
      RETURNING id
    `;
    console.log(`✅ Inserted "${title}", id:`, task.id, `(+${goldValue} gold)`);

    await sql`
      UPDATE user_progress
      SET gold_total = COALESCE(gold_total, 0) + ${goldValue},
          tasks_completed = COALESCE(tasks_completed, 0) + 1
      WHERE user_id = ${userId}
    `;
  }
}

run().catch(console.error);
