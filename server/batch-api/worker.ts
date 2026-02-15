/**
 * Background worker for collecting and processing lessons via OpenAI Batch API
 */

import { db } from '../db';
import { 
  lessons, 
  quizQuestions, 
  batchJobs, 
  translations,
  courses,
  modules,
  parentMessages,
  bedtimeStories 
} from '@shared/schema';
import { isNull, eq, and, sql, notInArray, notExists } from 'drizzle-orm';
import {
  createTranslationBatchInput,
  createSummaryBatchInput,
  createQuizImprovementBatchInput,
  createBatchJob,
  checkBatchJobStatus,
  processBatchJobResults
} from './service';
import type { TranslationRequest, SummaryRequest, QuizImprovementRequest } from './types';

// Configuration constants
const MAX_CONCURRENT_BATCH_JOBS = 3;
const DEFAULT_BATCH_SIZE = 20;

/**
 * Collect courses that need translation
 * Returns courses that don't have English translations yet
 */
export async function collectCoursesForTranslation(limit: number = DEFAULT_BATCH_SIZE): Promise<TranslationRequest[]> {
  // Get courses that have content and no English translation
  const coursesToTranslate = await db.select({
    id: courses.id,
    title: courses.title,
    description: courses.description,
    comingSoonMessage: courses.comingSoonMessage
  })
  .from(courses)
  .where(
    and(
      sql`(${courses.title} IS NOT NULL OR ${courses.description} IS NOT NULL OR ${courses.comingSoonMessage} IS NOT NULL)`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${translations} 
        WHERE ${translations.entityType} = 'course' 
        AND ${translations.entityId} = ${courses.id}
        AND ${translations.targetLanguage} = 'english'
        AND ${translations.fieldName} IN ('title', 'description', 'comingSoonMessage')
      )`
    )
  )
  .limit(limit);

  return coursesToTranslate.map(course => ({
    lessonId: course.id, // Reusing lessonId field name for compatibility
    sourceLanguage: 'somali' as const,
    targetLanguages: ['english'] as ['english'],
    fields: {
      title: course.title || undefined,
      description: course.description || undefined,
      comingSoonMessage: course.comingSoonMessage || undefined
    }
  }));
}

/**
 * Collect modules that need translation
 * Returns modules that don't have English translations yet
 */
export async function collectModulesForTranslation(limit: number = DEFAULT_BATCH_SIZE): Promise<TranslationRequest[]> {
  // Get modules that have content and no English translation
  const modulesToTranslate = await db.select({
    id: modules.id,
    title: modules.title
  })
  .from(modules)
  .where(
    and(
      sql`${modules.title} IS NOT NULL`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${translations} 
        WHERE ${translations.entityType} = 'module' 
        AND ${translations.entityId} = ${modules.id}
        AND ${translations.targetLanguage} = 'english'
        AND ${translations.fieldName} = 'title'
      )`
    )
  )
  .limit(limit);

  return modulesToTranslate.map(module => ({
    lessonId: module.id,
    sourceLanguage: 'somali' as const,
    targetLanguages: ['english'] as ['english'],
    fields: {
      title: module.title || undefined
    }
  }));
}

/**
 * Collect lessons that need translation
 * Returns lessons that don't have English translations yet
 */
