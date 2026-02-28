#!/usr/bin/env tsx
/**
 * Script to search for Muscab stories in Google Drive backups
 * 
 * Usage: npx tsx scripts/search-muscab-stories.ts
 */

import { searchMaaweelByCharacter } from "../server/googleDrive";

async function main() {
  console.log("🔍 Searching for Muscab (Muscab bin Cumair) stories in Google Drive backups...\n");
  
  try {
    const stories = await searchMaaweelByCharacter("Muscab");
    
    if (stories.length === 0) {
      console.log("❌ No stories found for Muscab in Google Drive backups.");
      console.log("\nThis could mean:");
      console.log("1. The stories were never backed up to Google Drive");
      console.log("2. The character name in the backup is different");
      console.log("3. Google Drive credentials are not configured");
      return;
    }
    
    console.log(`✅ Found ${stories.length} Muscab stories in Google Drive backups:\n`);
    
    stories.forEach((story, index) => {
      console.log(`${index + 1}. ${story.title} (${story.titleSomali})`);
      console.log(`   Date: ${story.date}`);
      console.log(`   File: ${story.name}`);
      console.log(`   Character: ${story.characterName}`);
      console.log(`   Created: ${new Date(story.createdTime).toLocaleString()}`);
      console.log(`   Moral Lesson: ${story.moralLesson}`);
      console.log(`   Content preview: ${story.content.substring(0, 100)}...`);
      console.log("");
    });
    
    console.log("\n📝 To restore these stories to the database:");
    console.log("1. Use the API endpoint: POST /api/admin/bedtime-stories/restore");
    console.log("2. Send the story data from above (title, titleSomali, content, etc.)");
    console.log("3. Or use the admin UI to restore them");
    
  } catch (error) {
    console.error("❌ Error searching for stories:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("credentials") || error.message.includes("auth")) {
        console.log("\n⚠️  Google Drive credentials may not be configured.");
        console.log("Check that these environment variables are set:");
        console.log("  - GOOGLE_DRIVE_SERVICE_ACCOUNT");
      }
    }
  }
}

main().catch(console.error);
