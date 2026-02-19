/**
 * Types for OpenAI Batch API processing
 */

export type BatchJobType = 'translation' | 'summary' | 'quiz_improvement';

export type BatchJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface TranslationRequest {
  lessonId: string;
  sourceLanguage: 'somali';
  targetLanguages: ['english'];
  fields: {
    title?: string;
    description?: string;
    textContent?: string;
    content?: string;
    question?: string;
    options?: string;
    explanation?: string;
    keyPoints?: string;
    moralLesson?: string;
    comingSoonMessage?: string;
    [key: string]: string | undefined;
  };
}

export interface SummaryRequest {
  lessonId: string;
  language: 'somali';
}

export interface QuizImprovementRequest {
  quizQuestionId: string;
  language: 'somali';
}

export interface BatchRequestItem {
  custom_id: string;
  method: 'POST';
  url: string;
  body: {
    model: string;
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
    temperature?: number;
    max_tokens?: number;
  };
}

export interface BatchResponse {
  id: string;
  custom_id: string;
  response: {
    status_code: number;
    request_id: string;
    body: {
      id: string;
      object: string;
      created: number;
      model: string;
      choices: Array<{
        index: number;
        message: {
          role: string;
          content: string;
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
  };
  error?: {
    message: string;
    code: string;
  };
}

export interface BatchJobMetadata {
  jobType: BatchJobType;
  totalItems: number;
  description: string;
  createdBy?: string;
  entityType?: string;
}
