# Hagaha Tarjumaadda / Translation Usage Guide

## Af Soomaali / Somali

### Maxay Tahay Nidaamkan?
Nidaamkan wuxuu u shaqeeyaa tarjumaadda dhammaan content-ka Barbaarintasan Academy (Courses, Casharada, Dhambaalka Waalidka, Maaweelo, iwm) oo ah Soomaali → Ingiriisi. Waxaa la isticmaalayaa OpenAI Batch API si loo helo tarjumaad tayo sare ah oo qiime jaban.

### 1️⃣ Sidee Loo Bilaabo Tarjumaadda (How to Start Translation)

#### A. Si Tooska Ah (Manual Trigger)
Haddii aad tahay Admin, waxaad isticmaali kartaa API-ga si aad u bilowdo tarjumaadda:

```bash
# Tarjun dhammaan content types (koorsaska, casharada, dhambaalka, iwm)
curl -X POST http://localhost:8080/api/admin/batch-jobs/translation-comprehensive \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"limit": 20}'
```

**Faahfaahinta:**
- `limit`: Tirada shaybaarka ee content type kasta laga tarjumayo (default: 20)
- Nidaamku wuxuu tarjumayaa:
  - 📚 Koorsaska (Courses) - title, description, comingSoonMessage
  - 📖 Qaybaha (Modules) - title
  - 📝 Casharada (Lessons) - title, description, textContent
  - ❓ Su'aalaha (Quiz Questions) - question, options, explanation
  - 💬 Fariimaha Waalidka (Parent Messages) - title, content, keyPoints
  - 🌙 Sheekooyin (Bedtime Stories) - title, content, moralLesson

#### B. Si Otomaatig Ah (Automated Schedule)
Nidaamku wuxuu si otomaatig ah u socdaa:
- 🕑 **2:00 subaxnimo (EAT)**: Batch worker-ku wuxuu bilaabaa jobs cusub
- 🕧 **Saac walba :30dkii**: Status checker wuxuu eegayaa jobs meel mari yay

### 2️⃣ Sidee Loo Hubiyo Progress-ka (Monitoring Progress)

#### Eeg Dhammaan Jobs-yada
```bash
curl http://localhost:8080/api/admin/batch-jobs \
  -H "Cookie: your-session-cookie"
```

#### Eeg Job Gaar Ah
```bash
curl http://localhost:8080/api/admin/batch-jobs/{JOB_ID} \
  -H "Cookie: your-session-cookie"
```

#### Cusboonaysii Status-ka Dhammaan Jobs-yada
```bash
curl -X POST http://localhost:8080/api/admin/batch-jobs/check-all-status \
  -H "Cookie: your-session-cookie"
```

### 3️⃣ Warbixinta Coverage-ka (Translation Coverage Report)

#### Hel Warbixin JSON Format
```bash
curl http://localhost:8080/api/admin/batch-jobs/translation-coverage \
  -H "Cookie: your-session-cookie"
```

#### Hel Warbixin Text Format (Af Soomaali)
```bash
curl "http://localhost:8080/api/admin/batch-jobs/translation-coverage?format=text&lang=somali" \
  -H "Cookie: your-session-cookie"
```

#### Hel Warbixin Text Format (English)
```bash
curl "http://localhost:8080/api/admin/batch-jobs/translation-coverage?format=text&lang=english" \
  -H "Cookie: your-session-cookie"
```

Warbixintu waxay ku tusi doontaa:
- 📊 Guud ahaan tirada shaybaarka ee la tarjumay
- 📈 Habeynta boqolkiiba (percentage)
- 📚 Faahfaahin content type kasta
- 🔄 Jobs-yada u dambeeyay
- ❌ Khaladaadka jira hadday jiraan

### 4️⃣ Sidee Loo Isticmaalo Frontend Toggle (Language Switcher)

Isticmaaleyaasha app-ka waxay arki doonaan **Language Toggle** meel sare (top bar):
1. Guji button-ka 🌐 (Globe icon)
2. Dooro luqadda:
   - 🇸🇴 **SO** (Somali) - Asal content-ka
   - 🇬🇧 **EN** (English) - Tarjumaadda

Dhammaan bogagga waxay si otomaatig ah isu bedeli doonaan luqadda la doortay:
- ✅ Courses list & details
- ✅ Lesson content
- ✅ Quiz questions
- ✅ Parent messages (Dhambaalka Waalidka)
- ✅ Bedtime stories (Maaweelo)

### 5️⃣ Job Status-ka Fahamka (Understanding Job Statuses)

| Status | Macnaha (Meaning) |
|--------|-------------------|
| `pending` | Job waa la abuuray, sugaya OpenAI |
| `validating` | OpenAI wuxuu hubinayaa input-ka |
| `in_progress` | Tarjumaadda waa socoto |
| `finalizing` | OpenAI wuxuu dhamaynayaa |
| `completed` | Tarjumaaddu waa dhammaatay, natiijooyinku waa lagu daray database |
| `failed` | Khalad ayaa dhacay |
| `cancelled` | Job waa la joojiyay |

### 6️⃣ Troubleshooting (Xalinta Dhibaatooyinka)

#### Haddii Tarjumaadda Aysan Muuqan
1. Hubi in job-ku dhamaaday: `GET /api/admin/batch-jobs`
2. Eeg status-ka job-ka
3. Haddii weli "in_progress" yahay, sug ilaa 24 saacadood
4. Hubi in OpenAI API key-ga uu shaqeynayo

#### Haddii Job-ku Fashilmay (Failed)
1. Eeg error message: `GET /api/admin/batch-jobs/{JOB_ID}`
2. Hubi OpenAI API key
3. Hubi internet connection
4. Isku day mar kale: samee job cusub