export async function collectLessonsForTranslation(limit: number = DEFAULT_BATCH_SIZE): Promise<TranslationRequest[]> {
  // Get lessons that have content and no English translation
  const lessonsToTranslate = await db.select({
    id: lessons.id,
    title: lessons.title,
    description: lessons.description,
    textContent: lessons.textContent
  })
  .from(lessons)
  .where(
    and(
      sql`(${lessons.title} IS NOT NULL OR ${lessons.description} IS NOT NULL OR ${lessons.textContent} IS NOT NULL)`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${translations} 
        WHERE ${translations.entityType} = 'lesson' 
        AND ${translations.entityId} = ${lessons.id}
        AND ${translations.targetLanguage} = 'english'
        AND ${translations.fieldName} IN ('title', 'description', 'textContent')
      )`
    )
  )
  .limit(limit);

  return lessonsToTranslate.map(lesson => ({
    lessonId: lesson.id,
    sourceLanguage: 'somali' as const,
    targetLanguages: ['english'] as ['english'],
    fields: {
      title: lesson.title || undefined,
      description: lesson.description || undefined,
      textContent: lesson.textContent || undefined
    }
  }));
}

/**
 * Collect quiz questions that need translation
 * Returns quiz questions that don't have English translations yet
 */
export async function collectQuizQuestionsForTranslation(limit: number = DEFAULT_BATCH_SIZE): Promise<TranslationRequest[]> {
  // Get quiz questions that have content and no English translation
  const questionsToTranslate = await db.select({
    id: quizQuestions.id,
    question: quizQuestions.question,
    options: quizQuestions.options,
    explanation: quizQuestions.explanation
  })
  .from(quizQuestions)
  .where(
    and(
      sql`${quizQuestions.question} IS NOT NULL`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${translations} 
        WHERE ${translations.entityType} = 'quiz_question' 
        AND ${translations.entityId} = ${quizQuestions.id}
        AND ${translations.targetLanguage} = 'english'
        AND ${translations.fieldName} IN ('question', 'options', 'explanation')
      )`
    )
  )
  .limit(limit);

  return questionsToTranslate.map(question => ({
    lessonId: question.id,
    sourceLanguage: 'somali' as const,
    targetLanguages: ['english'] as ['english'],
    fields: {
      question: question.question || undefined,
      options: question.options || undefined,
      explanation: question.explanation || undefined
    }
  }));
}

/**
 * Collect parent messages that need translation
 * Returns messages that don't have English translations yet
 */
export async function collectParentMessagesForTranslation(limit: number = DEFAULT_BATCH_SIZE): Promise<TranslationRequest[]> {
  // Get parent messages that have content and no English translation
  const messagesToTranslate = await db.select({
    id: parentMessages.id,
    title: parentMessages.title,
    content: parentMessages.content,
    keyPoints: parentMessages.keyPoints
  })
  .from(parentMessages)
  .where(
    and(
      sql`${parentMessages.isPublished} = true`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${translations} 
        WHERE ${translations.entityType} = 'parent_message' 
        AND ${translations.entityId} = ${parentMessages.id}
        AND ${translations.targetLanguage} = 'english'
        AND ${translations.fieldName} IN ('title', 'content', 'keyPoints')
      )`
    )
  )
  .limit(limit);

  return messagesToTranslate.map(message => ({
    lessonId: message.id,
    sourceLanguage: 'somali' as const,
    targetLanguages: ['english'] as ['english'],
    fields: {
      title: message.title || undefined,
      content: message.content || undefined,
      keyPoints: message.keyPoints || undefined
    }
  }));
}

/**
 * Collect bedtime stories that need translation
 * Returns stories that don't have English translations yet
 */
export async function collectBedtimeStoriesForTranslation(limit: number = DEFAULT_BATCH_SIZE): Promise<TranslationRequest[]> {
  // Get bedtime stories that have content and no English translation
  const storiesToTranslate = await db.select({
    id: bedtimeStories.id,
    titleSomali: bedtimeStories.titleSomali,
    content: bedtimeStories.content,
    moralLesson: bedtimeStories.moralLesson
  })
  .from(bedtimeStories)
  .where(
    and(
      sql`${bedtimeStories.isPublished} = true`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${translations} 
        WHERE ${translations.entityType} = 'bedtime_story' 
        AND ${translations.entityId} = ${bedtimeStories.id}
        AND ${translations.targetLanguage} = 'english'
        AND ${translations.fieldName} IN ('title', 'content', 'moralLesson')
      )`
    )
  )
  .limit(limit);

  return storiesToTranslate.map(story => ({
    lessonId: story.id,
    sourceLanguage: 'somali' as const,
    targetLanguages: ['english'] as ['english'],
    fields: {
      title: story.titleSomali || undefined,
      content: story.content || undefined,
      moralLesson: story.moralLesson || undefined
    }
  }));
}

