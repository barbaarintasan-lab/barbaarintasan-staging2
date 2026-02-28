/**
 * Translation Coverage Report Generator
 * Generates detailed reports on translation status across all content types
 */

import { db } from '../db';
import { 
  courses, 
  modules, 
  lessons, 
  quizQuestions, 
  parentMessages, 
  bedtimeStories,
  translations,
  batchJobs
} from '@shared/schema';
import { sql, eq, and } from 'drizzle-orm';

export interface TranslationCoverageReport {
  summary: {
    totalItems: number;
    translatedItems: number;
    coveragePercentage: number;
    lastUpdated: string;
  };
  byContentType: {
    courses: ContentTypeCoverage;
    modules: ContentTypeCoverage;
    lessons: ContentTypeCoverage;
    quizQuestions: ContentTypeCoverage;
    parentMessages: ContentTypeCoverage;
    bedtimeStories: ContentTypeCoverage;
  };
  recentJobs: JobSummary[];
  failedTranslations: FailedTranslation[];
}

interface ContentTypeCoverage {
  total: number;
  translated: number;
  pending: number;
  coveragePercentage: number;
  fields: {
    [fieldName: string]: {
      total: number;
      translated: number;
    };
  };
}

interface JobSummary {
  id: string;
  type: string;
  status: string;
  description: string;
  requestCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

interface FailedTranslation {
  entityType: string;
  entityId: string;
  fieldName: string;
  error: string;
  attemptedAt: string;
}

/**
 * Get translation coverage for a specific entity type
 */
async function getEntityTypeCoverage(
  entityTable: any,
  entityType: string,
  fields: string[]
): Promise<ContentTypeCoverage> {
  // Get total count
  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(entityTable);

  const total = Number(totalCount);

  // Get translation counts per field
  const fieldCoverage: { [key: string]: { total: number; translated: number } } = {};
  
  for (const fieldName of fields) {
    // Count entities with this field populated
    const [{ count: fieldTotal }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(entityTable)
      .where(sql`${entityTable[fieldName]} IS NOT NULL AND ${entityTable[fieldName]} != ''`);

    // Count translations for this field
    const [{ count: translatedCount }] = await db
      .select({ count: sql<number>`count(DISTINCT ${translations.entityId})` })
      .from(translations)
      .where(
        and(
          eq(translations.entityType, entityType),
          eq(translations.fieldName, fieldName),
          eq(translations.targetLanguage, 'english')
        )
      );

    fieldCoverage[fieldName] = {
      total: Number(fieldTotal),
      translated: Number(translatedCount)
    };
  }

  // Calculate overall translated count (entities with at least one field translated)
  const [{ count: translatedEntities }] = await db
    .select({ count: sql<number>`count(DISTINCT ${translations.entityId})` })
    .from(translations)
    .where(
      and(
        eq(translations.entityType, entityType),
        eq(translations.targetLanguage, 'english')
      )
    );

  const translated = Number(translatedEntities);
  const pending = total - translated;
  const coveragePercentage = total > 0 ? Math.round((translated / total) * 100) : 0;

  return {
    total,
    translated,
    pending,
    coveragePercentage,
    fields: fieldCoverage
  };
}

/**
 * Get recent batch job summaries
 */
async function getRecentJobSummaries(limit: number = 10): Promise<JobSummary[]> {
  const jobs = await db
    .select()
    .from(batchJobs)
    .orderBy(sql`${batchJobs.createdAt} DESC`)
    .limit(limit);

  return jobs.map(job => ({
    id: job.id,
    type: job.type,
    status: job.status,
    description: (job.metadata ? (JSON.parse(job.metadata) as any)?.description : null) || '',
    requestCount: job.totalRequests,
    completedCount: job.completedRequests || 0,
    failedCount: job.failedRequests || 0,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString()
  }));
}

/**
 * Get failed translation attempts (from batch job metadata)
 */
async function getFailedTranslations(limit: number = 20): Promise<FailedTranslation[]> {
  const failedJobs = await db
    .select()
    .from(batchJobs)
    .where(eq(batchJobs.status, 'failed'))
    .orderBy(sql`${batchJobs.createdAt} DESC`)
    .limit(limit);

  const failures: FailedTranslation[] = [];

  for (const job of failedJobs) {
    if (job.error) {
      const metadata = job.metadata ? (JSON.parse(job.metadata) as any) : null;
      failures.push({
        entityType: metadata?.entityType || 'unknown',
        entityId: job.id,
        fieldName: 'multiple',
        error: job.error,
        attemptedAt: job.createdAt.toISOString()
      });
    }
  }

  return failures;
}

/**
 * Generate comprehensive translation coverage report
 */
export async function generateTranslationCoverageReport(): Promise<TranslationCoverageReport> {
  console.log('[Translation Report] Generating coverage report...');

  // Get coverage for each content type
  const [
    coursesCoverage,
    modulesCoverage,
    lessonsCoverage,
    quizCoverage,
    messagesCoverage,
    storiesCoverage,
    recentJobs,
    failedTranslations
  ] = await Promise.all([
    getEntityTypeCoverage(courses, 'course', ['title', 'description', 'comingSoonMessage']),
    getEntityTypeCoverage(modules, 'module', ['title']),
    getEntityTypeCoverage(lessons, 'lesson', ['title', 'description', 'textContent']),
    getEntityTypeCoverage(quizQuestions, 'quiz_question', ['question', 'options', 'explanation']),
    getEntityTypeCoverage(parentMessages, 'parent_message', ['title', 'content', 'keyPoints']),
    getEntityTypeCoverage(bedtimeStories, 'bedtime_story', ['title', 'content', 'moralLesson']),
    getRecentJobSummaries(10),
    getFailedTranslations(20)
  ]);

  // Calculate overall totals
  const totalItems = 
    coursesCoverage.total +
    modulesCoverage.total +
    lessonsCoverage.total +
    quizCoverage.total +
    messagesCoverage.total +
    storiesCoverage.total;

  const translatedItems =
    coursesCoverage.translated +
    modulesCoverage.translated +
    lessonsCoverage.translated +
    quizCoverage.translated +
    messagesCoverage.translated +
    storiesCoverage.translated;

  const coveragePercentage = totalItems > 0 ? Math.round((translatedItems / totalItems) * 100) : 0;

  const report: TranslationCoverageReport = {
    summary: {
      totalItems,
      translatedItems,
      coveragePercentage,
      lastUpdated: new Date().toISOString()
    },
    byContentType: {
      courses: coursesCoverage,
      modules: modulesCoverage,
      lessons: lessonsCoverage,
      quizQuestions: quizCoverage,
      parentMessages: messagesCoverage,
      bedtimeStories: storiesCoverage
    },
    recentJobs,
    failedTranslations
  };

  console.log('[Translation Report] Report generated successfully');
  console.log(`[Translation Report] Overall coverage: ${coveragePercentage}% (${translatedItems}/${totalItems})`);

  return report;
}

/**
 * Format report as human-readable text (Somali/English)
 */
export function formatReportAsText(report: TranslationCoverageReport, language: 'somali' | 'english' = 'english'): string {
  const lines: string[] = [];

  if (language === 'somali') {
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('      WARBIXINTA TARJUMAADDA - TRANSLATION COVERAGE REPORT');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`📊 GUUD AHAAN / SUMMARY:`);
    lines.push(`   • Wadarta Shaybaarka: ${report.summary.totalItems}`);
    lines.push(`   • Waxaa la tarjumay: ${report.summary.translatedItems}`);
    lines.push(`   • Habeynta: ${report.summary.coveragePercentage}%`);
    lines.push(`   • Cusboonaysiin: ${new Date(report.summary.lastUpdated).toLocaleString()}`);
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('📚 FASALADA / BY CONTENT TYPE:');
    lines.push('───────────────────────────────────────────────────────────');
  } else {
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('           TRANSLATION COVERAGE REPORT');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`📊 OVERALL SUMMARY:`);
    lines.push(`   • Total Items: ${report.summary.totalItems}`);
    lines.push(`   • Translated: ${report.summary.translatedItems}`);
    lines.push(`   • Coverage: ${report.summary.coveragePercentage}%`);
    lines.push(`   • Last Updated: ${new Date(report.summary.lastUpdated).toLocaleString()}`);
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('📚 BY CONTENT TYPE:');
    lines.push('───────────────────────────────────────────────────────────');
  }

