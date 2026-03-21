import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function normalizeDatabaseUrl(url: string): string {
  const parsed = new URL(url);
  const sslmode = (parsed.searchParams.get('sslmode') || '').toLowerCase();

  // Future-proof against clients that deprecate prefer/require behavior.
  if (!sslmode || sslmode === 'prefer' || sslmode === 'require') {
    parsed.searchParams.set('sslmode', 'verify-full');
  }

  return parsed.toString();
}

function validateDatabaseUrl(url: string): void {
  try {
    if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
      throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
    }
    
    const urlObj = new URL(url);
    
    if (!urlObj.hostname || urlObj.hostname.trim() === '') {
      throw new Error('DATABASE_URL must contain a valid hostname');
    }
    
    if (!urlObj.pathname || urlObj.pathname === '/') {
      throw new Error('DATABASE_URL must contain a database name in the path');
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DB] Using database host: ${urlObj.hostname}`);
    }
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`DATABASE_URL is not a valid URL: ${err.message}`);
    }
    throw err;
  }
}

const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
validateDatabaseUrl(normalizedDatabaseUrl);

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({ 
  connectionString: normalizedDatabaseUrl,
  // Keep production pool conservative across multiple Fly machines.
  max: isProduction ? 6 : 5,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  query_timeout: 30000,
  statement_timeout: 30000,
  application_name: "barbaarintasan-api",
});

pool.on('connect', (client) => {
  client.query('SET search_path TO public');
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

async function warmupPool() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB Pool] Connection warmed up successfully');
  } catch (err: unknown) {
    console.error('[DB Pool] Warmup failed:', err);
    // Do not crash boot on transient DB network issues.
  }
}
warmupPool();

setInterval(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch (err) {
  }
}, 300000);

export const db = drizzle(pool, { schema });
