import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

// Use HTTP-based connection for better stability in serverless environments
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;

// Create the Neon HTTP client
const sql = neon(connectionString);

// Create the Drizzle instance with HTTP adapter
export const db = drizzle(sql, { schema });

console.log('✅ Database connection configured successfully');