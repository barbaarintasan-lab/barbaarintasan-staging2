# Initial Batch Translation Guide
## Running the First Translation to Populate English Content

This guide explains how to run the initial batch translation job to populate English content for the Barbaarintasan Academy application.

---

## 🚀 Quick Start

```bash
# 1. Set environment variables
export DATABASE_URL="postgresql://user:password@host:port/database"
export OPENAI_API_KEY="sk-your-openai-api-key"

# 2. Run initial translation
npm run translate:initial

# 3. Check status (after 24 hours)
npm run translate:status
```

**That's it!** The script will create translation jobs and OpenAI will process them within 24 hours.

---

## Overview

The Barbaarintasan Academy application is primarily in Somali but supports English translations. This script will:

1. **Scan the database** for all content that needs translation
2. **Create batch translation jobs** for each content type:
   - Courses (title, description, comingSoonMessage)
   - Modules (title)
   - Lessons (title, description, textContent)
   - Quiz Questions (question, options, explanation)
   - Parent Messages (title, content, keyPoints)
   - Bedtime Stories (title, content, moralLesson)
3. **Submit jobs to OpenAI** using the cost-effective Batch API (50% cheaper)
4. **Automatically apply translations** when jobs complete (via cron job)

---

## Prerequisites

### 1. Environment Variables

Ensure the following environment variables are set:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-your-openai-api-key

# Database URL (required)
DATABASE_URL=postgresql://user:password@host:port/database

# Optional: Custom OpenAI base URL
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
```

You can set these in a `.env` file or export them in your shell.

### 2. Database

- The database should be populated with Somali content
- The `translations` table should exist (created by migrations)
- The `batch_jobs` and `batch_job_items` tables should exist

### 3. OpenAI Account

- Valid OpenAI API key with access to the Batch API
- Sufficient credits (estimated cost: ~$4-8 for 1000 items)
- GPT-4o-mini model access

---

## Running the Script

### Option 1: Using GitHub Actions Workflow (Recommended for Production)

The easiest way to run the initial translation is through GitHub Actions:

1. Go to your GitHub repository: https://github.com/barbaarintasan-ship-it/barbaarintasan-staging2
2. Click on the **Actions** tab
3. Select **"Run Initial Translation"** from the left sidebar
4. Click **"Run workflow"** button
5. Optionally adjust the batch_size (default: 50)
6. Click the green **"Run workflow"** button

**Requirements:**
- `DATABASE_URL` secret must be set in GitHub repository settings
- `OPENAI_API_KEY` secret must be set in GitHub repository settings

**Benefits:**
- ✅ No local environment setup needed
- ✅ Runs in a clean, isolated environment
- ✅ Automatic logging and monitoring via GitHub Actions
- ✅ Can be triggered remotely from anywhere

See [docs/GITHUB_ACTIONS_TRANSLATION_GUIDE.md](docs/GITHUB_ACTIONS_TRANSLATION_GUIDE.md) for detailed instructions.

### Option 2: Using npm script (Recommended for Local Development)

```bash
npm run translate:initial
```

### Option 3: Using tsx directly

```bash
tsx scripts/run-initial-translation.ts
```

### Option 4: Make it executable and run

```bash
chmod +x scripts/run-initial-translation.ts
./scripts/run-initial-translation.ts
```

---

## What Happens When You Run It

### Step 1: Validation
The script checks for:
- ✅ OpenAI API key
- ✅ Database connection
- ✅ Required environment variables

### Step 2: Content Collection
The script scans the database for untranslated content:
- Only selects content that doesn't already have English translations
- Collects up to 50 items per content type (configurable)
- Skips any content that's already translated

### Step 3: Batch Job Creation
For each content type with untranslated content:
- Generates OpenAI batch request files (JSONL format)
- Uploads files to OpenAI
- Creates batch jobs via OpenAI Batch API
- Stores job metadata in the database

### Step 4: Output
The script outputs:
- Number of jobs created
- Job IDs for monitoring
- Instructions for next steps
- Estimated timeline

---

## Example Output

```
======================================================================
🌐 INITIAL BATCH TRANSLATION - BARBAARINTASAN ACADEMY
======================================================================

