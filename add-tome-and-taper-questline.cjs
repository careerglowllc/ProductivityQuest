// Creates the "Prototype for Tome and Taper" questline with subquests for alexbaer321@gmail.com
// Usage: node -r dotenv/config add-tome-and-taper-questline.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const existingQl = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = 'Prototype for Tome and Taper' LIMIT 1`;
  if (existingQl.length) { console.log('Questline already exists, id:', existingQl[0].id); return; }

  const [ql] = await sql`
    INSERT INTO questlines (user_id, title, description, icon)
    VALUES (${userId}, 'Prototype for Tome and Taper', 'Building and launching the Tome and Taper prototype — site, video, ads, and tracking.', '📖')
    RETURNING id
  `;
  console.log('✅ Created questline "Prototype for Tome and Taper", id:', ql.id);

  const duration = 30;
  const goldValue = Math.round(duration * 1.5); // Medium importance, matches server formula

  // Top-level quests
  const [q1] = await sql`
    INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, completed_at, recycled, recycled_at, recycled_reason, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
    VALUES (${userId}, 'Develop the website HTML', '', ${duration}, ${goldValue}, 'Medium', '⏳One-time', 'General', 'unassigned', true, now(), true, now(), 'completed', '[]'::jsonb, 'Done', ${ql.id}, 1, '💻', NULL, 0)
    RETURNING id
  `;
  console.log('✅ Quest 1 (done): Develop the website HTML, id:', q1.id);

  const [q2] = await sql`
    INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
    VALUES (${userId}, 'Publish actual website', '', ${duration}, ${goldValue}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'Not Started', ${ql.id}, 2, '🚀', NULL, 0)
    RETURNING id
  `;
  console.log('✅ Quest 2 (not started): Publish actual website, id:', q2.id);

  const [q3] = await sql`
    INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
    VALUES (${userId}, 'Hire a good all-hands video producer', '', ${duration}, ${goldValue}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'In Progress', ${ql.id}, 3, '🎬', NULL, 0)
    RETURNING id
  `;
  console.log('✅ Quest 3 (in progress): Hire a good all-hands video producer, id:', q3.id);

  const [q4] = await sql`
    INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
    VALUES (${userId}, 'Add the meta trackers to my website and my ad', '', ${duration}, ${goldValue}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'Not Started', ${ql.id}, 4, '📊', NULL, 0)
    RETURNING id
  `;
  console.log('✅ Quest 4 (not started): Add the meta trackers to my website and my ad, id:', q4.id);

  // Subquest nested under Quest 4
  const [q5] = await sql`
    INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
    VALUES (${userId}, 'Post the ad to collect data on user interest', '', ${duration}, ${goldValue}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'Not Started', ${ql.id}, 5, '📣', ${q4.id}, 1)
    RETURNING id
  `;
  console.log('✅ Subquest (not started, under Quest 4): Post the ad to collect data on user interest, id:', q5.id);
}

run().catch(console.error);
