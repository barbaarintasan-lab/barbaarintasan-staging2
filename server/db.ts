import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
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

validateDatabaseUrl(process.env.DATABASE_URL);

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: isProduction ? 10 : 5,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
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
    throw err;
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
