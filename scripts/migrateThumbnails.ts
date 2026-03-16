import { db } from "../server/db";
import { parentMessages, bedtimeStories } from "../shared/schema";
import { uploadImageToGoogleDrive } from "../server/googleDrive";
import { eq } from "drizzle-orm";

async function base64ToBuffer(base64String: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 string format");
  }
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");
  return { buffer, mimeType };
}

async function migrateParentMessages() {
  console.log("\n=== Migrating Parent Messages Thumbnails ===\n");
  
  const messages = await db.select().from(parentMessages);
  console.log(`Found ${messages.length} parent messages`);
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const msg of messages) {
    if (msg.thumbnailUrl) {
      console.log(`[SKIP] ${msg.id} - Already has thumbnail`);
      skipped++;
      continue;
    }
    
    const firstImage = msg.images?.[0];
    if (!firstImage) {
      console.log(`[SKIP] ${msg.id} - No images`);
      skipped++;
      continue;
    }
    
    if (firstImage.startsWith("http")) {
      console.log(`[URL] ${msg.id} - Setting URL as thumbnail`);
      await db.update(parentMessages)
        .set({ thumbnailUrl: firstImage })
        .where(eq(parentMessages.id, msg.id));
      migrated++;
      continue;
    }
    
    if (firstImage.startsWith("data:image")) {
      try {
        console.log(`[UPLOAD] ${msg.id} - Uploading base64 image to Google Drive...`);
        const { buffer, mimeType } = await base64ToBuffer(firstImage);
        const extension = mimeType.split("/")[1] || "png";
        const fileName = `dhambaal-${msg.id}-thumb.${extension}`;
        
        const url = await uploadImageToGoogleDrive(buffer, fileName, mimeType, "dhambaal");
        if (url) {
          await db.update(parentMessages)
            .set({ thumbnailUrl: url })
            .where(eq(parentMessages.id, msg.id));
          console.log(`[SUCCESS] ${msg.id} - Uploaded: ${url}`);
          migrated++;
        } else {
          console.log(`[ERROR] ${msg.id} - Upload failed`);
          errors++;
        }
      } catch (err) {
        console.error(`[ERROR] ${msg.id} -`, err);
        errors++;
      }
    }
  }
  
  console.log(`\nParent Messages: ${migrated} migrated, ${skipped} skipped, ${errors} errors\n`);
}

async function migrateBedtimeStories() {
  console.log("\n=== Migrating Bedtime Stories Thumbnails ===\n");
  
  const stories = await db.select().from(bedtimeStories);
  console.log(`Found ${stories.length} bedtime stories`);
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const story of stories) {
    if (story.thumbnailUrl) {
      console.log(`[SKIP] ${story.id} - Already has thumbnail`);
      skipped++;
      continue;
    }
    
    const firstImage = story.images?.[0];
    if (!firstImage) {
      console.log(`[SKIP] ${story.id} - No images`);
      skipped++;
      continue;
    }
    
    if (firstImage.startsWith("http")) {
      console.log(`[URL] ${story.id} - Setting URL as thumbnail`);
      await db.update(bedtimeStories)
        .set({ thumbnailUrl: firstImage })
        .where(eq(bedtimeStories.id, story.id));
      migrated++;
      continue;
    }
    
    if (firstImage.startsWith("data:image")) {
      try {
        console.log(`[UPLOAD] ${story.id} - Uploading base64 image to Google Drive...`);
        const { buffer, mimeType } = await base64ToBuffer(firstImage);
        const extension = mimeType.split("/")[1] || "png";
        const fileName = `sheeko-${story.id}-thumb.${extension}`;
        
        const url = await uploadImageToGoogleDrive(buffer, fileName, mimeType, "sheeko");
        if (url) {
          await db.update(bedtimeStories)
            .set({ thumbnailUrl: url })
            .where(eq(bedtimeStories.id, story.id));
          console.log(`[SUCCESS] ${story.id} - Uploaded: ${url}`);
          migrated++;
        } else {
          console.log(`[ERROR] ${story.id} - Upload failed`);
          errors++;
        }
      } catch (err) {
        console.error(`[ERROR] ${story.id} -`, err);
        errors++;
      }
    }
  }
  
  console.log(`\nBedtime Stories: ${migrated} migrated, ${skipped} skipped, ${errors} errors\n`);
}

async function main() {
  console.log("Starting thumbnail migration...\n");
  
  try {
    await migrateParentMessages();
    await migrateBedtimeStories();
    console.log("\n=== Migration Complete ===\n");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
