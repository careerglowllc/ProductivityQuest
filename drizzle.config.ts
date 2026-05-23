import { defineConfig } from "drizzle-kit";

// DATABASE_PUSH_URL = dedicated Postgres/TCP URL for drizzle-kit migrations
// DATABASE_URL      = used by the app server (may be Neon HTTP URL)
// Prefer DATABASE_PUSH_URL when running migrations so drizzle-kit always
// gets a standard postgres:// connection regardless of server adapter.
const pushUrl = process.env.DATABASE_PUSH_URL || process.env.DATABASE_URL;

if (!pushUrl) {
  throw new Error(
    "DATABASE_PUSH_URL or DATABASE_URL must be set. " +
    "Set DATABASE_PUSH_URL to a postgres:// TCP connection string for migrations."
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: pushUrl,
  },
});
