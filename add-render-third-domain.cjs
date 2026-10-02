// Adds Render's third custom domain add-on $0.25/mo to financial_items for alexbaer321@gmail.com
// (custom domains linked: productivityquest, tomeandtaper, mailwisp)
// Usage: node -r dotenv/config add-render-third-domain.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const exists = await sql`SELECT id FROM financial_items WHERE user_id = ${userId} AND item = 'Render Third Custom Domain Add-on' LIMIT 1`;
  if (exists.length) {
    console.log('Already exists, id:', exists[0].id);
    return;
  }

  const r = await sql`
    INSERT INTO financial_items (user_id, item, category, tags, monthly_cost, recur_type, notes)
    VALUES (${userId}, 'Render Third Custom Domain Add-on', 'Business', ${JSON.stringify(['Business'])}, 25, 'Monthly', 'Third custom domain on Render (productivityquest, tomeandtaper, mailwisp each have one)')
    RETURNING id
  `;
  console.log('✅ Inserted Render Third Custom Domain Add-on $0.25/mo, id:', r[0].id);
}

run().catch(console.error);
