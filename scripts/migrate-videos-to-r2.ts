import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { neon } from '@neondatabase/serverless';

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

const R2_BUCKET = 'barbaarintasan-dhambaal';
const R2_PUBLIC_URL = 'https://pub-449d3a9b2aea4f7eabbbaecddd5424a3.r2.dev';
const VIDEO_FOLDER = 'course-videos';

function getR2Client(): S3Client {
  if (!CLOUDFLARE_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED' as any,
    responseChecksumValidation: 'WHEN_REQUIRED' as any,
  });
}

function extractGoogleDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function sanitizeTitle(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 60);
}

async function downloadFromGoogleDrive(fileId: string): Promise<Buffer> {
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;

  console.log(`  Downloading from Google Drive: ${fileId}`);

  const response = await fetch(downloadUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    const html = await response.text();

    const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
    const uuidMatch = html.match(/uuid=([a-zA-Z0-9_-]+)/);

    if (confirmMatch || uuidMatch) {
      let confirmUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      if (uuidMatch) {
        confirmUrl += `&uuid=${uuidMatch[1]}`;
      }

      console.log(`  Retrying with virus scan bypass...`);
      const retryResponse = await fetch(confirmUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!retryResponse.ok) {
        throw new Error(`Retry failed: HTTP ${retryResponse.status}`);
      }

      const retryContentType = retryResponse.headers.get('content-type') || '';
      if (retryContentType.includes('text/html')) {
        const formMatch = html.match(/action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/);
        if (formMatch) {
          let formUrl = formMatch[1].replace(/&amp;/g, '&');
          console.log(`  Using form-based download...`);
          const formResponse = await fetch(formUrl, {
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          if (!formResponse.ok) {
            throw new Error(`Form download failed: HTTP ${formResponse.status}`);
          }
          const arrayBuffer = await formResponse.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
        throw new Error('Could not bypass virus scan warning');
      }

      const arrayBuffer = await retryResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw new Error('Got HTML page instead of video file');
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function checkExistsInR2(client: S3Client, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToR2(client: S3Client, buffer: Buffer, key: string): Promise<string> {
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'video/mp4',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  console.log('=== Video Migration: Google Drive → Cloudflare R2 ===\n');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }

  const sql = neon(process.env.DATABASE_URL);
  const r2Client = getR2Client();

  const lessons = await sql`
    SELECT id, title, video_url, course_id 
    FROM lessons 
    WHERE video_url IS NOT NULL 
    AND video_url != '' 
    AND video_url LIKE '%drive.google.com%'
    ORDER BY course_id, "order"
  `;

  console.log(`Found ${lessons.length} lessons with Google Drive videos\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors: { id: string; title: string; error: string }[] = [];

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const fileId = extractGoogleDriveFileId(lesson.video_url);

    if (!fileId) {
      console.log(`[${i + 1}/${lessons.length}] ⚠ Could not extract file ID: ${lesson.title}`);
      errorCount++;
      errors.push({ id: lesson.id, title: lesson.title, error: 'Could not extract file ID' });
      continue;
    }

    const r2Key = `${VIDEO_FOLDER}/${lesson.id}.mp4`;

    const exists = await checkExistsInR2(r2Client, r2Key);
    if (exists) {
      const r2Url = `${R2_PUBLIC_URL}/${r2Key}`;
      console.log(`[${i + 1}/${lessons.length}] ⏭ Already in R2, updating DB: ${lesson.title}`);
      await sql`UPDATE lessons SET video_url = ${r2Url} WHERE id = ${lesson.id}`;
      skipCount++;
      continue;
    }

    try {
      console.log(`[${i + 1}/${lessons.length}] 📥 ${lesson.title}`);

      const videoBuffer = await downloadFromGoogleDrive(fileId);
      console.log(`  Downloaded: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);

      if (videoBuffer.length < 10000) {
        console.log(`  ⚠ File too small (${videoBuffer.length} bytes), might not be a video`);
        errorCount++;
        errors.push({ id: lesson.id, title: lesson.title, error: `File too small: ${videoBuffer.length} bytes` });
        continue;
      }

      console.log(`  📤 Uploading to R2...`);
      const r2Url = await uploadToR2(r2Client, videoBuffer, r2Key);
      console.log(`  ✅ Uploaded: ${r2Url}`);

      await sql`UPDATE lessons SET video_url = ${r2Url} WHERE id = ${lesson.id}`;
      console.log(`  📝 Database updated\n`);

      successCount++;

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}\n`);
      errorCount++;
      errors.push({ id: lesson.id, title: lesson.title, error: error.message });
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Total: ${lessons.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Skipped (already in R2): ${skipCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\nFailed lessons:');
    errors.forEach(e => console.log(`  - ${e.title}: ${e.error}`));
  }

  console.log('\nDone!');
}

main().catch(console.error);
