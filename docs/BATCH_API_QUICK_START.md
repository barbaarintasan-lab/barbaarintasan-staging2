# OpenAI Batch API - Quick Start Guide

## Overview

Barbaarintasan Academy ka kor u qaadida nidaamka OpenAI Batch API waxay ku xiran tahay qaab ay ugu shaqaysaan translation, summary generation, iyo quiz improvements.

## Sida loo Isticmaalo

### 1. Fayl Haynta (Database Setup)

Nidaamku si otomaatig ah ayuu u abuuri doonaa tables-ka:
- `batch_jobs` - Shaqooyinka weyn ee batch
- `batch_job_items` - Items gaar ah oo ku jira batch-ka

Markii database-ka la cusbooneysiiyo, si otomaatig ah tables-kan ayaa la abuurayaa.

### 2. Hawlaha Otomaatigga ah (Automated Processing)

Nidaamku wuxuu si otomaatig ah u shaqeynayaa habeenkii:

**Waqtiga 2:00 AM (East Africa Time)**
- Batch worker wuxuu bilaabaayaa
- Wuxuu aruuriyaa casharrada cusub
- Wuxuu abuuraayaa translation jobs (Soomaali → English → Arabic)
- Wuxuu xaddidayaa 3 shaqo oo isku mar socda si loo maareyo kharashka

**Saacadkii mid (mintada 30)**
- Nidaamku wuxuu hubinayaa heerka shaqooyinka batch
- Markii shaqadu dhammaato, natiijooyinka waa la soo ganacsadaa
- Si otomaatig ah waxaa loo cusboonaysiinayaa database-ka

### 3. Manual Triggering (Admin)

Admins waxay awood u leeyihiin inay si gacanta ah u bilowdaan shaqooyin:

#### Abuuro Translation Job

```bash
POST /api/admin/batch-jobs/translation
{
  "limit": 20  # Tirada casharrada loo dooranyahay
}
```

#### Abuuro Summary Job

```bash
POST /api/admin/batch-jobs/summary
{
  "limit": 20
}
```

#### Abuuro Quiz Improvement Job

```bash
POST /api/admin/batch-jobs/quiz-improvement
{
  "limit": 20
}
```

### 4. Viewing Job Status

#### Eeg dhammaan shaqooyinka

```bash
GET /api/admin/batch-jobs
```

Response:
```json
[
  {
    "id": "job-uuid",
    "type": "translation",
    "status": "processing",
    "totalRequests": 40,
    "completedRequests": 25,
    "failedRequests": 0,
    "createdAt": "2026-02-15T02:00:00Z"
  }
]
```

#### Eeg shaqo gaar ah

```bash
GET /api/admin/batch-jobs/{job-id}
```

### 5. Manual Status Check

Haddii aad rabto inaad hubiso status-ka shaqo gaar ah:

```bash
POST /api/admin/batch-jobs/{job-id}/check-status
```

### 6. Cancelling a Job

Haddii aad rabto inaad joojiso shaqo:

```bash
POST /api/admin/batch-jobs/{job-id}/cancel
```

### 7. View Statistics

Eeg tirada guud ee shaqooyinka iyo natiijooyinka:

```bash
GET /api/admin/batch-jobs/stats
```

Response:
```json
[
  {
    "status": "completed",
    "type": "translation",
    "count": 5,
    "total_requests": 200,
    "completed_requests": 198,
    "failed_requests": 2
  }
]
```

## Fahamka Status-yada

- **pending**: Shaqadu way sugaysaa in OpenAI uu bilaabo
- **processing**: OpenAI wuxuu hadda ka shaqaynayaa
- **completed**: Shaqadu way dhammaatay, natiijooyinkana waa la helay
- **failed**: Shaqadu way fashilantay
- **cancelled**: Shaqadu waa la joojiyay

## Sida Shaqooyinku u Shaqeeyaan

### Translation Jobs

1. Nidaamku wuxuu aruuriyaa casharrada (title, description, textContent)
2. Wuxuu abuuraayaa turjumaad requests:
   - Soomaali → English
   - Soomaali → Arabic
3. Wuxuu abuuraa JSONL file oo leh dhammaan requests-ka
4. Wuxuu u soo diraa OpenAI Batch API
5. Marka dhammaato, turjumaadyadu waa la keenaa

### Summary Jobs

1. Nidaamku wuxuu qaadaa content-ka casharrada
2. Wuxuu u diraa OpenAI si uu u sameeyo:
   - Soo koob gaaban (2-3 sentences)
   - Saddex ujeeddooyin waxbarasho (learning objectives)
3. Natiijooyinka JSON-formatted waa la keenaa

### Quiz Improvement Jobs

1. Nidaamku wuxuu aruuriyaa su'aalaha quiz-ka
2. Wuxuu u diraa OpenAI si uu u sameeyo:
   - Su'aasha oo la hagaajiyay
   - Ikhtiyaarada oo la hagaajiyay
   - Sharaxaad cusub
3. Su'aalaha cusub waa la cusboonaysiinayaa database-ka

## Troubleshooting

### Shaqadu ma socoto

1. Hubi STAGING=false si cron jobs-ku u shaqeeyaan
2. Hubi OpenAI API key inuu jiro (.env file)
3. Eeg server logs: `[Batch API]` iyo `[Batch Worker]`

### OpenAI API Key Issues

Hubi mid ka mid ah kuwan jira .env file:
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `OPENAI_API_KEY`

### Database Connection Issues

Hubi `DATABASE_URL` inuu sax yahay oo database-ku shaqaynayo.

## Cost Optimization

- Batch API wuxuu keenayaa 50% discount marka la barbardhigo regular API
- Gpt-4o-mini model ayaa loo isticmaalaa cost efficiency
- 3 shaqo oo keliya ayaa isku mar la oggolaanyahay
- Shaqooyinku waxay socdan habeenkii si ay ugu yaraadaan traffic-ka

## Support & Logs

Dhammaan shaqooyinka batch waxay qoraan logs tagged with:
- `[Batch API]` - Service operations
- `[Batch Worker]` - Background worker operations
- `[CRON]` - Scheduled job execution

Eeg server console ama log files si aad u aragto waxa dhacaya.

## Next Steps

1. Abuuro Admin UI dashboard si aad u aragto batch jobs visually
2. Ku dar email notifications marka shaqo dhammaato
3. Samee automated reports weekly basis-ka
4. Ku dar support for additional languages

---

**Faahfaahin dheeraad ah**: Eeg `server/batch-api/README.md` for technical details.
