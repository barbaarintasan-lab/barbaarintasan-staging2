# Translation System Testing Guide
# Hagaha Tijaabaadda Nidaamka Tarjumaadda

## Pre-Testing Setup / Diyaarinta Tijaabaadda

### 1. Environment Variables
Ensure these are configured:
```bash
# OpenAI API Key
AI_INTEGRATIONS_OPENAI_API_KEY=sk-xxx
# or
OPENAI_API_KEY=sk-xxx

# Database connection
DATABASE_URL=postgresql://...

# Disable staging mode for cron jobs
STAGING=false
```

### 2. Database Schema
Verify tables exist:
```bash
# Check translations table
psql $DATABASE_URL -c "SELECT COUNT(*) FROM translations;"

# Check batch_jobs table
psql $DATABASE_URL -c "SELECT COUNT(*) FROM batch_jobs;"
```

---

## Testing Checklist / Liiska Tijaabaadda

### ✅ Phase 1: Backend API Testing

#### Test 1.1: Create Comprehensive Translation Job
```bash
# Start a small batch translation (5 items per type)
curl -X POST http://localhost:8080/api/admin/batch-jobs/translation-comprehensive \
  -H "Content-Type: application/json" \
  -H "Cookie: your-admin-session" \
  -d '{"limit": 5}'
```

**Expected Result / Natiijada la Filayo:**
- ✅ Response includes `jobIds` array
- ✅ Response shows `count` of jobs created
- ✅ Success message appears

**Verify / Hubi:**
```bash
# Check jobs were created
curl http://localhost:8080/api/admin/batch-jobs \
  -H "Cookie: your-admin-session"
```

---

#### Test 1.2: Monitor Job Status
```bash
# Get specific job details
curl http://localhost:8080/api/admin/batch-jobs/{JOB_ID} \
  -H "Cookie: your-admin-session"
```

**Expected Result:**
- ✅ Job status: `pending`, `validating`, `in_progress`, `finalizing`, or `completed`
- ✅ Progress counters: `completedCount` / `requestCount`
- ✅ OpenAI batch ID present

**Check Progression:**
```bash
# Update all job statuses (triggers OpenAI API check)
curl -X POST http://localhost:8080/api/admin/batch-jobs/check-all-status \
  -H "Cookie: your-admin-session"

# Wait 5-10 minutes and check again
# Repeat until status is 'completed'
```

---

#### Test 1.3: Verify Translations in Database
```bash
# Check translations were stored
psql $DATABASE_URL -c "
  SELECT 
    entity_type, 
    COUNT(*) as count,
    target_language
  FROM translations 
  WHERE target_language = 'english'
  GROUP BY entity_type, target_language;
"
```

**Expected Result:**
- ✅ Rows exist for each entity type (course, lesson, etc.)
- ✅ Count matches or exceeds items in batch job

---

#### Test 1.4: Translation Coverage Report
```bash
# Generate JSON report
curl http://localhost:8080/api/admin/batch-jobs/translation-coverage \
  -H "Cookie: your-admin-session"

# Generate text report (Somali)
curl "http://localhost:8080/api/admin/batch-jobs/translation-coverage?format=text&lang=somali" \
  -H "Cookie: your-admin-session"

# Generate text report (English)
curl "http://localhost:8080/api/admin/batch-jobs/translation-coverage?format=text&lang=english" \
  -H "Cookie: your-admin-session"
```

**Expected Result:**
- ✅ Report shows overall coverage percentage
- ✅ Breakdown by content type appears
- ✅ Recent jobs are listed
- ✅ Text format is human-readable

---

### ✅ Phase 2: Frontend Language Switcher Testing

#### Test 2.1: Verify Language Switcher Exists
1. Open app in browser: `http://localhost:5000`
2. Look for 🌐 globe icon in top bar
3. Click the icon

**Expected Result:**
- ✅ Dropdown menu appears
- ✅ Two options visible: 🇸🇴 Somali and 🇬🇧 English
- ✅ Current language is highlighted

---

#### Test 2.2: Switch to English
1. Click language switcher
2. Select 🇬🇧 English
3. Observe page content

