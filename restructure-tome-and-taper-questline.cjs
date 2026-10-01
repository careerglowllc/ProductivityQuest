// Restructures the "Prototype for Tome and Taper" questline hierarchy + renames the meta-trackers quest.
// Usage: node -r dotenv/config restructure-tome-and-taper-questline.cjs

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

  const developHtml   = byTitle('Develop the website HTML');
  const publishSite    = byTitle('Publish actual website');
  const hireProducer   = byTitle('Hire a good all-hands video producer');
  const metaTrackers   = byTitle('Add the meta trackers to my website and my ad');
  const postAd         = byTitle('Post the ad to collect data on user interest');

  if (!developHtml || !publishSite || !hireProducer || !metaTrackers || !postAd) {
    console.error('Could not find all expected tasks:', { developHtml, publishSite, hireProducer, metaTrackers, postAd });
    return;
  }

  // Publish actual website — stays top-level (order 1)
  await sql`UPDATE tasks SET parent_task_id = NULL, indent_level = 0, questline_order = 1 WHERE id = ${publishSite.id}`;

  // Develop the website HTML — now a subtask of Publish actual website (order 2)
  await sql`UPDATE tasks SET parent_task_id = ${publishSite.id}, indent_level = 1, questline_order = 2 WHERE id = ${developHtml.id}`;

  // Add the meta trackers — also a subtask of Publish actual website (order 3), renamed with expanded scope
  await sql`
    UPDATE tasks
    SET parent_task_id = ${publishSite.id}, indent_level = 1, questline_order = 3,
        title = 'Add meta trackers & data analytics (ad conversion, book views, on-site behavior)',
        description = 'Instrument meta trackers and data analytics to measure ad conversion, which books people look at, and what they do on our website.'
    WHERE id = ${metaTrackers.id}
  `;

  // Post the ad to collect data — promoted to top-level (order 4)
  await sql`UPDATE tasks SET parent_task_id = NULL, indent_level = 0, questline_order = 4 WHERE id = ${postAd.id}`;

  // New subtask: Script development and ad making — child of Post the ad, above Hire producer (order 5)
  const duration = 30;
  const goldValue = Math.round(duration * 1.5);
  const [scriptDev] = await sql`
    INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
    VALUES (${userId}, 'Script development and ad making', '', ${duration}, ${goldValue}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'Not Started', ${qlId}, 5, '🎞️', ${postAd.id}, 1)
    RETURNING id
  `;
  console.log('✅ Inserted new subtask: Script development and ad making, id:', scriptDev.id);

  // Hire a good all-hands video producer — now a subtask of Post the ad, below Script development (order 6)
  await sql`UPDATE tasks SET parent_task_id = ${postAd.id}, indent_level = 1, questline_order = 6 WHERE id = ${hireProducer.id}`;

  console.log('✅ Restructured questline hierarchy.');
}

run().catch(console.error);
