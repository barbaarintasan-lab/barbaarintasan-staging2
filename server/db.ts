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

// Validate DATABASE_URL format to prevent cryptic "helium" DNS errors
function validateDatabaseUrl(url: string): void {
  try {
    // Check for basic postgres:// or postgresql:// protocol
    if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
      throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
    }
    
    // Parse the URL to validate it has required components
    const urlObj = new URL(url);
    
    if (!urlObj.hostname || urlObj.hostname.trim() === '') {
      throw new Error('DATABASE_URL must contain a valid hostname');
    }
    
    if (!urlObj.pathname || urlObj.pathname === '/') {
      throw new Error('DATABASE_URL must contain a database name in the path');
    }
    
    // Only log in development to avoid exposing infrastructure info
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

// Helper to detect and report "helium" hostname errors
function checkForHeliumError(err: unknown, context: string): boolean {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    if (err.message.includes('helium')) {
      console.error(`[DB ${context}] CRITICAL: Attempting to connect to hostname "helium" - your DATABASE_URL is malformed!`);
      console.error(`[DB ${context}] Please verify your DATABASE_URL environment variable is a valid PostgreSQL connection string.`);
      return true;
    }
  }
  return false;
}

validateDatabaseUrl(process.env.DATABASE_URL);

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

// Handle pool errors gracefully to prevent app crashes
pool.on('error', (err) => {
  checkForHeliumError(err, 'Pool');
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

// Pre-warm the database connection pool on startup
async function warmupPool() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB Pool] Connection warmed up successfully');
  } catch (err: unknown) {
    const isHeliumError = checkForHeliumError(err, 'Warmup');
    if (isHeliumError) {
      console.error('[DB Pool] WARNING: Database connection failed - DATABASE_URL is malformed (defaulting to "helium" hostname)');
      console.error('[DB Pool] Application will start but database operations will fail');
    } else {
      console.error('[DB Pool] WARNING: Warmup failed:', err);
      console.error('[DB Pool] Application will start but database may be unavailable');
    }
  }
}

// Start warmup in background - don't block server startup
// Errors are already logged inside warmupPool(), so we just need to consume the promise
warmupPool().catch(() => {});

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
