import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import type { InsertParentMessage } from "@shared/schema";
import { generateParentMessageAudio } from "./tts";
import { saveDhambaalToGoogleDrive } from "./googleDrive";
import { uploadToR2, isR2Configured } from "./r2Storage";
import OpenAI from "openai";
import { db } from "./db";
import { translations } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { isSomaliLanguage, normalizeLanguageCode } from "./utils/translations";

function getSomaliaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Mogadishu' });
}

// Use Replit AI Integration on Replit, fallback to direct OpenAI on Fly.io
const useReplitIntegration = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
console.log(`[Parent Messages] OpenAI config: ${useReplitIntegration ? 'Replit Integration' : 'Direct OpenAI API'}`);

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  ...(useReplitIntegration ? { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL } : {}),
});

const PARENTING_TOPICS = [
  { topic: "Dulqaadka iyo Samirka", description: "Patience and perseverance in parenting" },
  { topic: "Diinta iyo Tarbiyada", description: "Religious upbringing and Islamic values" },
  { topic: "Cuntada Caruurta", description: "Children's nutrition and healthy eating" },
  { topic: "Hurdada iyo Nasashada", description: "Sleep habits and rest for children" },
  { topic: "Caafimaadka Maskaxda", description: "Mental health and emotional wellbeing" },
  { topic: "Waxbarashada Guriga", description: "Home education and learning activities" },
  { topic: "Xiriirka Waalidka iyo Ilmaha", description: "Parent-child relationship and bonding" },
  { topic: "Anshaxa iyo Akhlaaqdda", description: "Discipline and moral character" },
  { topic: "Ciyaaraha iyo Horumarinta", description: "Play and developmental activities" },
  { topic: "Qoyska iyo Midnimada", description: "Family unity and togetherness" },
  { topic: "Dhiirrigelinta Ilmaha", description: "Encouraging and motivating children" },
  { topic: "Samaynta Caadooyinka Wanaagsan", description: "Building good habits" },
  { topic: "Waalidnimada Naxariis leh", description: "Compassionate parenting" },
  { topic: "Xalinta Khilaafaadka", description: "Conflict resolution with children" },
  { topic: "Isku kalsoonida Ilmaha", description: "Building children's self-confidence" },
];

async function selectTopicForToday(): Promise<{ topic: string; description: string }> {
  const recentMessages = await storage.getParentMessages(PARENTING_TOPICS.length);
  
  if (recentMessages.length === 0) {
    console.log(`[Parent Messages] No previous messages, selecting first topic`);
    return PARENTING_TOPICS[0];
  }

  const recentTopics = recentMessages.map(m => m.topic);
  const availableTopics = PARENTING_TOPICS.filter(t => !recentTopics.includes(t.topic));
  
  if (availableTopics.length === 0) {
    console.log(`[Parent Messages] All 15 topics used, starting new cycle`);
    return PARENTING_TOPICS[0];
  }
  
  console.log(`[Parent Messages] ${availableTopics.length} topics available for selection`);
  return availableTopics[Math.floor(Math.random() * availableTopics.length)];
}

async function generateMessageText(topic: { topic: string; description: string }): Promise<{ title: string; content: string; keyPoints: string }> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Waxaad tahay qoraa Soomaaliyeed oo ku xeel dheer waalidnimada iyo tarbiyada caruurta. Qor blog post (dhambaal) waalidka Soomaaliyeed loogu talagalay oo ku saabsan: "${topic.topic}" (${topic.description}).

Dhambaalku waa inuu:
1. Loo qoro Soomaaliga fasax ah oo waalidku si fudud u fahmi karo
2. Uu yahay 400-600 ereyood
3. Ku salaysan yahay cilmiga casriga ah iyo diinta Islaamka
4. Uu bixiyo talo macquul ah oo waalidku ku dabaqan karo
5. Uu ku jiro tusaalooyin dhab ah oo nolosha laga qaadan karo
6. Uu dhiirri gelin u yahay waalidka
7. Uu ka hadlayo caruurta da'doodu u dhaxayso 0-7 sano

