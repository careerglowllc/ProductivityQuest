// Creates the top-level "Self Mastery and Expansion" questline (a direct spoke off Your Horizon):
//   Enforcing good habits  -> 6 consistency habits
//   Eliminating bad habits -> 4 habits to cut
// All start as Not Started. Usage: node -r dotenv/config add-self-mastery.cjs

const { neon } = require('@neondatabase/serverless');

const QUESTLINE = 'Self Mastery and Expansion';
const DURATION = 30;
const GOLD = Math.round(DURATION * 1.5);

const GROUPS = [
  {
    title: 'Enforcing good habits',
    emoji: '💪',
    children: [
      { title: 'Consistent calorie counting', emoji: '🥗' },
      { title: 'Consistent stretching before bed', emoji: '🤸' },
      { title: 'Consistent going to the gym and exercising', emoji: '🏋️' },
      { title: 'Consistent meditation', emoji: '🧘' },
      { title: 'Consistent Wim Hof breathing', emoji: '🌬️' },
      { title: 'Consistent journaling', emoji: '📓' },
    ],
  },
  {
    title: 'Eliminating bad habits',
    emoji: '🚫',
    children: [
      { title: 'Video games', emoji: '🎮' },
      { title: 'Pornography', emoji: '🛑' },
      { title: 'Scrolling on your phone first thing in the morning', emoji: '📱' },
      { title: 'Fast food and eating out', emoji: '🍔' },
    ],
  },
];

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const existing = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = ${QUESTLINE} LIMIT 1`;
  let qlId;
  if (existing.length) {
    qlId = existing[0].id;
    console.log(`Already exists: "${QUESTLINE}" (id ${qlId})`);
  } else {
    const [row] = await sql`
      INSERT INTO questlines (user_id, title, description, icon)
      VALUES (${userId}, ${QUESTLINE}, 'Build the habits that expand you and cut the ones that shrink you.', '🧘')
      RETURNING id
    `;
    qlId = row.id;
    console.log(`✅ Created questline "${QUESTLINE}" (id ${qlId})`);
  }

  async function addTask(title, emoji, parentId, indent, order) {
    const found = await sql`SELECT id FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId} AND title = ${title} LIMIT 1`;
    if (found.length) { console.log(`Already exists: ${title} (id ${found[0].id})`); return found[0].id; }
    const [row] = await sql`
      INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
      VALUES (${userId}, ${title}, '', ${DURATION}, ${GOLD}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'Not Started', ${qlId}, ${order}, ${emoji}, ${parentId}, ${indent})
      RETURNING id
    `;
    console.log(`✅ Added: ${'  '.repeat(indent)}${title} (id ${row.id})`);
    return row.id;
  }

  let order = 1;
  for (const group of GROUPS) {
    const groupId = await addTask(group.title, group.emoji, null, 0, order++);
    for (const child of group.children) {
      await addTask(child.title, child.emoji, groupId, 1, order++);
    }
  }
}

run().catch(console.error);
