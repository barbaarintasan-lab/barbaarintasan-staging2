import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Multiple buckets for different content types
const R2_BUCKETS = {
  dhambaal: {
    name: 'barbaarintasan-dhambaal',
    publicUrl: 'https://pub-449d3a9b2aea4f7eabbbaecddd5424a3.r2.dev'
  },
  sheeko: {
    name: 'barbaarintasan-sheeko',
    publicUrl: 'https://pub-aa07832f2cb447b49400a607d94e4843.r2.dev'
  },
  sawirada: {
    name: 'sawirada',
    publicUrl: 'https://pub-45a105402fad43a3a6b592cf21a1d1fa.r2.dev'
  }
};

export type R2BucketType = 'dhambaal' | 'sheeko' | 'sawirada';

let s3Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (s3Client) return s3Client;

  if (!CLOUDFLARE_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured. Required: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
    // Disable checksum features that R2 doesn't support
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return s3Client;
}

export function isR2Configured(): boolean {
  return !!(CLOUDFLARE_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'audio/mpeg',
  folder: string = 'Audio',
  bucketType: R2BucketType = 'dhambaal'
): Promise<{ url: string; key: string }> {
  const client = getR2Client();
  const bucket = R2_BUCKETS[bucketType];
  const key = `${folder}/${fileName}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    CacheControl: mimeType.startsWith('audio/') ? 'public, max-age=3600' : undefined,
  }));

  const url = `${bucket.publicUrl}/${key}`;

  console.log(`[R2] Uploaded ${fileName} to ${bucket.name}/${key}`);
  return { url, key };
}

export async function getFromR2(key: string, bucketType: R2BucketType = 'dhambaal'): Promise<Buffer | null> {
  try {
    const client = getR2Client();
    const bucket = R2_BUCKETS[bucketType];
    
    const response = await client.send(new GetObjectCommand({
      Bucket: bucket.name,
      Key: key,
    }));

    if (!response.Body) return null;

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error: any) {
    if (error.name === 'NoSuchKey') return null;
    throw error;
  }
}

export async function deleteFromR2(key: string, bucketType: R2BucketType = 'dhambaal'): Promise<void> {
  const client = getR2Client();
  const bucket = R2_BUCKETS[bucketType];
  
  await client.send(new DeleteObjectCommand({
    Bucket: bucket.name,
    Key: key,
  }));
  console.log(`[R2] Deleted ${key} from ${bucket.name}`);
}

export async function existsInR2(key: string, bucketType: R2BucketType = 'dhambaal'): Promise<boolean> {
  try {
    const client = getR2Client();
    const bucket = R2_BUCKETS[bucketType];
    
    await client.send(new HeadObjectCommand({
      Bucket: bucket.name,
      Key: key,
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') return false;
    throw error;
  }
}

export function getR2PublicUrl(key: string, bucketType: R2BucketType = 'dhambaal'): string {
  const bucket = R2_BUCKETS[bucketType];
  return `${bucket.publicUrl}/${key}`;
}

export interface R2FileInfo {
  key: string;
  name: string;
  url: string;
  size: number;
  lastModified: Date;
  mimeType?: string;
}

export async function listR2Files(
  prefix: string,
  bucketType: R2BucketType = 'dhambaal',
  maxKeys: number = 200
): Promise<R2FileInfo[]> {
  const client = getR2Client();
  const bucket = R2_BUCKETS[bucketType];
  const files: R2FileInfo[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket.name,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    }));

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (!obj.Key) continue;
        const name = obj.Key.split('/').pop() || obj.Key;
        if (!name) continue;
        files.push({
          key: obj.Key,
          name,
          url: `${bucket.publicUrl}/${obj.Key}`,
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
        });
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`[R2] Listed ${files.length} files with prefix '${prefix}' in ${bucket.name}`);
  return files;
}

export async function uploadReceiptToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<{ url: string; key: string }> {
  const client = getR2Client();
  const bucket = R2_BUCKETS.dhambaal;
  const key = `receipts/${Date.now()}-${fileName}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));

  const url = `${bucket.publicUrl}/${key}`;
  console.log(`[R2] Uploaded receipt ${fileName} to ${key}`);
  return { url, key };
}