/**
 * Collect lessons that need summaries and learning objectives
 */
export async function collectLessonsForSummary(limit: number = 50): Promise<SummaryRequest[]> {
  // Get lessons with content
  const lessonsForSummary = await db.select({
    id: lessons.id,
    textContent: lessons.textContent,
    description: lessons.description
  })
  .from(lessons)
  .where(
    sql`(${lessons.textContent} IS NOT NULL OR ${lessons.description} IS NOT NULL)`
  )
  .limit(limit);

  return lessonsForSummary
    .filter(lesson => lesson.textContent || lesson.description)
    .map(lesson => ({
      lessonId: lesson.id,
      language: 'somali' as const
    }));
}

/**
 * Collect quiz questions that need improvement
 */
export async function collectQuizQuestionsForImprovement(limit: number = 50): Promise<QuizImprovementRequest[]> {
  // Get quiz questions
  const quizQuestionsToImprove = await db.select({
    id: quizQuestions.id,
    question: quizQuestions.question,
    options: quizQuestions.options
  })
  .from(quizQuestions)
  .where(
    and(
      sql`${quizQuestions.questionType} = 'multiple_choice'`,
      sql`${quizQuestions.options} IS NOT NULL`
    )
  )
  .limit(limit);

  return quizQuestionsToImprove.map(q => ({
    quizQuestionId: q.id,
    language: 'somali' as const
  }));
}

/**
 * Create comprehensive translation batch jobs for all content
 */
export async function createComprehensiveTranslationBatchJob(limit: number = 50): Promise<string[]> {
  console.log('[Batch Worker] Creating comprehensive translation batch jobs...');
  const jobIds: string[] = [];
  
  // Collect all content types
  const [
    coursesRequests,
    modulesRequests,
    lessonsRequests,
    quizRequests,
    messagesRequests,
    storiesRequests
  ] = await Promise.all([
    collectCoursesForTranslation(limit),
    collectModulesForTranslation(limit),
    collectLessonsForTranslation(limit),
    collectQuizQuestionsForTranslation(limit),
    collectParentMessagesForTranslation(limit),
    collectBedtimeStoriesForTranslation(limit)
  ]);
  
  // Create batch jobs for each content type
  if (coursesRequests.length > 0) {
    console.log(`[Batch Worker] Found ${coursesRequests.length} courses for translation`);
    const batchItems = await createTranslationBatchInput(coursesRequests);
    if (batchItems.length > 0) {
      const jobId = await createBatchJob('translation', batchItems, {
        jobType: 'translation',
        totalItems: coursesRequests.length,
        description: `Translate ${coursesRequests.length} courses (Somali → English)`,
        createdBy: 'automated-worker',
        metadata: { entityType: 'course' }
      });
      jobIds.push(jobId);
      console.log(`[Batch Worker] Created course translation batch job: ${jobId}`);
    }
  }
  
  if (modulesRequests.length > 0) {
    console.log(`[Batch Worker] Found ${modulesRequests.length} modules for translation`);
    const batchItems = await createTranslationBatchInput(modulesRequests);
    if (batchItems.length > 0) {
      const jobId = await createBatchJob('translation', batchItems, {
        jobType: 'translation',
        totalItems: modulesRequests.length,
        description: `Translate ${modulesRequests.length} modules (Somali → English)`,
        createdBy: 'automated-worker',
        metadata: { entityType: 'module' }
      });
      jobIds.push(jobId);
      console.log(`[Batch Worker] Created module translation batch job: ${jobId}`);
    }
  }
  
  if (lessonsRequests.length > 0) {
    console.log(`[Batch Worker] Found ${lessonsRequests.length} lessons for translation`);
    const batchItems = await createTranslationBatchInput(lessonsRequests);
    if (batchItems.length > 0) {
      const jobId = await createBatchJob('translation', batchItems, {
        jobType: 'translation',
        totalItems: lessonsRequests.length,
        description: `Translate ${lessonsRequests.length} lessons (Somali → English)`,
        createdBy: 'automated-worker',
        metadata: { entityType: 'lesson' }
      });
      jobIds.push(jobId);
      console.log(`[Batch Worker] Created lesson translation batch job: ${jobId}`);
    }
  }
  
  if (quizRequests.length > 0) {
    console.log(`[Batch Worker] Found ${quizRequests.length} quiz questions for translation`);
    const batchItems = await createTranslationBatchInput(quizRequests);
    if (batchItems.length > 0) {
      const jobId = await createBatchJob('translation', batchItems, {
        jobType: 'translation',
        totalItems: quizRequests.length,
        description: `Translate ${quizRequests.length} quiz questions (Somali → English)`,
        createdBy: 'automated-worker',
        metadata: { entityType: 'quiz_question' }
      });
      jobIds.push(jobId);
      console.log(`[Batch Worker] Created quiz translation batch job: ${jobId}`);
    }
  }
  
  if (messagesRequests.length > 0) {
    console.log(`[Batch Worker] Found ${messagesRequests.length} parent messages for translation`);
    const batchItems = await createTranslationBatchInput(messagesRequests);
    if (batchItems.length > 0) {
      const jobId = await createBatchJob('translation', batchItems, {
        jobType: 'translation',
        totalItems: messagesRequests.length,
        description: `Translate ${messagesRequests.length} parent messages (Somali → English)`,
        createdBy: 'automated-worker',
        metadata: { entityType: 'parent_message' }
      });
      jobIds.push(jobId);
      console.log(`[Batch Worker] Created parent message translation batch job: ${jobId}`);
    }
  }
  
  if (storiesRequests.length > 0) {
    console.log(`[Batch Worker] Found ${storiesRequests.length} bedtime stories for translation`);
    const batchItems = await createTranslationBatchInput(storiesRequests);
    if (batchItems.length > 0) {
      const jobId = await createBatchJob('translation', batchItems, {
        jobType: 'translation',
        totalItems: storiesRequests.length,
        description: `Translate ${storiesRequests.length} bedtime stories (Somali → English)`,
        createdBy: 'automated-worker',
        metadata: { entityType: 'bedtime_story' }
      });
      jobIds.push(jobId);
      console.log(`[Batch Worker] Created bedtime story translation batch job: ${jobId}`);
    }
  }
  
  if (jobIds.length === 0) {
    console.log('[Batch Worker] No content found that needs translation');
  }
  
  return jobIds;
}

