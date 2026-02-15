/**
 * API Routes for OpenAI Batch API Management
 */

import { type Express, type Request, type Response } from 'express';
import { db } from '../db';
import { batchJobs, batchJobItems, users } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import {
  createTranslationBatchJob,
  createSummaryBatchJob,
  createQuizImprovementBatchJob,
  checkAllBatchJobsStatus,
  createComprehensiveTranslationBatchJob
} from './worker';
import {
  checkBatchJobStatus,
  processBatchJobResults,
  cancelBatchJob
} from './service';
import {
  generateTranslationCoverageReport,
  formatReportAsText
} from './report';

/**
 * Check if user is admin
 */
async function isAdmin(req: Request): Promise<boolean> {
  if (!req.session.userId) {
    return false;
  }
  
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, req.session.userId));
  
  return user?.isAdmin || false;
}

/**
 * Register batch API routes
 */
export function registerBatchApiRoutes(app: Express) {
  // Get all batch jobs
  app.get('/api/admin/batch-jobs', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const jobs = await db.select()
        .from(batchJobs)
        .orderBy(desc(batchJobs.createdAt))
        .limit(50);

      res.json(jobs);
    } catch (err) {
      console.error('[Batch API Routes] Error fetching jobs:', err);
      res.status(500).json({ error: 'Failed to fetch batch jobs' });
    }
  });

  // Get a specific batch job with items
  app.get('/api/admin/batch-jobs/:id', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const jobId = req.params.id;

      const [job] = await db.select()
        .from(batchJobs)
        .where(eq(batchJobs.id, jobId));

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const items = await db.select()
        .from(batchJobItems)
        .where(eq(batchJobItems.batchJobId, jobId))
        .limit(100);

      res.json({ job, items });
    } catch (err) {
      console.error('[Batch API Routes] Error fetching job:', err);
      res.status(500).json({ error: 'Failed to fetch batch job' });
    }
  });

  // Create a new translation batch job
  app.post('/api/admin/batch-jobs/translation', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const limit = parseInt(req.body.limit || '20');

      const jobId = await createTranslationBatchJob(limit);

      if (!jobId) {
        return res.json({ message: 'No lessons found for translation' });
      }

      res.json({ jobId, message: 'Translation batch job created successfully' });
    } catch (err) {
      console.error('[Batch API Routes] Error creating translation job:', err);
      res.status(500).json({ error: 'Failed to create translation job' });
    }
  });

  // Create comprehensive translation batch jobs (all content types)
  app.post('/api/admin/batch-jobs/translation-comprehensive', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const limit = parseInt(req.body.limit || '20');

      const jobIds = await createComprehensiveTranslationBatchJob(limit);

      if (jobIds.length === 0) {
        return res.json({ message: 'No content found that needs translation' });
      }

      res.json({ 
        jobIds, 
        count: jobIds.length,
        message: `Created ${jobIds.length} translation batch jobs successfully` 
      });
    } catch (err) {
      console.error('[Batch API Routes] Error creating comprehensive translation job:', err);
      res.status(500).json({ error: 'Failed to create comprehensive translation job' });
    }
  });

  // Create a new summary batch job
  app.post('/api/admin/batch-jobs/summary', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const limit = parseInt(req.body.limit || '20');

      const jobId = await createSummaryBatchJob(limit);

      if (!jobId) {
        return res.json({ message: 'No lessons found for summary generation' });
      }

      res.json({ jobId, message: 'Summary batch job created successfully' });
    } catch (err) {
      console.error('[Batch API Routes] Error creating summary job:', err);
      res.status(500).json({ error: 'Failed to create summary job' });
    }
  });

  // Create a new quiz improvement batch job
  app.post('/api/admin/batch-jobs/quiz-improvement', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const limit = parseInt(req.body.limit || '20');

      const jobId = await createQuizImprovementBatchJob(limit);

      if (!jobId) {
        return res.json({ message: 'No quiz questions found for improvement' });
      }

      res.json({ jobId, message: 'Quiz improvement batch job created successfully' });
    } catch (err) {
      console.error('[Batch API Routes] Error creating quiz improvement job:', err);
      res.status(500).json({ error: 'Failed to create quiz improvement job' });
    }
  });

  // Check status of a specific batch job
  app.post('/api/admin/batch-jobs/:id/check-status', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const jobId = req.params.id;

      await checkBatchJobStatus(jobId);

      const [job] = await db.select()
        .from(batchJobs)
        .where(eq(batchJobs.id, jobId));

      res.json({ job, message: 'Job status updated' });
    } catch (err) {
      console.error('[Batch API Routes] Error checking job status:', err);
      res.status(500).json({ error: 'Failed to check job status' });
    }
  });

  // Process results of a completed batch job
  app.post('/api/admin/batch-jobs/:id/process-results', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const jobId = req.params.id;

      await processBatchJobResults(jobId);

      res.json({ message: 'Job results processed successfully' });
    } catch (err) {
      console.error('[Batch API Routes] Error processing job results:', err);
      res.status(500).json({ error: 'Failed to process job results' });
    }
  });

  // Cancel a batch job
  app.post('/api/admin/batch-jobs/:id/cancel', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const jobId = req.params.id;

      await cancelBatchJob(jobId);

      res.json({ message: 'Job cancelled successfully' });
    } catch (err) {
      console.error('[Batch API Routes] Error cancelling job:', err);
      res.status(500).json({ error: 'Failed to cancel job' });
    }
  });

  // Check status of all pending/processing jobs
  app.post('/api/admin/batch-jobs/check-all-status', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      await checkAllBatchJobsStatus();

      const jobs = await db.select()
        .from(batchJobs)
        .where(
          sql`${batchJobs.status} IN ('pending', 'processing')`
        );

      res.json({ jobs, message: 'All job statuses updated' });
    } catch (err) {
      console.error('[Batch API Routes] Error checking all job statuses:', err);
      res.status(500).json({ error: 'Failed to check all job statuses' });
    }
  });

  // Get batch job statistics
  app.get('/api/admin/batch-jobs/stats', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const stats = await db.execute(sql`
        SELECT 
          status,
          type,
          COUNT(*) as count,
          SUM(total_requests) as total_requests,
          SUM(completed_requests) as completed_requests,
          SUM(failed_requests) as failed_requests
        FROM ${batchJobs}
        GROUP BY status, type
        ORDER BY status, type
      `);

      res.json(stats.rows);
    } catch (err) {
      console.error('[Batch API Routes] Error fetching stats:', err);
      res.status(500).json({ error: 'Failed to fetch batch job statistics' });
    }
  });

  // Get translation coverage report
  app.get('/api/admin/batch-jobs/translation-coverage', async (req: Request, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
      }

      const format = req.query.format === 'text' ? 'text' : 'json';
      const language = req.query.lang === 'somali' ? 'somali' : 'english';

      const report = await generateTranslationCoverageReport();

      if (format === 'text') {
        const textReport = formatReportAsText(report, language);
        res.type('text/plain').send(textReport);
      } else {
        res.json(report);
      }
    } catch (err) {
      console.error('[Batch API Routes] Error generating coverage report:', err);
      res.status(500).json({ error: 'Failed to generate translation coverage report' });
    }
  });

  console.log('[Batch API Routes] Registered batch API management routes');
}
