/**
 * OpenAI Batch API Service
 * Handles creation, monitoring, and processing of batch jobs
 */

import OpenAI from 'openai';
import { db } from '../db';
import { 
  batchJobs, 
  batchJobItems, 
  lessons, 
  quizQuestions, 
  translations,
  courses,
  modules,
  parentMessages,
  bedtimeStories
} from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { 
  BatchJobType, 
  BatchRequestItem, 
  BatchResponse,
  TranslationRequest,
  SummaryRequest,
  QuizImprovementRequest,
  BatchJobMetadata 
} from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Configuration constants
const MAX_CONCURRENT_BATCH_JOBS = 3;
const DEFAULT_BATCH_SIZE = 20;

/**
 * Get OpenAI client instance
 * IMPORTANT: Batch API requires direct OpenAI API key (files upload + batch creation
 * are not supported through Replit AI integrations proxy)
 */
function getOpenAIClient(): OpenAI {
  const directKey = process.env.OPENAI_API_KEY;
  
  if (!directKey) {
    throw new Error('OPENAI_API_KEY is required for Batch API operations (Replit proxy does not support file uploads/batch creation)');
  }
  
  return new OpenAI({
    apiKey: directKey,
  });
}

/**
 * Generate translation prompts for Somali → English
 */
function generateTranslationPrompt(text: string, targetLanguage: 'english'): string {
  const targetLangName = 'English';
  
  return `Translate the following Somali text to ${targetLangName}. Maintain the educational tone and context. Return only the translation without any additional explanation or formatting.

Somali text:
${text}

${targetLangName} translation:`;
}

/**
 * Generate summary and learning objectives prompt
 */
function generateSummaryPrompt(lessonContent: string): string {
  return `Analyze the following lesson content in Somali and provide:

1. A concise summary (2-3 sentences)
2. Three key learning objectives

Format your response as JSON:
{
  "summary": "...",
  "objectives": ["objective 1", "objective 2", "objective 3"]
}

Lesson content:
${lessonContent}`;
}

/**
 * Generate quiz improvement suggestions
 */
function generateQuizImprovementPrompt(question: string, options: string[], answer: number): string {
  return `Review this quiz question and suggest improvements for clarity and educational value:

Question: ${question}
Options:
${options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}
Correct Answer: ${answer + 1}

Provide suggestions as JSON:
{
  "improvedQuestion": "...",
  "improvedOptions": ["option 1", "option 2", "option 3", "option 4"],
  "explanation": "Brief explanation of the correct answer"
}`;
}

/**
 * Get entity data by type and ID
 */
async function getEntityData(entityId: string): Promise<any> {
  // Try to find the entity in different tables
  // Check lessons first
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, entityId));
  if (lesson) return { entity: lesson, type: 'lesson' };
  
  // Check courses
  const [course] = await db.select().from(courses).where(eq(courses.id, entityId));
  if (course) return { entity: course, type: 'course' };
  
  // Check modules
  const [module] = await db.select().from(modules).where(eq(modules.id, entityId));
  if (module) return { entity: module, type: 'module' };
  
  // Check quiz questions
  const [quizQuestion] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, entityId));
  if (quizQuestion) return { entity: quizQuestion, type: 'quiz_question' };
  
  // Check parent messages
  const [parentMessage] = await db.select().from(parentMessages).where(eq(parentMessages.id, entityId));
  if (parentMessage) return { entity: parentMessage, type: 'parent_message' };
  
  // Check bedtime stories
  const [bedtimeStory] = await db.select().from(bedtimeStories).where(eq(bedtimeStories.id, entityId));
  if (bedtimeStory) return { entity: bedtimeStory, type: 'bedtime_story' };
  
  return null;
}

/**
 * Create JSONL batch input file for translation jobs
 */
export async function createTranslationBatchInput(
  requests: TranslationRequest[]
): Promise<BatchRequestItem[]> {
  const batchItems: BatchRequestItem[] = [];

  for (const request of requests) {
    // Get entity data
    const entityData = await getEntityData(request.lessonId); // lessonId is used generically for all entities
    if (!entityData) continue;
    
    const { entity, type: entityType } = entityData;

    // Create translation requests for each field and target language
    for (const field of Object.keys(request.fields) as Array<keyof typeof request.fields>) {
      // Get source text from entity, handling field name variations
      let sourceText: string | null = null;
      
      if (field === 'title' && entityType === 'bedtime_story') {
        // For bedtime stories, use titleSomali instead of title
        sourceText = entity['titleSomali'];
      } else if (field === 'comingSoonMessage' && entityType === 'course') {
        sourceText = entity['comingSoonMessage'];
      } else if (field === 'keyPoints' && entityType === 'parent_message') {
        sourceText = entity['keyPoints'];
      } else if (field === 'moralLesson' && entityType === 'bedtime_story') {
        sourceText = entity['moralLesson'];
      } else {
        sourceText = entity[field];
      }
      
      if (!sourceText) continue;

      for (const targetLang of request.targetLanguages) {
        batchItems.push({
          custom_id: `translation-${entityType}-${request.lessonId}-${field}-${targetLang}`,
          method: 'POST',
          url: '/v1/chat/completions',
          body: {
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a professional translator specializing in educational content.'
              },
              {
                role: 'user',
                content: generateTranslationPrompt(sourceText, targetLang)
              }
            ],
            temperature: 0.3,
            max_tokens: 2000
          }
        });
      }
    }
  }

  return batchItems;
}

