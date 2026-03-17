#!/usr/bin/env tsx

/**
 * Check Translation Status Script
 * 
 * This script checks the current translation status by querying the database directly.
 * No API server or admin authentication required.
 * 
 * Usage:
 *   tsx scripts/check-translation-status.ts
 * 
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string
 */

import { db } from '../server/db';
import { translations, batchJobs } from '../shared/schema';
import { sql, eq, and, desc } from 'drizzle-orm';

async function main() {
  console.log('='.repeat(70));
  console.log('📊 TRANSLATION STATUS CHECK - BARBAARINTASAN ACADEMY');
  console.log('='.repeat(70));
  console.log();
  
  // Check for required environment variables
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: Database URL not found!');
    console.error('   Please set DATABASE_URL environment variable');
    process.exit(1);
  }
  
  console.log('✅ Database connection verified');
  console.log();
  
  try {
    // Get translation counts by entity type
    console.log('📈 Translation Coverage:');
    console.log('-'.repeat(70));
    
    const entityTypes = [
      'course',
      'module', 
      'lesson',
      'quiz_question',
      'parent_message',
      'bedtime_story'
    ];
    
    let totalTranslations = 0;
    
    for (const entityType of entityTypes) {
      const result = await db.select({
        count: sql<number>`count(distinct ${translations.entityId})`
      })
      .from(translations)
      .where(
        and(
          eq(translations.entityType, entityType),
          eq(translations.targetLanguage, 'english')
        )
      );
      
      const count = result[0]?.count || 0;
      totalTranslations += count;
      
      const displayName = entityType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') + 's';
      
      console.log(`  ${displayName.padEnd(20)}: ${count} items translated`);
    }
    
    console.log('-'.repeat(70));
    console.log(`  ${'Total'.padEnd(20)}: ${totalTranslations} items translated`);
    console.log();
    
    // Get recent batch jobs
    console.log('📦 Recent Batch Jobs:');
    console.log('-'.repeat(70));
    
    const recentJobs = await db.select({
      id: batchJobs.id,
      jobType: batchJobs.jobType,
      status: batchJobs.status,
      totalItems: batchJobs.totalItems,
      description: batchJobs.description,
      createdAt: batchJobs.createdAt,
      completedAt: batchJobs.completedAt
    })
    .from(batchJobs)
    .where(eq(batchJobs.jobType, 'translation'))
    .orderBy(desc(batchJobs.createdAt))
    .limit(5);
    
    if (recentJobs.length === 0) {
      console.log('  No translation batch jobs found');
    } else {
      recentJobs.forEach((job, index) => {
        console.log(`  ${index + 1}. Job: ${job.id.substring(0, 20)}...`);
        console.log(`     Status: ${job.status}`);
        console.log(`     Description: ${job.description}`);
        console.log(`     Created: ${job.createdAt.toISOString()}`);
        if (job.completedAt) {
          console.log(`     Completed: ${job.completedAt.toISOString()}`);
        }
        console.log();
      });
    }
    
    console.log('='.repeat(70));
    
    if (totalTranslations === 0) {
      console.log('⚠️  No translations found!');
      console.log();
      console.log('To create translations:');
      console.log('  1. Set OPENAI_API_KEY environment variable');
      console.log('  2. Run: npm run translate:initial');
      console.log('  3. Wait 24 hours for OpenAI to process');
      console.log('  4. Run this script again to check status');
    } else {
      console.log('✅ Translations are available!');
      console.log();
      console.log('To test translations:');
      console.log('  1. Start the server: npm run dev');
      console.log('  2. Access any content with ?lang=en');
      console.log('  3. Use the language switcher in the UI');
    }
    
    console.log('='.repeat(70));
    console.log();
    
  } catch (error) {
    console.error();
    console.error('='.repeat(70));
    console.error('❌ ERROR: Failed to check translation status');
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
      console.error('Unknown error:', error);
      console.error();
    }
    
    process.exit(1);
  }
}

// Run the script
main();