✅ Environment variables verified

📋 Translation Configuration:
   - Batch size: 50 items per content type
   - Target language: English
   - Source language: Somali

🔄 Starting comprehensive translation batch job...

[Batch Worker] Creating comprehensive translation batch jobs...
[Batch Worker] Found 45 courses for translation
[Batch Worker] Created course translation batch job: batch_abc123
[Batch Worker] Found 30 modules for translation
[Batch Worker] Created module translation batch job: batch_def456
[Batch Worker] Found 120 lessons for translation
[Batch Worker] Created lesson translation batch job: batch_ghi789
...

======================================================================
✅ SUCCESS! Translation batch jobs created.

📦 Created 6 batch job(s):
   1. Job ID: batch_abc123
   2. Job ID: batch_def456
   3. Job ID: batch_ghi789
   4. Job ID: batch_jkl012
   5. Job ID: batch_mno345
   6. Job ID: batch_pqr678

⏰ Timeline:
   - OpenAI typically processes batch jobs within 24 hours
   - Jobs are checked automatically every hour at :30 minutes
   - Translations are applied automatically when jobs complete

📊 Monitoring:
   - View all jobs: GET /api/admin/batch-jobs
   - Check job status: POST /api/admin/batch-jobs/check-all-status
   - View coverage: GET /api/admin/batch-jobs/translation-coverage
   - Or use the CLI tool: node scripts/translation-manager.js

🎉 Next Steps:
   1. Wait for OpenAI to process the batch jobs (up to 24h)
   2. Monitor job status via API or CLI tool
   3. Once complete, translations will be available via ?lang=en
   4. Test the language switcher in the UI

======================================================================
```

---

## Monitoring Job Progress

### Option 1: Use the Status Check Script (Easiest)

```bash
npm run translate:status
```

This script:
- ✅ No server or admin auth required
- ✅ Shows translation counts by content type
- ✅ Lists recent batch jobs
- ✅ Provides next steps based on current status

### Option 2: Use the Translation Manager CLI

```bash
export ADMIN_COOKIE="your-admin-session-cookie"
node scripts/translation-manager.js
```

This provides an interactive menu to:
- View all translation jobs
- Check job status
- Generate coverage reports
- View statistics

### Option 3: Use the API directly

Start the development server:
```bash
npm run dev
```

Then use curl or Postman:

```bash
# View all batch jobs
curl -X GET http://localhost:8080/api/admin/batch-jobs \
  -H "Cookie: your-admin-session"

# Check status of all pending jobs
curl -X POST http://localhost:8080/api/admin/batch-jobs/check-all-status \
  -H "Cookie: your-admin-session"

# View translation coverage report
curl -X GET http://localhost:8080/api/admin/batch-jobs/translation-coverage \
  -H "Cookie: your-admin-session"
```

### Option 4: Check the OpenAI Dashboard

1. Log in to [platform.openai.com](https://platform.openai.com)
2. Navigate to "Batch" section
3. View your batch jobs and their status

---

## Understanding Job Status

Batch jobs go through several stages:

1. **validating** - OpenAI is validating the batch request
2. **in_progress** - OpenAI is processing translations
3. **finalizing** - OpenAI is preparing results
4. **completed** - Job is done, results are being applied
5. **failed** - Job failed (check error message)
6. **cancelled** - Job was manually cancelled

---

## Automatic Processing

Once jobs are submitted, the system handles everything automatically:

### Cron Job Schedule

1. **Every hour at :30 minutes** - Status checker runs
   - Checks all pending jobs
   - Downloads completed job results
   - Applies translations to database
   - Updates job status

2. **Daily at 2:00 AM EAT** - Batch worker runs
   - Creates new translation jobs if needed
   - Processes any remaining content

### Manual Status Check

If you don't want to wait for the cron job:

```bash
curl -X POST http://localhost:8080/api/admin/batch-jobs/check-all-status
```

---

## Verification

After translations are applied (24-48 hours), verify they're working:

### 1. Check Translation Coverage

```bash
curl http://localhost:8080/api/admin/batch-jobs/translation-coverage
```

Should show high coverage percentages for all content types.

### 2. Test the API

```bash
# Get a course in English
curl http://localhost:8080/api/courses/1?lang=en