/**
 * Create JSONL batch input file for summary generation
 */
export async function createSummaryBatchInput(
  requests: SummaryRequest[]
): Promise<BatchRequestItem[]> {
  const batchItems: BatchRequestItem[] = [];

  for (const request of requests) {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, request.lessonId));
    if (!lesson) continue;

    const content = lesson.textContent || lesson.description || '';
    if (!content) continue;

    batchItems.push({
      custom_id: `summary-${request.lessonId}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an educational content analyst specializing in creating summaries and learning objectives.'
          },
          {
            role: 'user',
            content: generateSummaryPrompt(content)
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      }
    });
  }

  return batchItems;
}

/**
 * Create JSONL batch input file for quiz improvements
 */
export async function createQuizImprovementBatchInput(
  requests: QuizImprovementRequest[]
): Promise<BatchRequestItem[]> {
  const batchItems: BatchRequestItem[] = [];

  for (const request of requests) {
    const [quizQuestion] = await db.select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, request.quizQuestionId));
    
    if (!quizQuestion || !quizQuestion.options) continue;

    let options: string[];
    try {
      options = JSON.parse(quizQuestion.options);
    } catch (err) {
      console.error(`[Batch API] Failed to parse options for quiz question ${request.quizQuestionId}:`, err);
      continue;
    }

    batchItems.push({
      custom_id: `quiz-${request.quizQuestionId}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an educational assessment expert specializing in improving quiz questions.'
          },
          {
            role: 'user',
            content: generateQuizImprovementPrompt(
              quizQuestion.question,
              options,
              quizQuestion.correctAnswer || 0
            )
          }
        ],
        temperature: 0.4,
        max_tokens: 1500
      }
    });
  }

  return batchItems;
}

/**
 * Write batch items to JSONL file and upload to OpenAI
 */
export async function uploadBatchFile(
  batchItems: BatchRequestItem[]
): Promise<string> {
  const openai = getOpenAIClient();
  
  // Create temp file
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `batch-${Date.now()}.jsonl`);
  
  // Write JSONL
  const jsonlContent = batchItems.map(item => JSON.stringify(item)).join('\n');
  fs.writeFileSync(tempFile, jsonlContent);
  
  try {
    // Upload to OpenAI
    const file = await openai.files.create({
      file: fs.createReadStream(tempFile),
      purpose: 'batch'
    });
    
    return file.id;
  } finally {
    // Clean up temp file
    fs.unlinkSync(tempFile);
  }
}

/**
 * Create a new batch job
 */
export async function createBatchJob(
  type: BatchJobType,
  batchItems: BatchRequestItem[],
  metadata?: Partial<BatchJobMetadata>
): Promise<string> {
  const openai = getOpenAIClient();
  
  // Upload input file
  const inputFileId = await uploadBatchFile(batchItems);
  
  // Create batch job
  const batch = await openai.batches.create({
    input_file_id: inputFileId,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
    metadata: {
      jobType: type,
      description: metadata?.description || '',
      createdBy: metadata?.createdBy || 'system'
    }
  });
  
  // Store in database
  const [job] = await db.insert(batchJobs).values({
    batchId: batch.id,
    type,
    status: 'processing',
    inputFileId: inputFileId,
    totalRequests: batchItems.length,
    metadata: JSON.stringify({ ...metadata, batchItems: batchItems.length })
  }).returning();
  
  // Store individual items
  for (const item of batchItems) {
    // Parse custom_id - format depends on job type
    // translation: "translation-{lessonId}-{field}-{lang}"
    // summary: "summary-{lessonId}"
    // quiz: "quiz-{quizQuestionId}"
    const parts = item.custom_id.split('-');
    const entityType = parts[0]; // 'translation', 'summary', or 'quiz'
    const entityId = parts[1]; // lessonId or quizQuestionId
    
    await db.insert(batchJobItems).values({
      batchJobId: job.id,
      entityType,
      entityId,
      customId: item.custom_id,
      request: JSON.stringify(item),
      status: 'pending'
    });
  }
  
  console.log(`[Batch API] Created ${type} batch job ${batch.id} with ${batchItems.length} requests`);
  
  return job.id;
}

/**
 * Check status of a batch job
 */
