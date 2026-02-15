# Translation Scripts

This directory contains scripts for managing translations in the Barbaarintasan Academy application.

---

## 📜 Available Scripts

### 1. Run Initial Translation
**File**: `run-initial-translation.ts`  
**Command**: `npm run translate:initial`

Triggers a comprehensive translation batch job to populate English content for all entity types.

**Usage**:
```bash
export DATABASE_URL="postgresql://..."
export OPENAI_API_KEY="sk-..."
npm run translate:initial
```

**What it does**:
- Scans database for untranslated content
- Creates batch jobs for 6 content types
- Submits jobs to OpenAI Batch API
- Outputs job IDs and instructions

**See**: `INITIAL_TRANSLATION_GUIDE.md` for detailed instructions

---

### 2. Check Translation Status
**File**: `check-translation-status.ts`  
**Command**: `npm run translate:status`

Checks current translation coverage by querying the database directly.

**Usage**:
```bash
export DATABASE_URL="postgresql://..."
npm run translate:status
```

**What it does**:
- Shows translation counts by content type
- Lists recent batch jobs
- Provides next steps based on current state
- No API server or admin auth required

**Example Output**:
```
📈 Translation Coverage:
  Courses             : 45 items translated
  Modules             : 30 items translated
  Lessons             : 120 items translated
  ...
```

---

### 3. Test Translation Script
**File**: `test-translation-script.ts`  
**Command**: `npx tsx scripts/test-translation-script.ts`

Dry-run test that verifies script structure without connecting to database.

**Usage**:
```bash
npx tsx scripts/test-translation-script.ts
```

**What it does**:
- Verifies script structure
- Checks npm script registration
- Validates import statements
- Useful for CI/CD validation

---

### 4. Translation Manager (Pre-existing)
**File**: `translation-manager.js`  
**Command**: `node scripts/translation-manager.js`

Interactive CLI tool for translation management (requires admin authentication).

**Usage**:
```bash
export ADMIN_COOKIE="your-session-cookie"
export BASE_URL="http://localhost:8080"
node scripts/translation-manager.js
```

**Features**:
- Start translation jobs
- View job status
- Generate coverage reports
- View statistics
- Bilingual interface (Somali/English)

---

## 🚀 Quick Start

### First Time Setup
```bash
# 1. Set environment variables
export DATABASE_URL="postgresql://user:password@host:port/database"
export OPENAI_API_KEY="sk-your-openai-api-key"

# 2. Run initial translation
npm run translate:initial

# 3. Wait 24 hours for OpenAI to process

# 4. Check status
npm run translate:status
```

### Regular Monitoring
```bash
# Check translation status anytime
npm run translate:status

# Or use the interactive CLI (requires admin auth)
export ADMIN_COOKIE="your-session-cookie"
node scripts/translation-manager.js
```

---

## 📊 Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. Run Initial Translation                             │
│     npm run translate:initial                          │
│     → Creates batch jobs for all content types         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│  2. OpenAI Processes Jobs                               │
│     (Automatic, 24 hours)                              │
│     → Translates Somali → English                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│  3. Cron Job Applies Results                            │
│     (Automatic, every hour at :30)                     │
│     → Downloads results, updates database              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│  4. Check Status                                        │
│     npm run translate:status                           │
│     → Verify translations are available                │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### Script won't run
```bash
# Check if tsx is installed
npm list tsx

# If not installed
npm install

# Try running directly
npx tsx scripts/run-initial-translation.ts
```

### Environment variables not found
```bash
# Check if variables are set
echo $DATABASE_URL
echo $OPENAI_API_KEY

# Set them if missing
export DATABASE_URL="postgresql://..."
export OPENAI_API_KEY="sk-..."
```

### Jobs not completing
```bash
# This is normal - OpenAI Batch API takes up to 24 hours
# Check status periodically
npm run translate:status

# Or check manually via API
curl -X POST http://localhost:8080/api/admin/batch-jobs/check-all-status
```

---

## 📚 Documentation

- **Comprehensive Guide**: `../INITIAL_TRANSLATION_GUIDE.md`
- **Implementation Summary**: `../INITIAL_TRANSLATION_SUMMARY.md`
- **Verification Checklist**: `../VERIFICATION_CHECKLIST.md`
- **System Architecture**: `../BILINGUAL_SYSTEM_GUIDE.md`
- **Batch API Details**: `../server/batch-api/README.md`

---

## 💡 Tips

1. **Run status check first**: Before creating new jobs, check if translations already exist
2. **Be patient**: OpenAI Batch API can take up to 24 hours
3. **Use the CLI tool**: For more advanced operations, use `translation-manager.js`
4. **Monitor costs**: Each run costs approximately $3-8 for full translation
5. **Safe to re-run**: Scripts only translate content that doesn't have translations yet

---

## 🔐 Security

- ✅ Never commit API keys to git
- ✅ Store credentials in environment variables
- ✅ Use `.env` file for local development
- ✅ Scripts validate environment variables before running
- ✅ No credentials are logged or exposed

---

## 📞 Support

For issues or questions:
1. Check the documentation files listed above
2. Review server logs for `[Batch Worker]` messages
3. Use `npm run translate:status` to check current state
4. Contact the development team with error details

---

**Last Updated**: 2026-02-15  
**Version**: 1.0.0
