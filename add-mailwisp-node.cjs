// Adds a "MailWisp" grouping node between Financial Independence and MailWisp Advertisement:
//   Financial Independence
//     MailWisp                       (new group node)
//       MailWisp Advertisement       (existing questline, reparented, name unchanged)
//       MailWisp Legal               (new; holds the "MailWisp: Legal Next Steps" quest)
//       MailWisp Quests              (new; every other unfiled MW-labeled quest)
// Only unfiled, non-deleted tasks are adopted, so nothing is pulled out of another questline
// and nothing in the recycle bin resurfaces on the map.
// Usage: node -r dotenv/config add-mailwisp-node.cjs

const { neon } = require('@neondatabase/serverless');

const LEGAL_TASK_TITLE = 'MailWisp: Legal Next Steps';

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  async function questlineId(title) {
    const r = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = ${title} LIMIT 1`;
    return r.length ? r[0].id : null;
  }
  async function ensureQuestline(title, description, icon, parentId) {
    let id = await questlineId(title);
    if (id != null) {
      await sql`UPDATE questlines SET parent_questline_id = ${parentId} WHERE id = ${id}`;
      console.log(`Already exists: "${title}" (id ${id}) — parent set to ${parentId}`);
      return id;
    }
    const [row] = await sql`
      INSERT INTO questlines (user_id, title, description, icon, parent_questline_id)
      VALUES (${userId}, ${title}, ${description}, ${icon}, ${parentId})
      RETURNING id
    `;
    console.log(`✅ Created questline "${title}" (id ${row.id})`);
    return row.id;
  }

  const financialId = await questlineId('Financial Independence');
  const advertisementId = await questlineId('MailWisp Advertisement');
  if (financialId == null || advertisementId == null) {
    console.error('Missing Financial Independence or MailWisp Advertisement questline — aborting');
    return;
  }

  const mailwispId = await ensureQuestline('MailWisp', 'Everything that keeps MailWisp running and growing.', '✉️', financialId);
  await sql`UPDATE questlines SET parent_questline_id = ${mailwispId} WHERE id = ${advertisementId}`;
  console.log(`✅ "MailWisp Advertisement" (id ${advertisementId}) now sits under MailWisp`);

  const legalId = await ensureQuestline('MailWisp Legal', 'Legal and compliance work for MailWisp.', '⚖️', mailwispId);
  const legal = await sql`
    SELECT id, questline_id FROM tasks WHERE user_id = ${userId} AND title = ${LEGAL_TASK_TITLE} LIMIT 1
  `;
  if (!legal.length) {
    console.error(`Quest "${LEGAL_TASK_TITLE}" not found`);
  } else if (legal[0].questline_id != null && legal[0].questline_id !== legalId) {
    console.error(`"${LEGAL_TASK_TITLE}" already belongs to questline ${legal[0].questline_id} — leaving it there`);
  } else {
    await sql`UPDATE tasks SET questline_id = ${legalId}, questline_order = 1, parent_task_id = NULL, indent_level = 0 WHERE id = ${legal[0].id}`;
    console.log(`✅ Filed "${LEGAL_TASK_TITLE}" (#${legal[0].id}) under MailWisp Legal`);
  }

  const catchAllId = await ensureQuestline('MailWisp Quests', 'Every quest labeled MailWisp.', '📬', mailwispId);
  const candidates = await sql`
    SELECT id FROM tasks
    WHERE user_id = ${userId}
      AND business_work_filter = 'MW'
      AND questline_id IS NULL
      AND (recycled_reason IS NULL OR recycled_reason = 'completed')
    ORDER BY completed, id
  `;
  let order = 1;
  for (const task of candidates) {
    await sql`UPDATE tasks SET questline_id = ${catchAllId}, questline_order = ${order++}, parent_task_id = NULL, indent_level = 0 WHERE id = ${task.id}`;
  }
  console.log(`✅ Filed ${candidates.length} MW-labeled quests under MailWisp Quests`);

  const skipped = await sql`
    SELECT COUNT(*)::int AS n FROM tasks
    WHERE user_id = ${userId} AND business_work_filter = 'MW' AND questline_id IS NULL
  `;
  console.log(`(${skipped[0].n} soft-deleted MW quests left in the recycle bin, unfiled)`);
}

run().catch(console.error);