MUHIIM: Marka la sheego Nabiga Muxammad, mar walba ku qor "Nabadgalyo iyo Naxariisi korkiisa ha ahaatee" - ha isticmaalin soo gaabinta sida "scw" ama "PBUH".

MUHIIM: HA KU DARIN bilowga qoraalka salaan sida "Assalamu Calaykum" ama magaca qoraaga. Toos mawduuca u gal.

MUHIIM: Dhamaadka qoraalka ku dar saxiixa sidan:
"Mahadsanidiin!

Muuse Siciid Aw-Muuse
Aasaasaha Barbaarintasan Akademi"

Ka jawaab JSON sax ah:
{
  "title": "Cinwaanka Soomaaliga (6-10 ereyood)",
  "content": "Qoraalka oo dhan...",
  "keyPoints": "Qodobka 1, Qodobka 2, Qodobka 3"
}`;

  console.log("[Parent Messages] Generating text with GPT-4o...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a Somali parenting expert who writes educational content for Somali parents. Always respond with valid JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 3000,
    response_format: { type: "json_object" }
  });

  const textContent = response.choices?.[0]?.message?.content;
  
  if (!textContent) {
    throw new Error("No message content generated");
  }
  
  console.log("[Parent Messages] GPT-4o response received");

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse message JSON");
  }

  // Helper function to escape newlines only inside string values
  function escapeNewlinesInStrings(json: string): string {
    let result = '';
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < json.length; i++) {
      const char = json[i];
      
      if (escape) {
        result += char;
        escape = false;
        continue;
      }
      
      if (char === '\\') {
        result += char;
        escape = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }
      
      if (inString && char === '\n') {
        result += '\\n';
      } else if (inString && char === '\r') {
        result += '\\r';
      } else if (inString && char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    }
    
    return result;
  }

  // Try multiple JSON cleanup strategies
  const strategies = [
    // Strategy 1: Escape newlines inside string values properly
    () => {
      const cleaned = escapeNewlinesInStrings(jsonMatch[0]);
      return JSON.parse(cleaned);
    },
    // Strategy 2: Replace all newlines with escaped versions
    () => {
      const cleaned = jsonMatch[0]
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return JSON.parse(cleaned);
    },
    // Strategy 3: Simple control char replacement
    () => {
      const cleaned = jsonMatch[0].replace(/[\x00-\x1F\x7F\n\r\t]/g, ' ');
      return JSON.parse(cleaned);
    },
    // Strategy 3: Extract fields using flexible regex  
    () => {
      const titleMatch = jsonMatch[0].match(/"title"\s*:\s*"([^"]+)"/);
      // More flexible content extraction - look for content field and extract until keyPoints
      let contentMatch = jsonMatch[0].match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"keyPoints"/);
      if (!contentMatch) {
        // Try extracting content between "content": " and keyPoints
        const contentStart = jsonMatch[0].indexOf('"content"');
        const keyPointsStart = jsonMatch[0].indexOf('"keyPoints"');
        if (contentStart !== -1 && keyPointsStart !== -1) {
          const contentSection = jsonMatch[0].slice(contentStart, keyPointsStart);
          const valueMatch = contentSection.match(/"content"\s*:\s*"([\s\S]*)"\s*,?\s*$/);
          if (valueMatch) {
            contentMatch = [valueMatch[0], valueMatch[1]];
          }
        }
      }
      // Try multiple patterns for keyPoints - could have newlines or other issues
      let keyPointsMatch = jsonMatch[0].match(/"keyPoints"\s*:\s*"([^"]+)"/);
      if (!keyPointsMatch) {
        // Try extracting from keyPoints to end of JSON
        const keyPointsStart = jsonMatch[0].indexOf('"keyPoints"');
        if (keyPointsStart !== -1) {
          const keyPointsSection = jsonMatch[0].slice(keyPointsStart);
          // Extract value between quotes after keyPoints:
          const valueMatch = keyPointsSection.match(/"keyPoints"\s*:\s*"([\s\S]*?)"\s*\}/);
          if (valueMatch) {
            keyPointsMatch = [valueMatch[0], valueMatch[1].replace(/[\n\r]/g, ' ')];
          }
        }
      }
      
      if (!titleMatch || !contentMatch) {
        console.log("[Parent Messages] Regex extraction failed - title:", !!titleMatch, "content:", !!contentMatch);
        throw new Error("Could not extract title or content");
      }
      
      return {
        title: titleMatch[1],
        content: contentMatch[1].replace(/\\n/g, '\n').replace(/[\x00-\x1F\x7F]/g, ' '),
        keyPoints: keyPointsMatch ? keyPointsMatch[1].replace(/[\n\r]/g, ' ') : "Talo muhiim ah waalidka"
      };
    },
    // Strategy 4: Log raw JSON for debugging
    () => {
      console.log("[Parent Messages] Raw JSON sample:", jsonMatch[0].substring(0, 500));
      throw new Error("Manual inspection needed");
    }
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = strategies[i]();
      if (result.title && result.content) {
        console.log(`[Parent Messages] JSON parsed with strategy ${i + 1}`);
        // Ensure keyPoints has a default if missing
        if (!result.keyPoints) {
          result.keyPoints = "Talo muhiim ah waalidka";
        }
        return result;
      }
    } catch (e) {
      console.log(`[Parent Messages] Strategy ${i + 1} failed:`, (e as Error).message);
    }
  }
  
  throw new Error("Could not parse message JSON after all strategies");
}

async function generateMessageImage(topic: string, sceneDescription: string): Promise<string> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Professional illustration for Somali parenting blog about "${topic}". ${sceneDescription}. Art style: warm, modern, professional illustration suitable for parenting website. Features a loving Somali family - father in smart casual clothes, mother in elegant dirac and garbasaar, and happy children. Setting: cozy Somali home or outdoor scene. Mood: positive, educational, inspiring. Colors: warm earth tones with pops of traditional Somali colors. Safe for family viewing.`;

  console.log("[Parent Messages] Generating image with gpt-image-1...");

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
  });

  if (response.data && response.data.length > 0 && response.data[0].b64_json) {
    console.log("[Parent Messages] Image generated successfully");
    return `data:image/png;base64,${response.data[0].b64_json}`;
  }
  
  throw new Error("No image generated");
}

