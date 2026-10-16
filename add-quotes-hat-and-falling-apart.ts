// Adds two quotes to the quotes list of alexbaer321@gmail.com (the list that is saved under "journal-quotes-v1").
// Until a list has been saved the app shows the starter quotes, so those are kept and the new ones go first.
// Usage: TSX_TSCONFIG_PATH=tsconfig.test.json node -r dotenv/config --import tsx add-quotes-hat-and-falling-apart.ts
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { QUOTES_KEY, SEED_QUOTES, type Quote } from "./client/src/lib/quotes";

export const NEW_QUOTES: Quote[] = [
  {
    id: "quote-hat-of-problems",
    text: "Everyone carries problems. Imagine the whole world wrote theirs on slips of paper and shook them together in a hat. Would you reach in and trade yours for another?",
    author: "",
    createdAt: "2026-10-15T00:00:00.000Z",
  },
  {
    id: "quote-everything-falling-apart",
    text: "Everything is falling apart. Your new life will cost you your old one.",
    author: "",
    createdAt: "2026-10-15T00:00:00.001Z",
  },
];

// The new quotes first, then the list as it is (or the starter quotes when none was saved). Quotes already there are not added twice.
export function mergeQuotes(existing: Quote[] | null, additions: Quote[] = NEW_QUOTES): Quote[] {
  const base = existing ?? SEED_QUOTES;
  const have = new Set(base.map((q) => q.id));
  return [...additions.filter((q) => !have.has(q.id)), ...base];
}

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error("User not found"); return; }
  const userId = user[0].id as string;

  const rows = await sql`SELECT value FROM user_kv WHERE user_id = ${userId} AND key = ${QUOTES_KEY} LIMIT 1`;
  const existing = rows.length ? (JSON.parse(rows[0].value as string) as Quote[]) : null;
  const next = mergeQuotes(existing);
  if (next.length === (existing ?? SEED_QUOTES).length) { console.log("Both quotes are already in the list."); return; }

  await sql`
    INSERT INTO user_kv (user_id, key, value, updated_at)
    VALUES (${userId}, ${QUOTES_KEY}, ${JSON.stringify(next)}, now())
    ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  console.log(`✅ Quotes list saved: ${next.length} quotes (${existing ? "added to your saved list" : "starter quotes kept"}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run().catch(console.error);
