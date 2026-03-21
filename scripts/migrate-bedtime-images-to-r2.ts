import { db } from "../server/db";
import { bedtimeStories } from "../shared/schema";
import { eq } from "drizzle-orm";
import { uploadToR2, isR2Configured } from "../server/r2Storage";

type StoryRow = {
  id: string;
  storyDate: string;
  images: string[];
  thumbnailUrl: string | null;
};

const BATCH_SIZE = Number.parseInt(process.env.BEDTIME_MIGRATION_BATCH_SIZE || "50", 10);
const BATCH_SLEEP_MS = Number.parseInt(process.env.BEDTIME_MIGRATION_BATCH_SLEEP_MS || "75", 10);
const RETRY_COUNT = Number.parseInt(process.env.BEDTIME_MIGRATION_RETRIES || "3", 10);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRemoteUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function parseDataImage(dataUrl: string): { buffer: Buffer; mimeType: string; extension: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL image format");
  }
  const mimeType = match[1];
  const base64Payload = match[2];
  const rawExt = mimeType.split("/")[1] || "png";
  const extension = rawExt.includes("+") ? rawExt.split("+")[0] : rawExt;
  return {
    buffer: Buffer.from(base64Payload, "base64"),
    mimeType,
    extension,
  };
}

function needsMigration(story: StoryRow): boolean {
  const thumbNeeds = !!story.thumbnailUrl && story.thumbnailUrl.startsWith("data:image");
  const imageNeeds = Array.isArray(story.images) && story.images.some((img) => img.startsWith("data:image"));
  return thumbNeeds || imageNeeds;
}

async function uploadWithRetry(
  imageSource: string,
  storyDate: string,
  storyId: string,
  index: number,
): Promise<string> {
  if (!imageSource.startsWith("data:image")) {
    return imageSource;
  }

  const parsed = parseDataImage(imageSource);
  const fileName = `maaweelo-${storyDate}-${storyId.slice(0, 8)}-${index + 1}.${parsed.extension}`;

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      const { url } = await uploadToR2(parsed.buffer, fileName, parsed.mimeType, "Images/maaweelo", "sheeko");
      return url;
    } catch (error) {
      if (attempt === RETRY_COUNT) {
        throw error;
      }
      const waitMs = 200 * attempt;
      console.warn(`[Maaweelo Migration] Retry ${attempt}/${RETRY_COUNT} for ${fileName} in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }

  return imageSource;
}

async function migrateStory(story: StoryRow): Promise<{ changed: boolean; error?: string }> {
  try {
    const nextImages: string[] = [];
    let changed = false;

    for (let i = 0; i < story.images.length; i++) {
      const current = story.images[i];
      if (current.startsWith("data:image")) {
        const migrated = await uploadWithRetry(current, story.storyDate, story.id, i);
        nextImages.push(migrated);
        changed = changed || migrated !== current;
      } else {
        nextImages.push(current);
      }
    }

    let nextThumbnail = story.thumbnailUrl;
    if (nextThumbnail && nextThumbnail.startsWith("data:image")) {
      nextThumbnail = await uploadWithRetry(nextThumbnail, story.storyDate, story.id, 0);
      changed = changed || nextThumbnail !== story.thumbnailUrl;
    }

    if (!nextThumbnail && nextImages[0] && isRemoteUrl(nextImages[0])) {
      nextThumbnail = nextImages[0];
      changed = true;
    }

    if (!changed) {
      return { changed: false };
    }

    await db
      .update(bedtimeStories)
      .set({
        images: nextImages,
        thumbnailUrl: nextThumbnail,
      })
      .where(eq(bedtimeStories.id, story.id));

    return { changed: true };
  } catch (error: any) {
    return { changed: false, error: error?.message || String(error) };
  }
}

async function main(): Promise<void> {
  console.log("=== Maaweelo Images Migration: base64 -> R2 ===");

  if (!isR2Configured()) {
    throw new Error("R2 is not configured. Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.");
  }

  const allStories = (await db.select({
    id: bedtimeStories.id,
    storyDate: bedtimeStories.storyDate,
    images: bedtimeStories.images,
    thumbnailUrl: bedtimeStories.thumbnailUrl,
  }).from(bedtimeStories)) as StoryRow[];

  const candidates = allStories.filter(needsMigration);
  console.log(`Found ${allStories.length} bedtime stories, ${candidates.length} require migration`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    console.log(`\n[Batch ${Math.floor(i / BATCH_SIZE) + 1}] Processing ${batch.length} stories...`);

    for (const story of batch) {
      const result = await migrateStory(story);
      if (result.error) {
        failed++;
        console.error(`[FAILED] ${story.id}: ${result.error}`);
        continue;
      }
      if (result.changed) {
        updated++;
        console.log(`[UPDATED] ${story.id}`);
      } else {
        skipped++;
        console.log(`[SKIPPED] ${story.id}`);
      }
    }

    if (i + BATCH_SIZE < candidates.length) {
      await sleep(BATCH_SLEEP_MS);
    }
  }

  console.log("\n=== Migration Summary ===");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
