import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for serverless environment
neonConfig.webSocketConstructor = ws;

// Set fetch function for better compatibility
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Limit connection pool size for serverless
  idleTimeoutMillis: 0, // Disable idle timeout
  connectionTimeoutMillis: 10000, // 10 second timeout
});

export const db = drizzle({ client: pool, schema });