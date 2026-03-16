# OpenAI Batch API Processing Pipeline

This module provides cost-effective bulk processing of educational content using OpenAI's Batch API.

## Features

- **Bulk Translation**: Translate lessons from Somali → English
- **Content Summaries**: Generate summaries and learning objectives
- **Quiz Improvements**: Enhance quiz questions for better clarity
- **Background Processing**: Automated nightly processing via cron jobs
- **Error Handling**: Comprehensive retry logic and error tracking
- **Cost Efficient**: 50% cost savings using OpenAI Batch API

## Architecture

### Database Schema

The system uses two main tables:

1. **batch_jobs**: Tracks high-level batch job status
   - Job type (translation, summary, quiz_improvement)
   - OpenAI batch ID and file IDs
   - Request counts and status
   - Metadata and error tracking

2. **batch_job_items**: Tracks individual items within a batch
   - Links to parent batch job
   - Entity type and ID (lesson, quiz_question)
   - Request/response data
   - Processing status

### Core Components

1. **service.ts**: Core batch API operations
   - File upload to OpenAI
   - Batch job creation
   - Status checking
   - Result retrieval and processing

2. **worker.ts**: Background processing logic
   - Collects lessons/quizzes that need processing
   - Creates batch jobs
   - Monitors job status
   - Applies results to database

3. **routes.ts**: Admin API endpoints
   - Manual job triggering
   - Status monitoring
   - Result viewing
   - Job cancellation

4. **types.ts**: TypeScript type definitions

## Usage

### Automated Processing (Cron)

The system runs automatically:

- **2:00 AM EAT**: Main batch worker runs
  - Checks for pending jobs
  - Creates new translation jobs (if capacity available)
  - Limits to 3 concurrent jobs

- **Every Hour (30 min)**: Status check
  - Updates job status from OpenAI
  - Processes completed jobs
  - Applies results to database

### Manual Triggering (Admin API)

#### Create a Translation Job

```bash
POST /api/admin/batch-jobs/translation
{
  "limit": 20  # Number of lessons to process
}
```

#### Create a Summary Job

```bash
POST /api/admin/batch-jobs/summary
{
  "limit": 20
}
```

#### Create a Quiz Improvement Job

```bash
POST /api/admin/batch-jobs/quiz-improvement
{
  "limit": 20
}
```

#### Get All Jobs

```bash
GET /api/admin/batch-jobs
```

#### Get Specific Job Details

```bash
GET /api/admin/batch-jobs/:id
```

#### Check Job Status

```bash
POST /api/admin/batch-jobs/:id/check-status
```

#### Process Job Results

```bash
POST /api/admin/batch-jobs/:id/process-results
```

#### Cancel Job

```bash
POST /api/admin/batch-jobs/:id/cancel
```

#### Check All Jobs Status

```bash
POST /api/admin/batch-jobs/check-all-status
```

#### Get Statistics

```bash
GET /api/admin/batch-jobs/stats
```

## OpenAI Batch API Flow

1. **Input Generation**
   - System collects lessons/quizzes that need processing
   - Generates JSONL file with batch requests
   - Each request is a chat completion with specific prompts

2. **Upload & Create**
   - Upload JSONL file to OpenAI
   - Create batch job with 24h completion window
   - Store job details in database

3. **Monitoring**
   - Check job status periodically
   - Track progress (completed/failed counts)
   - Update database with latest status

4. **Result Processing**
   - Download output JSONL when completed
   - Parse responses
   - Apply translations/improvements to database
   - Mark items as processed

## Translation Prompts

### Somali → English
```
Translate the following Somali text to English. 
Maintain the educational tone and context. 
Return only the translation without any additional explanation.

Somali text:
[content]

[Language] translation:
```

### Summary Generation
```
Analyze the following lesson content in Somali and provide:
1. A concise summary (2-3 sentences)
2. Three key learning objectives

Format as JSON:
{
  "summary": "...",
  "objectives": ["...", "...", "..."]
}
```

### Quiz Improvement
```
Review this quiz question and suggest improvements for 
clarity and educational value:

Question: [question]
Options: [options]
Correct Answer: [answer]

Provide suggestions as JSON:
{
  "improvedQuestion": "...",
  "improvedOptions": [...],
  "explanation": "..."
}
```

## Configuration

### Environment Variables

Required:
- `AI_INTEGRATIONS_OPENAI_API_KEY` or `OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL` (optional)
- `DATABASE_URL`

### Cron Schedule

Configured in `server/cron.ts`:
- Batch worker: 2:00 AM EAT (Africa/Mogadishu timezone)
- Status check: Every hour at 30 minutes past

### Limits

- Maximum 3 concurrent batch jobs
- Default batch size: 20 items per job
- 24-hour completion window for OpenAI

## Error Handling

The system includes comprehensive error handling:

1. **Job Level**
   - Failed jobs marked with error message
   - Retry logic for transient failures
   - Status tracking in database

2. **Item Level**
   - Individual items can fail independently
   - Failed items stored with error details
   - Successful items processed normally

3. **Database Recovery**
   - All state stored in database
   - Can resume processing after restarts
   - Idempotent result application

## Cost Optimization

- Uses `gpt-4o-mini` model for efficiency
- Batch API provides 50% cost savings
- Processes content in bulk overnight
- Limits concurrent jobs to manage costs

## Monitoring

Check job status and statistics via admin API:

1. View all jobs and their status
2. Check detailed progress for each job
3. View statistics by type and status
4. Monitor failed requests

## Future Enhancements

Potential improvements:
- Add translation tables to store multiple language versions
- Implement incremental processing (only new content)
- Add webhook notifications for job completion
- Create admin UI dashboard for monitoring
- Support additional languages
- Add content validation before processing
- Implement A/B testing for prompt variations

## Troubleshooting

### Jobs stuck in "processing"
- Run status check: `POST /api/admin/batch-jobs/check-all-status`
- Check OpenAI dashboard for batch status

### Results not applied to database
- Manually trigger: `POST /api/admin/batch-jobs/:id/process-results`
- Check error logs for parsing issues

### No jobs being created
- Check cron logs for errors
- Verify OpenAI API key is configured
- Check database for pending lessons

### API key issues
- Verify `AI_INTEGRATIONS_OPENAI_API_KEY` or `OPENAI_API_KEY` is set
- Check API key has batch API access
- Verify account has sufficient credits

## Support

For issues or questions:
1. Check server logs: `[Batch API]` and `[Batch Worker]` tags
2. Review OpenAI Batch API documentation
3. Check database for job status and errors