  const contentTypes = [
    { key: 'courses', label: language === 'somali' ? 'Koorsaska / Courses' : 'Courses' },
    { key: 'modules', label: language === 'somali' ? 'Qaybaha / Modules' : 'Modules' },
    { key: 'lessons', label: language === 'somali' ? 'Casharada / Lessons' : 'Lessons' },
    { key: 'quizQuestions', label: language === 'somali' ? 'Su\'aalaha Imtixaanka / Quiz Questions' : 'Quiz Questions' },
    { key: 'parentMessages', label: language === 'somali' ? 'Fariimaha Waalidka / Parent Messages' : 'Parent Messages' },
    { key: 'bedtimeStories', label: language === 'somali' ? 'Sheekooyin / Bedtime Stories' : 'Bedtime Stories' }
  ];

  for (const { key, label } of contentTypes) {
    const coverage = report.byContentType[key as keyof typeof report.byContentType];
    lines.push('');
    lines.push(`${label}:`);
    lines.push(`   • Total: ${coverage.total}`);
    lines.push(`   • Translated: ${coverage.translated} (${coverage.coveragePercentage}%)`);
    lines.push(`   • Pending: ${coverage.pending}`);
    
    if (Object.keys(coverage.fields).length > 0) {
      lines.push(`   • Fields:`);
      for (const [fieldName, fieldData] of Object.entries(coverage.fields)) {
        const fieldPercent = fieldData.total > 0 ? Math.round((fieldData.translated / fieldData.total) * 100) : 0;
        lines.push(`      - ${fieldName}: ${fieldData.translated}/${fieldData.total} (${fieldPercent}%)`);
      }
    }
  }

  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push(language === 'somali' ? '🔄 HOWLAHA U DAMBEEYAY / RECENT JOBS:' : '🔄 RECENT JOBS:');
  lines.push('───────────────────────────────────────────────────────────');

  if (report.recentJobs.length > 0) {
    for (const job of report.recentJobs) {
      lines.push('');
      lines.push(`Job ID: ${job.id}`);
      lines.push(`   • Status: ${job.status}`);
      lines.push(`   • Description: ${job.description}`);
      lines.push(`   • Progress: ${job.completedCount}/${job.requestCount} completed`);
      if (job.failedCount > 0) {
        lines.push(`   • Failed: ${job.failedCount}`);
      }
      lines.push(`   • Created: ${new Date(job.createdAt).toLocaleString()}`);
    }
  } else {
    lines.push(language === 'somali' ? 'Howl ma jirto / No recent jobs' : 'No recent jobs');
  }

  if (report.failedTranslations.length > 0) {
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(language === 'somali' ? '❌ KHALADAADKA / FAILED TRANSLATIONS:' : '❌ FAILED TRANSLATIONS:');
    lines.push('───────────────────────────────────────────────────────────');
    
    for (const failure of report.failedTranslations) {
      lines.push('');
      lines.push(`Entity: ${failure.entityType} (${failure.entityId})`);
      lines.push(`   • Error: ${failure.error}`);
      lines.push(`   • Attempted: ${new Date(failure.attemptedAt).toLocaleString()}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}