#### Haddii Content Aysan Tarjumanayn
1. Hubi in content-ku jiro database-ka
2. Eeg in tarjumaadda horey loo samayn
3. Abuura job cusub oo keliya contentkan ku jiro

---

## English

### What is This System?
This system automatically translates all Barbaarintasan Academy content (Courses, Lessons, Parent Messages, Bedtime Stories, etc.) from Somali → English using OpenAI Batch API for high-quality, cost-efficient translations.

### 1️⃣ How to Start Translation

#### A. Manual Trigger
If you're an Admin, use the API to start translation:

```bash
# Translate all content types (courses, lessons, messages, etc.)
curl -X POST http://localhost:8080/api/admin/batch-jobs/translation-comprehensive \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"limit": 20}'
```

**Parameters:**
- `limit`: Number of items per content type to translate (default: 20)
- The system translates:
  - 📚 Courses - title, description, comingSoonMessage
  - 📖 Modules - title
  - 📝 Lessons - title, description, textContent
  - ❓ Quiz Questions - question, options, explanation
  - 💬 Parent Messages - title, content, keyPoints
  - 🌙 Bedtime Stories - title, content, moralLesson

#### B. Automated Schedule
The system runs automatically:
- 🕑 **2:00 AM (EAT)**: Batch worker creates new jobs
- 🕧 **Every hour at :30**: Status checker processes completed jobs

### 2️⃣ Monitoring Progress

#### View All Jobs
```bash
curl http://localhost:8080/api/admin/batch-jobs \
  -H "Cookie: your-session-cookie"
```

#### View Specific Job
```bash
curl http://localhost:8080/api/admin/batch-jobs/{JOB_ID} \
  -H "Cookie: your-session-cookie"
```

#### Update All Job Statuses
```bash
curl -X POST http://localhost:8080/api/admin/batch-jobs/check-all-status \
  -H "Cookie: your-session-cookie"
```

### 3️⃣ Translation Coverage Report

#### Get JSON Report
```bash
curl http://localhost:8080/api/admin/batch-jobs/translation-coverage \
  -H "Cookie: your-session-cookie"
```

#### Get Text Report (Somali)
```bash
curl "http://localhost:8080/api/admin/batch-jobs/translation-coverage?format=text&lang=somali" \
  -H "Cookie: your-session-cookie"
```

#### Get Text Report (English)
```bash
curl "http://localhost:8080/api/admin/batch-jobs/translation-coverage?format=text&lang=english" \
  -H "Cookie: your-session-cookie"
```

The report shows:
- 📊 Total items translated
- 📈 Coverage percentage
- 📚 Breakdown by content type
- 🔄 Recent jobs
- ❌ Failed items if any

### 4️⃣ Using Frontend Language Toggle

Users will see a **Language Toggle** in the top bar:
1. Click the 🌐 (Globe icon) button
2. Select language:
   - 🇸🇴 **SO** (Somali) - Original content
   - 🇬🇧 **EN** (English) - Translations

All pages will automatically switch to the selected language:
- ✅ Courses list & details
- ✅ Lesson content
- ✅ Quiz questions
- ✅ Parent messages (Dhambaalka Waalidka)
- ✅ Bedtime stories (Maaweelo)

### 5️⃣ Understanding Job Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Job created, waiting for OpenAI |
| `validating` | OpenAI is validating input |
| `in_progress` | Translation in progress |
| `finalizing` | OpenAI is finalizing |
| `completed` | Translation done, results applied to database |
| `failed` | An error occurred |
| `cancelled` | Job was cancelled |

### 6️⃣ Troubleshooting

#### If Translations Don't Appear
1. Check if job completed: `GET /api/admin/batch-jobs`
2. View job status
3. If still "in_progress", wait up to 24 hours
4. Verify OpenAI API key is working

#### If Job Failed
1. Check error message: `GET /api/admin/batch-jobs/{JOB_ID}`
2. Verify OpenAI API key
3. Check internet connection
4. Try again: create a new job

#### If Content Not Translating
1. Verify content exists in database
2. Check if already translated
3. Create new job for specific content

---

## 🔧 Advanced Configuration

### Weekly Batch Schedule (Optional)

To schedule automatic weekly translations for new content, you can modify the cron schedule in `server/cron.ts`:

```typescript
// Add weekly comprehensive translation (every Sunday at 3 AM EAT)
cron.schedule('0 3 * * 0', async () => {
  console.log('[CRON] Running weekly comprehensive translation...');
  await createComprehensiveTranslationBatchJob(50);
}, {
  timezone: "Africa/Mogadishu"
});
```

### Environment Variables

Required environment variables:
```bash
# OpenAI API Key
AI_INTEGRATIONS_OPENAI_API_KEY=sk-xxx
# or
OPENAI_API_KEY=sk-xxx

# Database
DATABASE_URL=postgresql://...

# Disable staging mode to enable cron
STAGING=false
```

### Cost Optimization

- **Batch API**: 50% cheaper than regular OpenAI API
- **Smart filtering**: Only translates new content (no duplicates)
- **Caching**: Translations stored in database (no re-translation)
- **Concurrent limit**: Maximum 3 jobs to control costs

### Translation Quality

To improve translation quality:
1. Ensure source content is well-written in Somali
2. Use proper punctuation and formatting
3. Break long content into smaller sections
4. Review translated content and provide feedback

---

## 📞 Support

For questions or issues:
- Check the logs: `[Batch API]` and `[Batch Worker]` tags
- Review job status and error messages
- Contact development team for assistance

**Status**: ✅ Production Ready  
**Last Updated**: 2026-02-15  
**Version**: 1.0.0
