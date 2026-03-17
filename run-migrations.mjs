import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('[Migrations] Starting database migrations...');
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log('[Migrations] Found:', files);
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`[Migrations] Executing: ${file}`);
      try {
        await pool.query(sql);
        console.log(`[Migrations] ✓ Completed: ${file}`);
      } catch (err) {
        console.error(`[Migrations] ✗ Failed: ${file}`, err.message);
        throw err;
      }
    }
    
    console.log('[Migrations] All migrations completed successfully');
  } finally {
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('[Migrations] Fatal error:', err);
  process.exit(1);
});
