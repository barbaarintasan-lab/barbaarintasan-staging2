import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function validateDatabaseUrl(url: string): void {
  try {
    if (/[<>]/.test(url)) {
      throw new Error('DATABASE_URL contains angle bracket placeholders (<...>). Use real values without < or >.');
    }

    if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
      throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
    }
    
    const urlObj = new URL(url);

    const username = decodeURIComponent(urlObj.username || '').toLowerCase();
    const password = decodeURIComponent(urlObj.password || '').toLowerCase();
    const hostname = (urlObj.hostname || '').toLowerCase();
    const dbName = (urlObj.pathname || '').replace(/^\//, '').toLowerCase();
    
    if (!urlObj.hostname || urlObj.hostname.trim() === '') {
      throw new Error('DATABASE_URL must contain a valid hostname');
    }
    
    if (!urlObj.pathname || urlObj.pathname === '/') {
      throw new Error('DATABASE_URL must contain a database name in the path');
    }

    // Guard against example placeholders accidentally used as real credentials.
    if (
      hostname === 'host' ||
      username === 'user' ||
      password === 'password' ||
      dbName === 'db'
    ) {
      throw new Error(
        'DATABASE_URL appears to use placeholder values (USER/PASSWORD/HOST/DB). Replace with your real Neon/Postgres connection string.',
      );
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
    console.error('[DB Pool] Warmup failed (non-fatal):', err);
  }
}
warmupPool();

const keepAliveInterval = setInterval(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch (err) {
  }
}, 300000);

keepAliveInterval.unref();

export const db = drizzle(pool, { schema });
