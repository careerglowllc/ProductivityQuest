// Restructures "Prototype for Tome and Taper": adds a "Website Readiness" parent quest and a
// "Making the ad" parent quest, reparenting existing tasks beneath them.
// Usage: node -r dotenv/config restructure-tome-and-taper-v2.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const ql = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = 'Prototype for Tome and Taper' LIMIT 1`;
  if (!ql.length) { console.error('Questline not found'); return; }
  const qlId = ql[0].id;

  const tasks = await sql`SELECT id, title FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId}`;
  const byTitle = (t) => tasks.find((x) => x.title === t);

  const developHtml    = byTitle('Develop the website HTML');
  const publishSite    = byTitle('Publish actual website');
  const hireProducer   = byTitle('Hire a good all-hands video producer');
  const metaTrackers   = byTitle('Add meta trackers & data analytics (ad conversion, book views, on-site behavior)');
  const postAd         = byTitle('Post the ad to collect data on user interest');
  const scriptDev       = byTitle('Script development and ad making');

  if (!developHtml || !publishSite || !hireProducer || !metaTrackers || !postAd || !scriptDev) {
    console.error('Could not find all expected tasks:', { developHtml, publishSite, hireProducer, metaTrackers, postAd, scriptDev });
    return;
  }

  const duration = 30;
  const goldValue = Math.round(duration * 1.5);

  // New top-level quest: Website Readiness (order 1)
  const [websiteReadiness] = await sql`
    INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
    VALUES (${userId}, 'Website Readiness', '', ${duration}, ${goldValue}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'Not Started', ${qlId}, 1, '🌐', NULL, 0)
    RETURNING id
  `;
  console.log('✅ Inserted main task: Website Readiness, id:', websiteReadiness.id);

  // Publish actual website -> child of Website Readiness (order 2)
  await sql`UPDATE tasks SET parent_task_id = ${websiteReadiness.id}, indent_level = 1, questline_order = 2 WHERE id = ${publishSite.id}`;

  // Develop the website HTML -> stays child of Publish actual website, bump indent (order 3)
  await sql`UPDATE tasks SET parent_task_id = ${publishSite.id}, indent_level = 2, questline_order = 3 WHERE id = ${developHtml.id}`;

  // Add meta trackers... -> now a sibling of Publish actual website, child of Website Readiness (order 4)
  await sql`UPDATE tasks SET parent_task_id = ${websiteReadiness.id}, indent_level = 1, questline_order = 4 WHERE id = ${metaTrackers.id}`;

  // Post the ad to collect data -> stays top-level (order 5)
  await sql`UPDATE tasks SET parent_task_id = NULL, indent_level = 0, questline_order = 5 WHERE id = ${postAd.id}`;

  // New subtask: Making the ad -> child of Post the ad (order 6)
  const [makingAd] = await sql`
    INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
    VALUES (${userId}, 'Making the ad', '', ${duration}, ${goldValue}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'Not Started', ${qlId}, 6, '🎬', ${postAd.id}, 1)
    RETURNING id
  `;
  console.log('✅ Inserted subtask: Making the ad, id:', makingAd.id);

  // Hire a good all-hands video producer -> now child of Making the ad (order 7)
  await sql`UPDATE tasks SET parent_task_id = ${makingAd.id}, indent_level = 2, questline_order = 7 WHERE id = ${hireProducer.id}`;

  // Script development and ad making -> now child of Making the ad (order 8)
  await sql`UPDATE tasks SET parent_task_id = ${makingAd.id}, indent_level = 2, questline_order = 8 WHERE id = ${scriptDev.id}`;

  console.log('✅ Restructured questline hierarchy (v2).');
}

run().catch(console.error);