export async function generateParentMessage(): Promise<InsertParentMessage> {
  console.log("[Parent Messages] Starting daily message generation...");
  
  const topic = await selectTopicForToday();
  console.log(`[Parent Messages] Selected topic: ${topic.topic}`);

  const messageText = await generateMessageText(topic);
  console.log(`[Parent Messages] Generated message: ${messageText.title}`);

  const imageScenes = [
    `A Somali parent teaching their child about ${topic.topic}`,
    `A warm family moment related to ${topic.description}`,
  ];

  const images: string[] = [];
  for (let i = 0; i < 2; i++) {
    try {
      console.log(`[Parent Messages] Generating image ${i + 1}/2...`);
      const image = await generateMessageImage(topic.topic, imageScenes[i]);
      images.push(image);
    } catch (error) {
      console.error(`[Parent Messages] Failed to generate image ${i + 1}:`, error);
    }
  }

  console.log(`[Parent Messages] Generated ${images.length} images`);

  const today = getSomaliaToday();

  const message: InsertParentMessage = {
    title: messageText.title,
    content: messageText.content,
    topic: topic.topic,
    keyPoints: messageText.keyPoints,
    images: images,
    messageDate: today,
    isPublished: true, // Auto-publish for daily cron job
    authorName: "Musse Said Aw-Musse",
  };

  console.log("[Parent Messages] Message generation complete");
  return message;
}