export async function checkBatchJobStatus(jobId: string): Promise<void> {
  const openai = getOpenAIClient();
  
  const [job] = await db.select().from(batchJobs).where(eq(batchJobs.id, jobId));
  if (!job || !job.batchId) {
    throw new Error(`Batch job ${jobId} not found`);
  }
  
  // Get status from OpenAI
  const batch = await openai.batches.retrieve(job.batchId);
  
  // Update database
  await db.update(batchJobs)
    .set({
      status: batch.status as any,
      completedRequests: batch.request_counts?.completed || 0,
      failedRequests: batch.request_counts?.failed || 0,
      outputFileId: batch.output_file_id || undefined,
      errorFileId: batch.error_file_id || undefined,
      updatedAt: new Date(),
      completedAt: batch.status === 'completed' ? new Date() : undefined
    })
    .where(eq(batchJobs.id, jobId));
  
  console.log(`[Batch API] Job ${job.batchId} status: ${batch.status} (${batch.request_counts?.completed || 0}/${batch.request_counts?.total || 0})`);
}

/**
 * Retrieve and process batch job results
 */
export async function processBatchJobResults(jobId: string): Promise<void> {
  const openai = getOpenAIClient();
  
  const [job] = await db.select().from(batchJobs).where(eq(batchJobs.id, jobId));
  if (!job || !job.outputFileId) {
    throw new Error(`Batch job ${jobId} has no output file`);
  }
  
  // Download output file
  const fileContent = await openai.files.content(job.outputFileId);
  const fileText = await fileContent.text();
  
  // Parse JSONL responses
  const responses: BatchResponse[] = fileText
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
  
  // Process each response
  for (const response of responses) {
    const [item] = await db.select()
      .from(batchJobItems)
      .where(and(
        eq(batchJobItems.batchJobId, jobId),
        eq(batchJobItems.customId, response.custom_id)
      ));
    
    if (!item) continue;
    
    if (response.error) {
      await db.update(batchJobItems)
        .set({
          status: 'failed',
          error: JSON.stringify(response.error),
          processedAt: new Date()
        })
        .where(eq(batchJobItems.id, item.id));
      continue;
    }
    
    const result = response.response.body.choices[0].message.content;
    
    await db.update(batchJobItems)
      .set({
        status: 'completed',
        response: result,
        processedAt: new Date()
      })
      .where(eq(batchJobItems.id, item.id));
    
    // Apply results to database based on job type
    await applyResultToDatabase(job.type, item.customId, result);
  }
  
  console.log(`[Batch API] Processed ${responses.length} results for job ${job.batchId}`);
}

/**
 * Apply batch results to the database
 */
async function applyResultToDatabase(
  jobType: string,
  customId: string,
  result: string
): Promise<void> {
  const parts = customId.split('-');
  
  if (jobType === 'translation') {
    // Format: translation-{entityType}-{entityId}-{field}-{targetLang}
    const [, entityType, entityId, field, targetLang] = parts;
    
    // Store translation in translations table
    try {
      await db.insert(translations).values({
        entityType: entityType,
        entityId: entityId,
        fieldName: field,
        sourceLanguage: 'somali',
        targetLanguage: targetLang,
        translatedText: result.trim()
      }).onConflictDoUpdate({
        target: [translations.entityType, translations.entityId, translations.fieldName, translations.targetLanguage],
        set: {
          translatedText: result.trim(),
          updatedAt: new Date()
        }
      });
      
      console.log(`[Batch API] Stored ${targetLang} translation for ${entityType} ${entityId}.${field}`);
    } catch (err) {
      console.error(`[Batch API] Failed to store translation:`, err);
    }
    
  } else if (jobType === 'summary') {
    const [, lessonId] = parts;
    
    try {
      const data = JSON.parse(result);
      // Store summary and objectives as metadata
      // You can expand this to add dedicated columns in lessons table if needed
      console.log(`[Batch API] Summary result for lesson ${lessonId}`, {
        summary: data.summary?.substring(0, 50) + '...',
        objectives: data.objectives?.length || 0
      });
    } catch (err) {
      console.error(`[Batch API] Failed to parse summary result:`, err);
    }
    
  } else if (jobType === 'quiz_improvement') {
    const [, quizQuestionId] = parts;
    
    try {
      const data = JSON.parse(result);
      // Update quiz question with improvements
      await db.update(quizQuestions)
        .set({
          question: data.improvedQuestion,
          options: JSON.stringify(data.improvedOptions),
          explanation: data.explanation
        })
        .where(eq(quizQuestions.id, quizQuestionId));
      
      console.log(`[Batch API] Updated quiz question ${quizQuestionId}`);
    } catch (err) {
      console.error(`[Batch API] Failed to parse quiz improvement result:`, err);
    }
  }
}

/**
 * Cancel a batch job
 */
export async function cancelBatchJob(jobId: string): Promise<void> {
  const openai = getOpenAIClient();
  
  const [job] = await db.select().from(batchJobs).where(eq(batchJobs.id, jobId));
  if (!job || !job.batchId) {
    throw new Error(`Batch job ${jobId} not found`);
  }
  
  await openai.batches.cancel(job.batchId);
  
  await db.update(batchJobs)
    .set({
      status: 'cancelled',
      updatedAt: new Date()
    })
    .where(eq(batchJobs.id, jobId));
  
  console.log(`[Batch API] Cancelled job ${job.batchId}`);
}