/**
 * Create a translation batch job for new lessons (legacy support)
 */
export async function createTranslationBatchJob(limit: number = 50): Promise<string | null> {
  console.log('[Batch Worker] Collecting lessons for translation...');
  
  const requests = await collectLessonsForTranslation(limit);
  
  if (requests.length === 0) {
    console.log('[Batch Worker] No lessons found for translation');
    return null;
  }
  
  console.log(`[Batch Worker] Found ${requests.length} lessons for translation`);
  
  const batchItems = await createTranslationBatchInput(requests);
  
  if (batchItems.length === 0) {
    console.log('[Batch Worker] No translation requests generated');
    return null;
  }
  
  const jobId = await createBatchJob('translation', batchItems, {
    jobType: 'translation',
    totalItems: requests.length,
    description: `Bulk translation of ${requests.length} lessons (Somali → English)`,
    createdBy: 'automated-worker'
  });
  
  console.log(`[Batch Worker] Created translation batch job: ${jobId}`);
  
  return jobId;
}

/**
 * Create a summary generation batch job
 */
export async function createSummaryBatchJob(limit: number = 50): Promise<string | null> {
  console.log('[Batch Worker] Collecting lessons for summary generation...');
  
  const requests = await collectLessonsForSummary(limit);
  
  if (requests.length === 0) {
    console.log('[Batch Worker] No lessons found for summary generation');
    return null;
  }
  
  console.log(`[Batch Worker] Found ${requests.length} lessons for summary generation`);
  
  const batchItems = await createSummaryBatchInput(requests);
  
  if (batchItems.length === 0) {
    console.log('[Batch Worker] No summary requests generated');
    return null;
  }
  
  const jobId = await createBatchJob('summary', batchItems, {
    jobType: 'summary',
    totalItems: requests.length,
    description: `Generate summaries and learning objectives for ${requests.length} lessons`,
    createdBy: 'automated-worker'
  });
  
  console.log(`[Batch Worker] Created summary batch job: ${jobId}`);
  
  return jobId;
}

