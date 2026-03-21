import { S3Client, CopyObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

const BUCKET_NAME = process.env.R2_BUCKET_SHEEKO || process.env.R2_BUCKET_MAAWEELO || "barbaarintasan-sheeko";
const PREFIX = process.env.MAAWEELO_CACHE_BACKFILL_PREFIX || "Images/maaweelo/";
const TARGET_CACHE_CONTROL = process.env.MAAWEELO_IMAGE_CACHE_CONTROL || "public, max-age=31536000, immutable";
const PAGE_SIZE = Number.parseInt(process.env.MAAWEELO_CACHE_BACKFILL_PAGE_SIZE || "200", 10);
const DRY_RUN = process.env.MAAWEELO_CACHE_BACKFILL_DRY_RUN === "1";

if (!CLOUDFLARE_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("Missing R2 credentials. Required: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function listKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const resp = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: PAGE_SIZE,
      ContinuationToken: continuationToken,
    }));

    for (const obj of resp.Contents || []) {
      if (obj.Key) {
        keys.push(obj.Key);
      }
    }

    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function updateObjectCacheControl(key: string): Promise<"updated" | "skipped"> {
  const head = await s3.send(new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  }));

  const currentCacheControl = head.CacheControl || "";
  if (currentCacheControl.trim().toLowerCase() === TARGET_CACHE_CONTROL.toLowerCase()) {
    return "skipped";
  }

  if (DRY_RUN) {
    console.log(`[DRY-RUN] Would update ${key} from '${currentCacheControl || "(empty)"}' to '${TARGET_CACHE_CONTROL}'`);
    return "updated";
  }

  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    CopySource: `${BUCKET_NAME}/${key}`,
    MetadataDirective: "REPLACE",
    CacheControl: TARGET_CACHE_CONTROL,
    ContentType: head.ContentType,
    ContentDisposition: head.ContentDisposition,
    ContentEncoding: head.ContentEncoding,
    ContentLanguage: head.ContentLanguage,
  }));

  return "updated";
}

async function main(): Promise<void> {
  console.log("=== Maaweelo R2 Cache-Control Backfill ===");
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Target Cache-Control: ${TARGET_CACHE_CONTROL}`);
  if (DRY_RUN) {
    console.log("Mode: DRY_RUN");
  }

  const keys = await listKeys(PREFIX);
  console.log(`Found ${keys.length} object(s) under prefix`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const key of keys) {
    try {
      const status = await updateObjectCacheControl(key);
      if (status === "updated") {
        updated++;
        console.log(`[UPDATED] ${key}`);
      } else {
        skipped++;
      }
    } catch (error: any) {
      failed++;
      console.error(`[FAILED] ${key}: ${error?.message || String(error)}`);
    }
  }

  console.log("\n=== Backfill Summary ===");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