# Get lessons in English
curl http://localhost:8080/api/lessons?courseId=1&lang=en
```

### 3. Test the UI

1. Open the app in your browser
2. Look for the language switcher (🌐) in the top bar
3. Click it and select "EN" for English
4. Navigate through courses, lessons, quizzes
5. Verify content displays in English

---

## Cost Estimation

The OpenAI Batch API is very cost-effective:

### Pricing (GPT-4o-mini with Batch API)
- **Input**: ~$0.15 per 1M tokens (50% off)
- **Output**: ~$0.60 per 1M tokens (50% off)

### Example Translation Job
For 1000 content items with ~300 words each:
- **Input tokens**: ~450,000 (prompts + content)
- **Output tokens**: ~300,000 (translations)
- **Total cost**: ~$0.25 per job or ~$1.50 for all 6 content types

### Full Application Translation
For ~2000-3000 total items:
- **Estimated cost**: $3-8
- **Processing time**: 24-48 hours
- **One-time cost** (translations are cached)

---

## Troubleshooting

### "All content is already translated"

This means:
- Either you've already run the initial translation
- Or there's no content in the database
- Or the translations table already has entries

**Solution**: Check translation coverage report to see current status.

### "ERROR: OpenAI API key not found"

**Solution**: Set the `OPENAI_API_KEY` environment variable:
```bash
export OPENAI_API_KEY=sk-your-key
npm run translate:initial
```

### "ERROR: Database URL not found"

**Solution**: Set the `DATABASE_URL` environment variable:
```bash
export DATABASE_URL=postgresql://...
npm run translate:initial
```

### Jobs stuck in "validating" or "in_progress"

**This is normal!** OpenAI Batch API can take up to 24 hours.

**To check**: Run the status checker manually:
```bash
curl -X POST http://localhost:8080/api/admin/batch-jobs/check-all-status
```

### Job failed

**Solution**:
1. Check the error message in the job details
2. Common causes:
   - Invalid API key
   - Insufficient credits
   - Rate limit exceeded
   - Invalid content format
3. Fix the issue and run the script again (it will skip already-translated content)

### Translations not showing in UI

**Possible causes**:
1. Jobs haven't completed yet (check status)
2. Results haven't been applied (run status checker)
3. Frontend not requesting English (?lang=en missing)
4. Cache issue (clear browser cache)

**Solution**: Verify translations exist in database:
```sql
SELECT COUNT(*) FROM translations WHERE target_language = 'english';
```

---

## Re-running the Script

It's safe to run the script multiple times:
- ✅ Only creates jobs for untranslated content
- ✅ Skips content that's already translated
- ✅ No duplicate translations
- ✅ Idempotent (same result every time)

Use cases for re-running:
- Added new content to the database
- Previous job failed for some items
- Want to translate additional content

---

## Additional Resources

- **Bilingual System Guide**: `BILINGUAL_SYSTEM_GUIDE.md`
- **Translation Implementation**: `TRANSLATION_IMPLEMENTATION_SUMMARY.md`
- **Translation Usage Guide**: `docs/TRANSLATION_USAGE_GUIDE.md`
- **Translation Testing Guide**: `docs/TRANSLATION_TESTING_GUIDE.md`
- **Batch API README**: `server/batch-api/README.md`

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the server logs for `[Batch Worker]` and `[Batch API]` messages
3. Check OpenAI dashboard for batch job status
4. Contact the development team

---

**Last Updated**: 2026-02-15
**Version**: 1.0.0
