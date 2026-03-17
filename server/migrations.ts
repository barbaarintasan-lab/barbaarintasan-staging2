import { pool } from './db';
import fs from 'fs';
import path from 'path';

export async function runMigrations() {
  const migrationDir = path.resolve(process.cwd(), 'migrations');
  
  if (!fs.existsSync(migrationDir)) {
    console.log('[MIGRATIONS] No migrations directory found, skipping');
    return;
  }

  const files = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[MIGRATIONS] No migration files found');
    return;
  }

  const client = await pool.connect();
  
  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log(`[MIGRATIONS] Found ${files.length} migration files`);

    for (const file of files) {
      const name = file.replace('.sql', '');
      
      // Check if migration already executed
      const result = await client.query(
        'SELECT * FROM _migrations WHERE name = $1',
        [name]
      );

      if (result.rows.length > 0) {
        console.log(`[MIGRATIONS] ✓ ${file} (already executed)`);
        continue;
      }

      try {
        const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
        
        // Execute migration
        await client.query(sql);
        
        // Record that migration was executed
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [name]
        );
        
        console.log(`[MIGRATIONS] ✓ ${file} (executed)`);
      } catch (err: any) {
        console.error(`[MIGRATIONS] ✗ ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log('[MIGRATIONS] All migrations completed successfully');
  } finally {
    client.release();
  }
}
