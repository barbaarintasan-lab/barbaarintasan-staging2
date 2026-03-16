# GitHub Actions Workflow Guide - Initial Translation

This document explains how to use the GitHub Actions workflow to run the initial batch translation for Barbaarintasan Academy.

## Overview

The "Run Initial Translation" workflow automates the process of creating batch translation jobs to translate Somali content to English using OpenAI's Batch API. This workflow can be manually triggered from the GitHub Actions tab.

## Prerequisites

Before running the workflow, ensure the following secrets are configured in your GitHub repository:

### Required Secrets

1. **DATABASE_URL**
   - Description: PostgreSQL connection string
   - Format: `postgres://[user]:[password]@[host]:5432/[database]`
   - Example: `postgres://admin:password123@db.example.com:5432/barbaarintasan`

2. **OPENAI_API_KEY**
   - Description: OpenAI API key with Batch API access
   - Format: `sk-[your-openai-key]`
   - Example: `sk-proj-abc123xyz456...`

### Setting Up Secrets

To add secrets to your repository:

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add `DATABASE_URL` with your database connection string
5. Add `OPENAI_API_KEY` with your OpenAI API key
6. Click **Add secret**

## Running the Workflow

### Step 1: Navigate to Actions Tab

1. Go to your GitHub repository: https://github.com/barbaarintasan-ship-it/barbaarintasan-staging2
2. Click on the **Actions** tab at the top of the page

### Step 2: Select the Workflow

1. In the left sidebar, find and click on **"Run Initial Translation"**
2. You should see the workflow details page

### Step 3: Trigger the Workflow

1. Click the **"Run workflow"** button (gray button on the right side)
2. A dropdown will appear with the following option:
   - **batch_size**: Number of items per content type to translate (default: 50)
3. You can leave the default value or enter a custom number
4. Click the green **"Run workflow"** button to start the workflow

### Step 4: Monitor Progress

1. The workflow will appear in the list with a yellow status (⚫ in progress)
2. Click on the workflow run to see detailed logs
3. The workflow typically completes in 2-5 minutes
4. When complete, it will show a green checkmark (✅) or red X (❌) if failed

### Step 5: Wait for Translation Jobs

1. The workflow submits batch jobs to OpenAI
2. **OpenAI typically processes batch jobs within 24 hours**
3. Check the workflow logs for job IDs
4. Jobs are automatically monitored and applied by the system

## What the Workflow Does

The workflow performs the following steps:

1. **Checkout Repository**: Downloads the latest code
2. **Setup Node.js**: Installs Node.js 20 and caches npm dependencies
3. **Install Dependencies**: Runs `npm ci` to install all required packages
4. **Run Translation Script**: Executes `npm run translate:initial` which:
   - Validates environment variables
   - Scans the database for untranslated content
   - Creates batch translation jobs for each content type:
     - 📚 Courses (title, description, comingSoonMessage)
     - 📖 Modules (title)
     - 📝 Lessons (title, description, textContent)
     - ❓ Quiz Questions (question, options, explanation)
     - 👨‍👩‍👧 Parent Messages (title, content, keyPoints)
     - 🌙 Bedtime Stories (title, content, moralLesson)
   - Submits jobs to OpenAI Batch API
   - Outputs job IDs for monitoring
5. **Generate Summary**: Creates a summary with next steps and troubleshooting tips

## Monitoring Translation Jobs

After the workflow completes, translation jobs are submitted to OpenAI. To monitor their progress:

### Option 1: Check Translation Status (Recommended)

```bash
npm run translate:status
```

This shows:
- Translation counts by content type
- Recent batch jobs and their status
- Next steps based on current status

### Option 2: Use the API

```bash
# Check all job statuses
curl -X POST http://localhost:8080/api/admin/batch-jobs/check-all-status \
  -H "Cookie: your-admin-session"

# View translation coverage
curl -X GET http://localhost:8080/api/admin/batch-jobs/translation-coverage \
  -H "Cookie: your-admin-session"
```

### Option 3: OpenAI Dashboard