export async function generateAndSaveParentMessage(): Promise<void> {
  try {
    const today = getSomaliaToday();
    
    const existingMessage = await storage.getParentMessageByDate(today);
    if (existingMessage) {
      console.log(`[Parent Messages] Message already exists for ${today}`);
      return;
    }

    const message = await generateParentMessage();
    const saved = await storage.createParentMessage(message);
    console.log(`[Parent Messages] Saved message for ${today}: ${message.title}`);

    // Upload first image to R2 as thumbnail
    try {
      if (message.images && message.images.length > 0 && isR2Configured()) {
        const firstImage = message.images[0];
        if (firstImage.startsWith('data:image/png;base64,')) {
          const base64Data = firstImage.replace('data:image/png;base64,', '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const fileName = `dhambaal-${today}-${saved.id.substring(0, 8)}.png`;
          const { url } = await uploadToR2(imageBuffer, fileName, 'image/png', 'Images', 'dhambaal');
          await storage.updateParentMessage(saved.id, { thumbnailUrl: url });
          console.log(`[Parent Messages] Thumbnail uploaded to R2: ${url}`);
        }
      }
    } catch (thumbError) {
      console.error(`[Parent Messages] Thumbnail upload failed:`, thumbError);
    }

    try {
      console.log(`[Parent Messages] Generating audio (Muuse voice)...`);
      const { generateAndUploadAudio } = await import("./tts");
      const audioUrl = await generateAndUploadAudio(
        saved.content,
        `dhambaal-${saved.id}`,
        "tts-audio/dhambaalka",
        { azureVoice: "so-SO-MuuseNeural" },
        'dhambaal'
      );
      await storage.updateParentMessage(saved.id, { audioUrl });
      console.log(`[Parent Messages] Audio generated and saved to R2: ${audioUrl}`);
    } catch (audioError) {
      console.error(`[Parent Messages] Audio generation failed (content saved without audio):`, audioError);
    }
    
    /* Google Drive backup disabled as per user request
    try {
      await saveDhambaalToGoogleDrive(message.title, message.content, today);
      console.log(`[Parent Messages] Backed up to Google Drive`);
    } catch (driveError) {
      console.error(`[Parent Messages] Google Drive backup failed:`, driveError);
    }
    */
  } catch (error: any) {
    if (error?.code === '23505' || error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
      console.log(`[Parent Messages] Message already exists for ${today} (caught duplicate insert)`);
      return;
    }
    console.error("[Parent Messages] Failed to generate and save message:", error);
  }
}

export async function fixMissingThumbnails(): Promise<number> {
  if (!isR2Configured()) {
    console.log("[Parent Messages] R2 not configured, cannot fix thumbnails");
    return 0;
  }

  const allMessages = await db.select({
    id: (await import("@shared/schema")).parentMessages.id,
    images: (await import("@shared/schema")).parentMessages.images,
    thumbnailUrl: (await import("@shared/schema")).parentMessages.thumbnailUrl,
    messageDate: (await import("@shared/schema")).parentMessages.messageDate,
  }).from((await import("@shared/schema")).parentMessages);

  let fixed = 0;
  for (const msg of allMessages) {
    if (msg.thumbnailUrl) continue;
    if (!msg.images || msg.images.length === 0) continue;

    const firstImage = msg.images[0];
    if (!firstImage || !firstImage.startsWith('data:image/png;base64,')) continue;

    try {
      const base64Data = firstImage.replace('data:image/png;base64,', '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const fileName = `dhambaal-${msg.messageDate}-${msg.id.substring(0, 8)}.png`;
      const { url } = await uploadToR2(imageBuffer, fileName, 'image/png', 'Images', 'dhambaal');
      await storage.updateParentMessage(msg.id, { thumbnailUrl: url });
      console.log(`[Parent Messages] Fixed thumbnail for ${msg.messageDate}: ${url}`);
      fixed++;
    } catch (err) {
      console.error(`[Parent Messages] Failed to fix thumbnail for ${msg.id}:`, err);
    }
  }

  console.log(`[Parent Messages] Fixed ${fixed} missing thumbnails`);
  return fixed;
}

let parentMessagesCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 30000;
const todayCache = new Map<string, { data: any; expiry: number }>();

export function clearParentMessagesCache(): void {
  parentMessagesCache = null;
  todayCache.clear();
}

async function applyTranslationsToMessages<T extends Record<string, any> & { id: string }>(
  messages: T[],
  language: string
): Promise<T[]> {
  if (isSomaliLanguage(language) || messages.length === 0) {
    return messages;
  }

  const messageIds = messages.map(m => m.id);
  const allTranslations = await db.select()
    .from(translations)
    .where(
      and(
        eq(translations.entityType, 'parent_message'),
        inArray(translations.entityId, messageIds),
        eq(translations.targetLanguage, normalizeLanguageCode(language))
      )
    );

  const translationsByMessage = new Map<string, typeof allTranslations>();
  for (const translation of allTranslations) {
    if (!translationsByMessage.has(translation.entityId)) {
      translationsByMessage.set(translation.entityId, []);
    }
    translationsByMessage.get(translation.entityId)!.push(translation);
  }

  return messages.map(message => {
    const messageTranslations = translationsByMessage.get(message.id) || [];
    const translated = { ...message };
    for (const t of messageTranslations) {
      if (['title', 'content', 'keyPoints'].includes(t.fieldName)) {
        translated[t.fieldName] = t.translatedText;
      }
    }
    return translated;
  });
}

export function registerParentMessageRoutes(app: Express): void {
  app.get("/api/parent-messages", async (req: Request, res: Response) => {
    try {
      const lang = req.query.lang as string;
      let messages = await storage.getParentMessages(30);
      messages = await applyTranslationsToMessages(messages, lang);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching parent messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.get("/api/admin/parent-messages", async (req: Request, res: Response) => {
    try {
      const now = Date.now();
      if (parentMessagesCache && (now - parentMessagesCache.timestamp) < CACHE_TTL) {
        return res.json(parentMessagesCache.data);
      }
      const messages = await storage.getAllParentMessages(30);
      parentMessagesCache = { data: messages, timestamp: now };
      res.json(messages);
    } catch (error) {
      console.error("Error fetching all parent messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/admin/parent-messages/fix-thumbnails", async (req: Request, res: Response) => {
    try {
      const fixed = await fixMissingThumbnails();
      clearParentMessagesCache();
      res.json({ success: true, fixed });
    } catch (error) {
      console.error("Error fixing thumbnails:", error);
      res.status(500).json({ error: "Failed to fix thumbnails" });
    }
  });

  app.get("/api/parent-messages/today", async (req: Request, res: Response) => {
    try {
      const lang = req.query.lang as string;
      const cacheKey = `pm-today-${lang || 'so'}`;
      const cached = todayCache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        return res.json(cached.data);
      }
      let message = await storage.getTodayParentMessage();
      if (!message) {
        return res.status(404).json({ error: "Dhambaalka maanta lama helin" });
      }
      const translated = await applyTranslationsToMessages([message], lang);
      const result = translated[0];
      todayCache.set(cacheKey, { data: result, expiry: Date.now() + 120000 });
      res.json(result);
    } catch (error) {
      console.error("Error fetching today's message:", error);
      res.status(500).json({ error: "Failed to fetch message" });
    }
  });

  app.get("/api/parent-messages/:id", async (req: Request, res: Response) => {
    try {
      const lang = req.query.lang as string;
      let message = await storage.getParentMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      const translated = await applyTranslationsToMessages([message], lang);
      res.json(translated[0]);
    } catch (error) {
      console.error("Error fetching message:", error);
      res.status(500).json({ error: "Failed to fetch message" });
    }
  });

  app.post("/api/parent-messages/generate", async (req: Request, res: Response) => {
    try {
      await generateAndSaveParentMessage();
      const message = await storage.getParentMessageByDate(getSomaliaToday());
      res.json(message);
    } catch (error) {
      console.error("Error generating message:", error);
      res.status(500).json({ error: "Failed to generate message" });
    }
  });

  app.patch("/api/parent-messages/:id", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const parent = await storage.getParent(parentId);
      if (!parent?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { title, content, keyPoints, isPublished, messageDate } = req.body;
      const updateData: Partial<InsertParentMessage> = {};
      
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (keyPoints !== undefined) updateData.keyPoints = keyPoints;
      if (isPublished !== undefined) updateData.isPublished = isPublished;
      if (messageDate !== undefined) updateData.messageDate = messageDate;

      const updated = await storage.updateParentMessage(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // Republish a parent message (updates the updatedAt timestamp)
  app.post("/api/parent-messages/:id/republish", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const parent = await storage.getParent(parentId);
      if (!parent?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const message = await storage.getParentMessage(id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Update the message with new timestamp and ensure published
      const updated = await storage.updateParentMessageWithTimestamp(id, { 
        isPublished: true 
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Failed to republish message" });
      }

      console.log(`[DHAMBAAL] Republished message: ${updated.title}`);
      res.json(updated);
    } catch (error) {
      console.error("Error republishing message:", error);
      res.status(500).json({ error: "Failed to republish message" });
    }
  });

  app.post("/api/parent-messages/:id/generate-audio", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const parent = await storage.getParent(parentId);
      if (!parent?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const message = await storage.getParentMessage(id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      console.log(`[TTS] Generating audio for message: ${message.title}`);
      const audioUrl = await generateParentMessageAudio(message.content, message.id);
      
      const updated = await storage.updateParentMessage(id, { audioUrl });
      console.log(`[TTS] Audio generated and saved for message ${id}`);
      
      res.json(updated);
    } catch (error) {
      console.error("Error generating audio:", error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // === Content Engagement Routes ===

  // Get reactions for a message
  app.get("/api/parent-messages/:id/reactions", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      const data = await storage.getContentReactions("parent_message", req.params.id, parentId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  // Add/update reaction
  app.post("/api/parent-messages/:id/reactions", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { reactionType } = req.body;
      if (!["love", "like", "dislike", "sparkle"].includes(reactionType)) {
        return res.status(400).json({ error: "Invalid reaction type" });
      }
      const reaction = await storage.upsertContentReaction(parentId, "parent_message", req.params.id, reactionType);
      res.json(reaction);
    } catch (error) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  // Remove reaction
  app.delete("/api/parent-messages/:id/reactions", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      await storage.removeContentReaction(parentId, "parent_message", req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  // Get comments for a message
  app.get("/api/parent-messages/:id/comments", async (req: Request, res: Response) => {
    try {
      const comments = await storage.getContentComments("parent_message", req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Add comment
  app.post("/api/parent-messages/:id/comments", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { body, replyToId } = req.body;
      if (!body || body.trim().length === 0) {
        return res.status(400).json({ error: "Comment body is required" });
      }
      const comment = await storage.createContentComment({
        parentId,
        contentType: "parent_message",
        contentId: req.params.id,
        body: body.trim(),
        replyToId: replyToId || null,
        isHidden: false,
      });
      res.json(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Delete comment
  app.delete("/api/parent-messages/:id/comments/:commentId", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      await storage.deleteContentComment(req.params.commentId, parentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Delete parent message (admin only)
  app.delete("/api/admin/parent-messages/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan soo gal" });
      }
      const parent = await storage.getParent(req.session.parentId);
      if (!parent?.isAdmin) {
        return res.status(403).json({ error: "Admin kaliya ayaa tirtiri kara" });
      }
      
      await storage.deleteParentMessage(req.params.id);
      res.json({ success: true, message: "Dhambaalka waa la tirtiray" });
    } catch (error) {
      console.error("Error deleting parent message:", error);
      res.status(500).json({ error: "Failed to delete parent message" });
    }
  });

  console.log("[Parent Messages] Routes registered");
}
