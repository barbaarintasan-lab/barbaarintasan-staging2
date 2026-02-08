// Script to regenerate ALL audio using Camb AI native Somali voice
import { generateBedtimeStoryAudio, generateParentMessageAudio } from "../server/tts";
import { db } from "../server/db";
import { bedtimeStories, parentMessages } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("[TTS Regenerate] Starting audio regeneration with Camb AI Somali voice...");
  
  // Get ALL stories
  const stories = await db.select().from(bedtimeStories);
  console.log(`[TTS Regenerate] Found ${stories.length} stories to regenerate`);
  
  for (const story of stories) {
    try {
      console.log(`[TTS Regenerate] Generating audio for story: ${story.titleSomali}`);
      const audioUrl = await generateBedtimeStoryAudio(story.content, story.moralLesson, story.id);
      
      await db.update(bedtimeStories)
        .set({ audioUrl })
        .where(eq(bedtimeStories.id, story.id));
      
      console.log(`[TTS Regenerate] ✓ Audio saved for story ${story.id}: ${audioUrl}`);
    } catch (error) {
      console.error(`[TTS Regenerate] ✗ Error for story ${story.id}:`, error);
    }
  }
  
  // Get ALL messages
  const messages = await db.select().from(parentMessages);
  console.log(`[TTS Regenerate] Found ${messages.length} messages to regenerate`);
  
  for (const message of messages) {
    try {
      console.log(`[TTS Regenerate] Generating audio for message: ${message.title}`);
      const audioUrl = await generateParentMessageAudio(message.content, message.id);
      
      await db.update(parentMessages)
        .set({ audioUrl })
        .where(eq(parentMessages.id, message.id));
      
      console.log(`[TTS Regenerate] ✓ Audio saved for message ${message.id}: ${audioUrl}`);
    } catch (error) {
      console.error(`[TTS Regenerate] ✗ Error for message ${message.id}:`, error);
    }
  }
  
  console.log("[TTS Regenerate] Done! All audio has been regenerated with Camb AI Somali voice.");
  process.exit(0);
}

main().catch(console.error);
