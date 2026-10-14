// Adds a "Healthy & Fit Body" north star (a direct spoke off Your Horizon) with two children:
//   Healthy & Fit Body
//     Weightlifting                  <- the "Weightlifting" quest
//     Cardio, Boxing & Sparring      <- the "Cardio/Boxing Drilling/Sparring" quest
// Quests are only filed when they are not already in another questline, and nothing else is moved.
// Usage: node -r dotenv/config add-healthy-fit-body-questline.cjs [--dry]

const EMAIL = 'alexbaer321@gmail.com';
const NORTH_STAR = { title: 'Healthy & Fit Body', icon: '💪', description: 'A strong, healthy, fit body: lifting, cardio and combat training.' };
const CHILDREN = [
  { title: 'Weightlifting', icon: '🏋️', description: 'Lifting sessions and strength progress.', quests: ['Weightlifting'] },
  { title: 'Cardio, Boxing & Sparring', icon: '🥊', description: 'Cardio, boxing, sparring and drilling.', quests: ['Cardio/Boxing Drilling/Sparring'] },
];

async function run(sql, { dry = false, log = console.log } = {}) {
  const user = await sql`SELECT id FROM users WHERE email = ${EMAIL} LIMIT 1`;
  if (!user.length) { log('User not found'); return { error: 'user' }; }
  const userId = user[0].id;
  const summary = { created: [], reparented: [], filed: [], skipped: [] };

  async function ensureQuestline({ title, icon, description }, parentId) {
    const found = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = ${title} LIMIT 1`;
    if (found.length) {
      const id = found[0].id;
      if (!dry) await sql`UPDATE questlines SET parent_questline_id = ${parentId} WHERE id = ${id}`;
      summary.reparented.push(title);
      log(`Already exists: "${title}" (id ${id}), parent set to ${parentId ?? 'Your Horizon'}`);
      return id;
    }
    summary.created.push(title);
    if (dry) { log(`Would create questline "${title}"`); return null; }
    const [row] = await sql`
      INSERT INTO questlines (user_id, title, description, icon, parent_questline_id)
      VALUES (${userId}, ${title}, ${description}, ${icon}, ${parentId})
      RETURNING id
    `;
    log(`✅ Created questline "${title}" (id ${row.id})`);
    return row.id;
  }

  const northStarId = await ensureQuestline(NORTH_STAR, null);
  for (const child of CHILDREN) {
    const childId = await ensureQuestline(child, northStarId);
    let order = 1;
    for (const title of child.quests) {
      const found = await sql`
        SELECT id, questline_id FROM tasks
        WHERE user_id = ${userId} AND btrim(title) = ${title} AND (recycled_reason IS NULL OR recycled_reason = 'completed')
        ORDER BY completed, id LIMIT 1
      `;
      if (!found.length) { summary.skipped.push(`${title} (not found)`); log(`Quest "${title}" not found`); continue; }
      const task = found[0];
      if (task.questline_id != null && task.questline_id !== childId) {
        summary.skipped.push(`${title} (already in questline ${task.questline_id})`);
        log(`"${title}" (#${task.id}) already belongs to questline ${task.questline_id}, leaving it there`);
        continue;
      }
      if (!dry) await sql`UPDATE tasks SET questline_id = ${childId}, questline_order = ${order}, parent_task_id = NULL, indent_level = 0 WHERE id = ${task.id}`;
      summary.filed.push(`${title} -> ${child.title}`);
      log(`${dry ? 'Would file' : '✅ Filed'} "${title}" (#${task.id}) under ${child.title}`);
      order++;
    }
  }
  return summary;
}

module.exports = { run, NORTH_STAR, CHILDREN, EMAIL };

if (require.main === module) {
  const { neon } = require('@neondatabase/serverless');
  run(neon(process.env.DATABASE_URL), { dry: process.argv.includes('--dry') }).catch((err) => { console.error(err); process.exit(1); });
}