/**
 * Create a quiz improvement batch job
 */
export async function createQuizImprovementBatchJob(limit: number = 50): Promise<string | null> {
  console.log('[Batch Worker] Collecting quiz questions for improvement...');
  
  const requests = await collectQuizQuestionsForImprovement(limit);
  
  if (requests.length === 0) {
    console.log('[Batch Worker] No quiz questions found for improvement');
    return null;
  }
  
  console.log(`[Batch Worker] Found ${requests.length} quiz questions for improvement`);
  
  const batchItems = await createQuizImprovementBatchInput(requests);
  
  if (batchItems.length === 0) {
    console.log('[Batch Worker] No quiz improvement requests generated');
    return null;
  }
  
  const jobId = await createBatchJob('quiz_improvement', batchItems, {
    jobType: 'quiz_improvement',
    totalItems: requests.length,
    description: `Improve ${requests.length} quiz questions`,
    createdBy: 'automated-worker'
  });
  
  console.log(`[Batch Worker] Created quiz improvement batch job: ${jobId}`);
  
  return jobId;
}

/**
 * Check status of all pending/processing batch jobs
 */
export async function checkAllBatchJobsStatus(): Promise<void> {
  console.log('[Batch Worker] Checking status of all batch jobs...');
  
  const pendingJobs = await db.select()
    .from(batchJobs)
    .where(
      sql`${batchJobs.status} IN ('pending', 'processing')`
    );
  
  if (pendingJobs.length === 0) {
    console.log('[Batch Worker] No pending/processing jobs found');
    return;
  }
  
  console.log(`[Batch Worker] Found ${pendingJobs.length} jobs to check`);
  
  for (const job of pendingJobs) {
    try {
      await checkBatchJobStatus(job.id);
      
      // If job is completed, process results
      const [updatedJob] = await db.select()
        .from(batchJobs)
        .where(eq(batchJobs.id, job.id));
      
      if (updatedJob.status === 'completed' && updatedJob.outputFileId) {
        console.log(`[Batch Worker] Processing results for completed job ${job.id}`);
        await processBatchJobResults(job.id);
      }
    } catch (err) {
      console.error(`[Batch Worker] Error checking job ${job.id}:`, err);
      
      // Mark job as failed
      await db.update(batchJobs)
        .set({
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(batchJobs.id, job.id));
    }
  }
}

/**
 * Main worker function - runs all batch processing tasks
 */
export async function runBatchWorker(): Promise<void> {
  console.log('[Batch Worker] Starting batch processing worker...');
  
  try {
    // Check status of existing jobs first
    await checkAllBatchJobsStatus();
    
    // Create new batch jobs if needed (check if we have capacity)
    const activeJobs = await db.select()
      .from(batchJobs)
      .where(
        sql`${batchJobs.status} IN ('pending', 'processing')`
      );
    
    // Limit to MAX_CONCURRENT_BATCH_JOBS concurrent batch jobs to avoid overwhelming the API
    if (activeJobs.length >= MAX_CONCURRENT_BATCH_JOBS) {
      console.log('[Batch Worker] Maximum concurrent jobs reached, skipping new job creation');
      return;
    }
    
    // Create comprehensive translation jobs for all content types
    const jobIds = await createComprehensiveTranslationBatchJob(DEFAULT_BATCH_SIZE);
    
    if (jobIds.length > 0) {
      console.log(`[Batch Worker] Created ${jobIds.length} translation batch jobs`);
    }
    
    console.log('[Batch Worker] Batch processing worker completed');
  } catch (err) {
    console.error('[Batch Worker] Error running batch worker:', err);
  }
}
