import { db } from "../server/db";
import { bedtimeStories } from "../shared/schema";
import { asc, eq, gt } from "drizzle-orm";
import { uploadToR2, isR2Configured } from "../server/r2Storage";

type StoryRow = {
  id: string;
  storyDate: string;
  images: string[];
  thumbnailUrl: string | null;
};

type StoryIdRow = {
  id: string;
};

const BATCH_SIZE = Number.parseInt(process.env.BEDTIME_MIGRATION_BATCH_SIZE || "50", 10);
const BATCH_SLEEP_MS = Number.parseInt(process.env.BEDTIME_MIGRATION_BATCH_SLEEP_MS || "75", 10);
const RETRY_COUNT = Number.parseInt(process.env.BEDTIME_MIGRATION_RETRIES || "3", 10);
const READ_RETRY_COUNT = Number.parseInt(process.env.BEDTIME_MIGRATION_READ_RETRIES || "4", 10);

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

function isReadTimeoutError(error: unknown): boolean {
  const message = (error as any)?.message || "";
  return typeof message === "string" && message.toLowerCase().includes("query read timeout");
}

async function fetchStoriesPage(lastId?: string): Promise<StoryIdRow[]> {
  for (let attempt = 1; attempt <= READ_RETRY_COUNT; attempt++) {
    try {
      if (lastId) {
        return (await db
          .select({
            id: bedtimeStories.id,
          })
          .from(bedtimeStories)
          .where(gt(bedtimeStories.id, lastId))
          .orderBy(asc(bedtimeStories.id))
          .limit(BATCH_SIZE)) as StoryIdRow[];
      }

      return (await db
        .select({
          id: bedtimeStories.id,
        })
        .from(bedtimeStories)
        .orderBy(asc(bedtimeStories.id))
        .limit(BATCH_SIZE)) as StoryIdRow[];
    } catch (error) {
      if (!isReadTimeoutError(error) || attempt === READ_RETRY_COUNT) {
        throw error;
      }
      const waitMs = 300 * attempt;
      console.warn(`[Maaweelo Migration] Read timeout on page fetch, retry ${attempt}/${READ_RETRY_COUNT} in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }

  return [];
}

async function fetchStoryById(id: string): Promise<StoryRow | undefined> {
  for (let attempt = 1; attempt <= READ_RETRY_COUNT; attempt++) {
    try {
      const [story] = (await db
        .select({
          id: bedtimeStories.id,
          storyDate: bedtimeStories.storyDate,
          images: bedtimeStories.images,
          thumbnailUrl: bedtimeStories.thumbnailUrl,
        })
        .from(bedtimeStories)
        .where(eq(bedtimeStories.id, id))
        .limit(1)) as StoryRow[];
      return story;
    } catch (error) {
      if (!isReadTimeoutError(error) || attempt === READ_RETRY_COUNT) {
        throw error;
      }
      const waitMs = 300 * attempt;
      console.warn(`[Maaweelo Migration] Read timeout loading story ${id}, retry ${attempt}/${READ_RETRY_COUNT} in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }

  return undefined;
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

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let scanned = 0;
  let candidatesSeen = 0;
  let batchNumber = 0;
  let lastId: string | undefined;

  while (true) {
    const idPage = await fetchStoriesPage(lastId);
    if (idPage.length === 0) {
      break;
    }

    batchNumber++;
    scanned += idPage.length;
    lastId = idPage[idPage.length - 1].id;

    const batchCandidates: StoryRow[] = [];
    for (const idRow of idPage) {
      const story = await fetchStoryById(idRow.id);
      if (story && needsMigration(story)) {
        batchCandidates.push(story);
      }
    }
    candidatesSeen += batchCandidates.length;

    console.log(`\n[Batch ${batchNumber}] Scanned ${idPage.length} rows, candidates ${batchCandidates.length} (total scanned ${scanned})`);

    for (const story of batchCandidates) {
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

    await sleep(BATCH_SLEEP_MS);
  }

  console.log("\n=== Migration Summary ===");
  console.log(`Scanned: ${scanned}`);
  console.log(`Candidates: ${candidatesSeen}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
