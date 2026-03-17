import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const R2_BUCKET = 'sawirada';
const R2_PUBLIC_URL = 'https://pub-45a105402fad43a3a6b592cf21a1d1fa.r2.dev';
const FOLDER = 'parent-tips';

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

function parseDataUrlImage(image: string): { buffer: Buffer; mimeType: string; extension: string } | null {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];
  const extension = mimeType.includes('jpeg') ? 'jpg' : (mimeType.split('/')[1] || 'png');

  try {
    return { buffer: Buffer.from(base64Data, 'base64'), mimeType, extension };
  } catch {
    return null;
  }
}

async function uploadToR2(client: S3Client, fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const key = `${FOLDER}/${fileName}`;

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }

  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 500;

  const r2Client = getR2Client();
  const db = new pg.Client({ connectionString: DATABASE_URL });

  await db.connect();

  const tipsResult = await db.query(
    `SELECT id, images FROM parent_tips WHERE is_published = true ORDER BY tip_date DESC LIMIT $1`,
    [limit]
  );

  let migratedTips = 0;
  let migratedImages = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`[MIGRATE] Checking ${tipsResult.rows.length} tips (limit=${limit})`);

  for (const row of tipsResult.rows) {
    const tipId: string = row.id;
    const images: string[] = Array.isArray(row.images) ? row.images : [];

    if (images.length === 0) {
      skipped++;
      continue;
    }

    let changed = false;
    const nextImages: string[] = [];

    for (let idx = 0; idx < images.length; idx++) {
      const image = images[idx];

      if (!image.startsWith('data:image')) {
        nextImages.push(image);
        continue;
      }

      const parsed = parseDataUrlImage(image);
      if (!parsed) {
        failed++;
        nextImages.push(image);
        continue;
      }

      try {
        const fileName = `migrated-${tipId}-${idx}-${Date.now()}.${parsed.extension}`;
        const url = await uploadToR2(r2Client, parsed.buffer, fileName, parsed.mimeType);
        nextImages.push(url);
        migratedImages++;
        changed = true;
      } catch (error: any) {
        failed++;
        console.error(`[MIGRATE] Failed image upload for tip=${tipId}, idx=${idx}: ${error?.message || 'unknown error'}`);
        nextImages.push(image);
      }
    }

    if (changed) {
      await db.query(`UPDATE parent_tips SET images = $1 WHERE id = $2`, [nextImages, tipId]);
      migratedTips++;
      console.log(`[MIGRATE] Updated tip ${tipId} (${nextImages.length} images)`);
    }
  }

  await db.end();

  console.log('\n[MIGRATE] Done');
  console.log(`[MIGRATE] migratedTips=${migratedTips}`);
  console.log(`[MIGRATE] migratedImages=${migratedImages}`);
  console.log(`[MIGRATE] skipped=${skipped}`);
  console.log(`[MIGRATE] failed=${failed}`);
}

main().catch((error) => {
  console.error('[MIGRATE] Fatal:', error?.message || error);
  process.exit(1);
});
