#!/usr/bin/env tsx

/**
 * Run Initial Batch Translation Script
 * 
 * This script triggers a comprehensive translation batch job to populate
 * English translations for all content types in the database.
 * 
 * Usage:
 *   npm run translate:initial
 *   or
 *   tsx scripts/run-initial-translation.ts
 * 
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY: OpenAI API key
 * 
 * The script will:
 *   1. Collect all untranslated content (courses, modules, lessons, quizzes, messages, stories)
 *   2. Create batch translation jobs for each content type
 *   3. Submit jobs to OpenAI Batch API
 *   4. Output job IDs for monitoring
 * 
 * Note: Translation jobs typically complete within 24 hours.
 * Check job status using: POST /api/admin/batch-jobs/check-all-status
 */

import { createComprehensiveTranslationBatchJob } from '../server/batch-api/worker';
import { pool } from '../server/db';

// Default configuration
const DEFAULT_BATCH_SIZE = 50; // Process up to 50 items per content type

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const asAny = error as any;
    if (typeof asAny.message === 'string' && asAny.message.length > 0) return asAny.message;
    if (asAny.error && typeof asAny.error.message === 'string') return asAny.error.message;
  }
  return String(error);
}

async function main() {
  let hadError = false;

  console.log('='.repeat(70));
  console.log('🌐 INITIAL BATCH TRANSLATION - BARBAARINTASAN ACADEMY');
  console.log('='.repeat(70));
  console.log();
  
  // Check for required environment variables
  const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!openaiKey) {
    console.error('❌ ERROR: OpenAI API key not found!');
    console.error('   Please set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY');
    process.exitCode = 1;
    return;
  }
  
  if (!databaseUrl) {
    console.error('❌ ERROR: Database URL not found!');
    console.error('   Please set DATABASE_URL environment variable');
    process.exitCode = 1;
    return;
  }
  
  console.log('✅ Environment variables verified');
  console.log();
  console.log('📋 Translation Configuration:');
  console.log(`   - Batch size: ${DEFAULT_BATCH_SIZE} items per content type`);
  console.log(`   - Target language: English`);
  console.log(`   - Source language: Somali`);
  console.log();
  console.log('🔄 Starting comprehensive translation batch job...');
  console.log();
  
  try {
    // Run the comprehensive translation job
    const jobIds = await createComprehensiveTranslationBatchJob(DEFAULT_BATCH_SIZE);
    
    console.log();
    console.log('='.repeat(70));
    
    if (jobIds.length === 0) {
      console.log('✨ All content is already translated!');
      console.log('   No new translation jobs were needed.');
      console.log();
      console.log('💡 Tip: If you expected translations to be created, check that:');
      console.log('   1. Your database has content in Somali');
      console.log('   2. The translations table is not already populated');
      console.log('   3. Run a coverage report to see translation status');
    } else {
      console.log('✅ SUCCESS! Translation batch jobs created.');
      console.log();
      console.log(`📦 Created ${jobIds.length} batch job(s):`);
      jobIds.forEach((jobId, index) => {
        console.log(`   ${index + 1}. Job ID: ${jobId}`);
      });
      console.log();
      console.log('⏰ Timeline:');
      console.log('   - OpenAI typically processes batch jobs within 24 hours');
      console.log('   - Jobs are checked automatically every hour at :30 minutes');
      console.log('   - Translations are applied automatically when jobs complete');
      console.log();
      console.log('📊 Monitoring:');
      console.log('   - View all jobs: GET /api/admin/batch-jobs');
      console.log('   - Check job status: POST /api/admin/batch-jobs/check-all-status');
      console.log('   - View coverage: GET /api/admin/batch-jobs/translation-coverage');
      console.log('   - Or use the CLI tool: node scripts/translation-manager.js');
      console.log();
      console.log('🎉 Next Steps:');
      console.log('   1. Wait for OpenAI to process the batch jobs (up to 24h)');
      console.log('   2. Monitor job status via API or CLI tool');
      console.log('   3. Once complete, translations will be available via ?lang=en');
      console.log('   4. Test the language switcher in the UI');
    }
    
    console.log('='.repeat(70));
    console.log();

    process.exitCode = 0;
    
  } catch (error) {
    hadError = true;
    console.error();
    console.error('='.repeat(70));
    console.error('❌ ERROR: Failed to create translation batch jobs');
    console.error('='.repeat(70));
    console.error();
    
    if (error instanceof Error) {
      console.error('Error details:');
      console.error(error.message);
      console.error();
      
      if (error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
        console.error();
      }
    } else {
      console.error('Unknown error:', formatUnknownError(error));
      console.error();
    }
    
    console.error('🔍 Troubleshooting:');
    console.error('   1. Verify your OpenAI API key is valid and has batch API access');
    console.error('   2. Check your database connection is working');
    console.error('   3. Ensure you have content in the database to translate');
    console.error('   4. Check server logs for more details');
    console.error();
    
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch {
      // Ignore pool shutdown errors during CLI exit.
    }
    if (!hadError && process.exitCode !== 1) {
      process.exitCode = 0;
    }
  }
}

// Run the script
main();
