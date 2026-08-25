// Adds a $824 family contribution and a "Dr. Alfie" calendar appointment for alexbaer321@gmail.com
// Usage: node -r dotenv/config add-parent-contribution-and-dr-alfie.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const contribExists = await sql`
    SELECT id FROM family_contributions
    WHERE user_id = ${userId} AND amount = 82400 AND date_given::date = '2026-08-24'
    LIMIT 1
  `;
  if (contribExists.length) {
    console.log('Family contribution already exists, id:', contribExists[0].id);
  } else {
    const c = await sql`
      INSERT INTO family_contributions (user_id, amount, description, date_given)
      VALUES (${userId}, 82400, 'Parent contribution', '2026-08-24')
      RETURNING id
    `;
    console.log('✅ Inserted $824 parent contribution, id:', c[0].id);
  }

  const eventExists = await sql`
    SELECT id FROM calendar_events
    WHERE user_id = ${userId} AND title = 'Dr. Alfie Appointment' AND date::date = '2026-08-24'
    LIMIT 1
  `;
  if (eventExists.length) {
    console.log('Dr. Alfie appointment already exists, id:', eventExists[0].id);
  } else {
    const e = await sql`
      INSERT INTO calendar_events (user_id, title, date, start_time, duration, color)
      VALUES (${userId}, 'Dr. Alfie Appointment', '2026-08-24T09:00:00-07:00', '2026-08-24T09:00:00-07:00', 60, '#ec4899')
      RETURNING id
    `;
    console.log('✅ Inserted Dr. Alfie appointment on 2026-08-24, id:', e[0].id);
  }
}

run().catch(console.error);