**Expected Result:**
- ✅ Language code changes to "EN" in button
- ✅ Page content updates automatically
- ✅ Courses show English titles/descriptions (if translated)
- ✅ UI text changes to English

**Check Network Requests:**
- Open browser DevTools → Network tab
- Look for API calls with `?lang=en` parameter
- Example: `/api/courses?lang=en`

---

#### Test 2.3: Verify Content on Each Page Type

Navigate to each page type and verify translations appear:

##### Courses Page (`/courses`)
```bash
# API call that should happen
curl "http://localhost:8080/api/courses?lang=en"
```
- ✅ Course titles in English
- ✅ Course descriptions in English
- ✅ "Coming Soon" messages in English

##### Course Detail Page (`/courses/{id}`)
```bash
curl "http://localhost:8080/api/courses/{id}?lang=en"
curl "http://localhost:8080/api/lessons?courseId={id}&lang=en"
```
- ✅ Course title in English
- ✅ Module titles in English
- ✅ Lesson titles in English

##### Lesson View (`/lesson/{id}`)
```bash
curl "http://localhost:8080/api/lessons/{id}?lang=en"
```
- ✅ Lesson title in English
- ✅ Lesson description in English
- ✅ Lesson text content in English

##### Quiz Page (`/quiz/{id}`)
```bash
curl "http://localhost:8080/api/quiz/{id}?lang=en"
```
- ✅ Quiz questions in English
- ✅ Answer options in English
- ✅ Explanations in English

##### Dhambaal (Parent Messages) Page (`/dhambaal`)
```bash
curl "http://localhost:8080/api/parent-messages?lang=en"
curl "http://localhost:8080/api/parent-messages/today?lang=en"
```
- ✅ Message titles in English
- ✅ Message content in English
- ✅ Key points in English

##### Maaweelo (Bedtime Stories) Page (`/maaweelo`)
```bash
curl "http://localhost:8080/api/bedtime-stories?lang=en"
curl "http://localhost:8080/api/bedtime-stories/today?lang=en"
```
- ✅ Story titles in English
- ✅ Story content in English
- ✅ Moral lessons in English

---

#### Test 2.4: Switch Back to Somali
1. Click language switcher
2. Select 🇸🇴 Somali
3. Observe page content

**Expected Result:**
- ✅ Language code changes to "SO"
- ✅ Original Somali content appears
- ✅ All content reverts to Somali

---

#### Test 2.5: Language Persistence
1. Switch to English
2. Navigate to different pages
3. Close browser
4. Open app again

**Expected Result:**
- ✅ Language preference is saved in localStorage
- ✅ App opens in last selected language
- ✅ Language persists across page navigation

---

### ✅ Phase 3: Translation Quality Testing

#### Test 3.1: Verify Translation Accuracy
1. Select a course with English translation
2. Compare Somali and English versions
3. Check for:
   - ✅ Accurate meaning preserved
   - ✅ Educational tone maintained
   - ✅ No untranslated text (no Somali words in English version)
   - ✅ Proper grammar and punctuation

#### Test 3.2: Check Special Characters
- ✅ Somali special characters (ḥ, č, etc.) handled correctly in source
- ✅ English output has proper formatting
- ✅ No encoding issues (weird symbols)

#### Test 3.3: Verify Completeness
For each translated item:
- ✅ All fields are translated (title, description, content)
- ✅ No partial translations
- ✅ No missing content

---

### ✅ Phase 4: Fallback Behavior Testing

#### Test 4.1: Untranslated Content
1. Switch to English
2. Navigate to content without translation
3. Observe behavior

**Expected Result:**
- ✅ Original Somali content is shown (fallback)
- ✅ No error messages
- ✅ Page still functions normally

#### Test 4.2: Mixed Content
1. Navigate to page with some translated items and some untranslated
2. Observe behavior

**Expected Result:**
- ✅ Translated items show in English
- ✅ Untranslated items show in Somali
- ✅ No visual glitches or errors

---

### ✅ Phase 5: Performance Testing

#### Test 5.1: Load Time
1. Clear browser cache
2. Switch to English
3. Measure page load times

