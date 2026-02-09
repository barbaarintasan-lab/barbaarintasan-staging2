import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

// Handle pool errors gracefully to prevent app crashes
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

// Pre-warm the database connection pool on startup
async function warmupPool() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB Pool] Connection warmed up successfully');
  } catch (err) {
    console.error('[DB Pool] Warmup failed:', err);
  }
}
warmupPool();

// Keep connection alive with periodic pings (every 30 seconds)
setInterval(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch (err) {
    // Silent fail - pool will recover
  }
}, 30000);

export const db = drizzle({ client: pool, schema });