1. Log in to [platform.openai.com](https://platform.openai.com)
2. Navigate to **Batch** section
3. View your batch jobs and their status

## Timeline

- **Workflow execution**: 2-5 minutes
- **OpenAI processing**: Up to 24 hours
- **Automatic application**: Within 1 hour of job completion
- **Total time**: 24-48 hours from workflow start to translations available

## Workflow Output

The workflow provides a detailed summary including:

### Success Output

```
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
```

### Already Translated Output

```
✨ All content is already translated!
   No new translation jobs were needed.
```

## Troubleshooting

### Workflow Fails with "OpenAI API key not found"

**Cause**: The `OPENAI_API_KEY` secret is not set or is invalid.

**Solution**:
1. Go to Settings → Secrets and variables → Actions
2. Verify `OPENAI_API_KEY` is set
3. Ensure the key starts with `sk-` and is valid
4. Re-run the workflow

### Workflow Fails with "Database URL not found"

**Cause**: The `DATABASE_URL` secret is not set or is invalid.

**Solution**:
1. Go to Settings → Secrets and variables → Actions
2. Verify `DATABASE_URL` is set
3. Ensure the format is correct: `postgres://user:password@host:5432/database`
4. Test the connection from your local environment
5. Re-run the workflow

### Workflow Completes but No Jobs Created

**Cause**: All content is already translated.

**Solution**:
1. Run `npm run translate:status` to check current translation coverage
2. If coverage is 100%, no new jobs are needed
3. If coverage is low, check database for Somali content
4. Verify the `translations` table exists

### OpenAI Batch Jobs Stuck in "validating" or "in_progress"

**Cause**: This is normal! OpenAI Batch API can take up to 24 hours.

**Solution**:
1. Wait for OpenAI to process the jobs
2. Check status periodically with `npm run translate:status`
3. Jobs are automatically monitored and applied

### Workflow Times Out (30 minutes)

**Cause**: The script is taking too long, possibly due to database issues.

**Solution**:
1. Check database connectivity
2. Verify database has content
3. Check server logs for detailed errors
4. Consider reducing batch_size parameter

## Cost Estimation

Using OpenAI's Batch API (GPT-4o-mini):

- **Batch API discount**: 50% off regular pricing
- **Input**: ~$0.15 per 1M tokens
- **Output**: ~$0.60 per 1M tokens

For typical Barbaarintasan content (2000-3000 items):
- **Estimated cost**: $3-8
- **Processing time**: 24-48 hours
- **One-time cost** (translations are cached)

## Re-running the Workflow

It's safe to run the workflow multiple times:
- ✅ Only creates jobs for untranslated content
- ✅ Skips content that's already translated
- ✅ No duplicate translations
- ✅ Idempotent (same result every time)

Use cases for re-running:
- Added new content to the database
- Previous job failed for some items
- Want to translate additional content

## Next Steps After Completion

Once translations are complete (24-48 hours):

1. **Verify translations are applied**:
   ```bash
   npm run translate:status
   ```

2. **Test the API**:
   ```bash
   curl http://localhost:8080/api/courses/1?lang=en
   ```

3. **Test the UI**:
   - Open the app in your browser
   - Click the language switcher (🌐)
   - Select "EN" for English
   - Navigate through courses, lessons, quizzes
   - Verify content displays in English

## Related Documentation

- **Initial Translation Guide**: [INITIAL_TRANSLATION_GUIDE.md](../INITIAL_TRANSLATION_GUIDE.md)
- **Batch API Quick Start**: [docs/BATCH_API_QUICK_START.md](BATCH_API_QUICK_START.md)
- **Translation Usage Guide**: [docs/TRANSLATION_USAGE_GUIDE.md](TRANSLATION_USAGE_GUIDE.md)
- **Translation Testing Guide**: [docs/TRANSLATION_TESTING_GUIDE.md](TRANSLATION_TESTING_GUIDE.md)
- **Bilingual System Guide**: [BILINGUAL_SYSTEM_GUIDE.md](../BILINGUAL_SYSTEM_GUIDE.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the workflow logs in GitHub Actions
3. Check server logs for `[Batch Worker]` and `[Batch API]` messages
4. Verify secrets are correctly set
5. Contact the development team

---

**Last Updated**: 2026-02-15  
**Workflow Version**: 1.0.0