**Expected Result:**
- ✅ Load times similar to Somali version
- ✅ No significant delays
- ✅ Translations load in single request

#### Test 5.2: API Response Times
```bash
# Time API calls
time curl "http://localhost:8080/api/courses?lang=en"
time curl "http://localhost:8080/api/lessons/123?lang=en"
```

**Expected Result:**
- ✅ Response times < 500ms for most calls
- ✅ No timeout errors
- ✅ Consistent performance

---

### ✅ Phase 6: Error Handling Testing

#### Test 6.1: Failed Translation Job
1. Temporarily set invalid OpenAI API key
2. Try to create translation job
3. Observe error handling

**Expected Result:**
- ✅ Job status changes to `failed`
- ✅ Error message is logged
- ✅ Admin can view error details
- ✅ System continues to function

#### Test 6.2: Network Errors
1. Disconnect from internet
2. Try to check job status
3. Observe behavior

**Expected Result:**
- ✅ Graceful error message
- ✅ No crashes
- ✅ Can retry when connection restored

---

### ✅ Phase 7: Automated Schedule Testing

#### Test 7.1: Cron Job Execution
```bash
# Check if cron jobs are configured
grep -A 5 "batch" server/cron.ts

# Check cron job logs (if running)
# Look for "[CRON]" and "[Batch Worker]" messages in logs
```

**Expected Result:**
- ✅ Cron jobs are scheduled
- ✅ Jobs run at specified times (2 AM, every hour :30)
- ✅ Logs show execution

#### Test 7.2: Manual Trigger of Automated Flow
```bash
# Simulate what cron job does
node -e "
  const worker = require('./server/batch-api/worker');
  worker.runBatchWorker().then(() => console.log('Done'));
"
```

**Expected Result:**
- ✅ Worker checks existing jobs
- ✅ Creates new jobs if capacity available
- ✅ Processes completed jobs

---

## Testing with CLI Tool / Tijaabaadda CLI Tool-ka

### Test 8.1: Run Translation Manager
```bash
# Set admin cookie
export ADMIN_COOKIE="your-session-cookie"

# Run CLI tool
node scripts/translation-manager.js
```

**Test Each Menu Option:**
1. ✅ Start comprehensive translation
2. ✅ View all jobs
3. ✅ Check job status by ID
4. ✅ Update all statuses
5. ✅ Generate JSON report
6. ✅ Generate Somali text report
7. ✅ Generate English text report
8. ✅ View statistics

---

## Troubleshooting / Xalinta Dhibaatooyinka

### Issue: Translations Not Appearing
**Debug Steps:**
1. Check database: `SELECT COUNT(*) FROM translations WHERE target_language = 'english'`
2. Check job status: `curl /api/admin/batch-jobs/{JOB_ID}`
3. Check API response: `curl /api/courses?lang=en` (look for translation fields)
4. Check browser console for errors

### Issue: Job Stuck in "in_progress"
**Debug Steps:**
1. Manually check status: `POST /api/admin/batch-jobs/{id}/check-status`
2. Check OpenAI dashboard for batch job
3. Wait up to 24 hours for completion
4. If > 24 hours, job may have failed

### Issue: Language Switcher Not Working
**Debug Steps:**
1. Check browser console for errors
2. Verify i18n is initialized
3. Check localStorage for language preference
4. Verify TopBar component is rendered

---

## Success Criteria / Shuruudaha Guusha

The system is working correctly when:

- ✅ All comprehensive translation jobs complete successfully
- ✅ Translation coverage report shows expected percentages
- ✅ Language switcher appears and functions on all pages
- ✅ Content displays in selected language across all page types
- ✅ Untranslated content gracefully falls back to Somali
- ✅ Language preference persists across sessions
- ✅ API calls include `lang` parameter when English selected
- ✅ CLI tool successfully manages translations
- ✅ No console errors or warnings
- ✅ Performance remains acceptable

---

## Reporting Issues / Soo Sheegista Cilladaha

When reporting issues, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Job IDs if related to translation jobs
4. Console errors if any
5. Browser and version
6. API response samples

---

**Testing Status**: Ready for QA  
**Last Updated**: 2026-02-15  
**Version**: 1.0.0
