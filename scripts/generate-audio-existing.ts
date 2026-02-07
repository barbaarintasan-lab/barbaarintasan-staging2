// Script to generate audio for existing stories and messages
import { generateBedtimeStoryAudio, generateParentMessageAudio } from "../server/tts";
import { db } from "../server/db";
import { bedtimeStories, parentMessages } from "../shared/schema";
import { isNull, or, eq } from "drizzle-orm";

async function main() {
  console.log("[TTS Script] Starting audio generation for existing content...");
  
  // Get stories without audio
  const stories = await db.select().from(bedtimeStories).where(
    or(isNull(bedtimeStories.audioUrl), eq(bedtimeStories.audioUrl, ""))
  );
  
  console.log(`[TTS Script] Found ${stories.length} stories without audio`);
  
  for (const story of stories) {
    try {
      console.log(`[TTS Script] Generating audio for story: ${story.titleSomali}`);
      const audioUrl = await generateBedtimeStoryAudio(story.content, story.moralLesson, story.id);
      
      await db.update(bedtimeStories)
        .set({ audioUrl })
        .where(eq(bedtimeStories.id, story.id));
      
      console.log(`[TTS Script] Audio saved for story ${story.id}`);
    } catch (error) {
      console.error(`[TTS Script] Error for story ${story.id}:`, error);
    }
  }
  
  // Get messages without audio
  const messages = await db.select().from(parentMessages).where(
    or(isNull(parentMessages.audioUrl), eq(parentMessages.audioUrl, ""))
  );
  
  console.log(`[TTS Script] Found ${messages.length} messages without audio`);
  
  for (const message of messages) {
    try {
      console.log(`[TTS Script] Generating audio for message: ${message.title}`);
      const audioUrl = await generateParentMessageAudio(message.content, message.id);
      
      await db.update(parentMessages)
        .set({ audioUrl })
        .where(eq(parentMessages.id, message.id));
      
      console.log(`[TTS Script] Audio saved for message ${message.id}`);
    } catch (error) {
      console.error(`[TTS Script] Error for message ${message.id}:`, error);
    }
  }
  
  console.log("[TTS Script] Done!");
  process.exit(0);
}

main().catch(console.error);
