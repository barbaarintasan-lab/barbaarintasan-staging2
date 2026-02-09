import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import type { InsertBedtimeStory } from "@shared/schema";
import { generateBedtimeStoryAudio } from "./tts";
import { saveMaaweelToGoogleDrive } from "./googleDrive";
import OpenAI from "openai";

// Use Replit AI Integration on Replit, fallback to direct OpenAI on Fly.io
const useReplitIntegration = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
console.log(`[Bedtime Stories] OpenAI config: ${useReplitIntegration ? 'Replit Integration' : 'Direct OpenAI API'}`);

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  ...(useReplitIntegration ? { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL } : {}),
});

const SAHABI_CHARACTERS = [
  { name: "Bilaal ibn Rabaah", nameSomali: "Bilaal bin Rabaah", type: "sahabi" },
  { name: "Khaalid ibn Al-Waliid", nameSomali: "Khaalid bin Al-Waliid", type: "sahabi" },
  { name: "Abu Bakr As-Sidiiq", nameSomali: "Abuu Bakr As-Sidiiq", type: "sahabi" },
  { name: "Umar ibn Al-Khattaab", nameSomali: "Cumar bin Al-Khattaab", type: "sahabi" },
  { name: "Uthmaan ibn Affaan", nameSomali: "Cuthmaan bin Caffaan", type: "sahabi" },
  { name: "Ali ibn Abi Taalib", nameSomali: "Cali bin Abi Taalib", type: "sahabi" },
  { name: "Salmaan Al-Faarisi", nameSomali: "Salmaan Al-Faarisi", type: "sahabi" },
  { name: "Abu Dharr Al-Ghifaari", nameSomali: "Abuu Dharr Al-Ghifaari", type: "sahabi" },
  { name: "Mus'ab ibn Umair", nameSomali: "Muscab bin Cumair", type: "sahabi" },
  { name: "Abdullaah ibn Masud", nameSomali: "Cabdullaahi bin Mascuud", type: "sahabi" },
];

const TABIYIN_CHARACTERS = [
  { name: "Uways Al-Qarni", nameSomali: "Uways Al-Qarni", type: "tabiyin" },
  { name: "Saeed ibn Al-Musayyib", nameSomali: "Saciid bin Al-Musayyib", type: "tabiyin" },
  { name: "Al-Hasan Al-Basri", nameSomali: "Al-Xasan Al-Basri", type: "tabiyin" },
  { name: "Muhammad ibn Sireen", nameSomali: "Maxamed bin Siriin", type: "tabiyin" },
];

const MIN_NIGHTS_PER_CHARACTER = 3;

function getRandomCharacter() {
  const allCharacters = [...SAHABI_CHARACTERS, ...TABIYIN_CHARACTERS];
  return allCharacters[Math.floor(Math.random() * allCharacters.length)];
}

async function selectCharacterForToday(): Promise<{ name: string; nameSomali: string; type: string }> {
  const recentStories = await storage.getBedtimeStories(MIN_NIGHTS_PER_CHARACTER);
  
  if (recentStories.length === 0) {
    console.log(`[Bedtime Stories] No previous stories, selecting random character`);
    return getRandomCharacter();
  }

  const lastCharacter = recentStories[0].characterName;
  
  let consecutiveCount = 0;
  for (const story of recentStories) {
    if (story.characterName === lastCharacter) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  console.log(`[Bedtime Stories] Last character: ${lastCharacter}, consecutive nights: ${consecutiveCount}`);

  const allCharacters = [...SAHABI_CHARACTERS, ...TABIYIN_CHARACTERS];
  const existingCharacter = allCharacters.find(c => c.nameSomali === lastCharacter);

  if (consecutiveCount < MIN_NIGHTS_PER_CHARACTER && existingCharacter) {
    console.log(`[Bedtime Stories] Continuing with ${lastCharacter} (${consecutiveCount}/${MIN_NIGHTS_PER_CHARACTER} nights)`);
    return existingCharacter;
  }

  if (!existingCharacter) {
    console.log(`[Bedtime Stories] Character ${lastCharacter} not in roster, selecting random`);
    return getRandomCharacter();
  }

  console.log(`[Bedtime Stories] ${lastCharacter} completed ${MIN_NIGHTS_PER_CHARACTER}+ nights, selecting new character`);
  const otherCharacters = allCharacters.filter(c => c.nameSomali !== lastCharacter);
  return otherCharacters[Math.floor(Math.random() * otherCharacters.length)];
}

async function generateStoryText(character: { name: string; nameSomali: string; type: string }, previousTitles: string[] = []): Promise<{ title: string; titleSomali: string; content: string; moralLesson: string }> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const characterType = character.type === "sahabi" ? "Saxaabiga Nabiga Muxammad (Nabadgalyo iyo Naxariisi korkiisa ha ahaatee)" : "Taabiciin (kuwa Saxaabada raacay)";

  const avoidanceClause = previousTitles.length > 0 
    ? `\n\nMUHIIM: Ha qorin sheeko la mid ah kuwan hore ee ${character.nameSomali}:\n${previousTitles.map((t, i) => `${i + 1}. "${t}"`).join('\n')}\n\nQor sheeko cusub oo mowduuc kala duwan - tusaale: saxansaxo, waxbarasho, saaxiibtinimo, run sheegid, waalidin maamuus, dulqaad, dedaal, ama sheeko kale oo xiiso leh.`
    : '';

  const prompt = `Waxaad tahay qoraa Soomaaliyeed oo sheekooyin caruurta u qora. Qor sheeko hurdo oo Soomaali ah caruurta da'doodu tahay 3-8 sano oo ku saabsan ${character.nameSomali} (${character.name}), oo ahaa ${characterType}.

Sheekadu waa inay:
1. Oo dhan loo qoro Soomaaliga
2. U haboon tahay caruurta da'doodu tahay 3-8 sano
3. Tahay 300-400 ereyood
4. Ku jirto cashar wanaagsan oo Islaamka ka yimid
5. Isticmaasho ereyyo Soomaali ah oo fudud oo caruurtu fahmi karaan
6. Noqoto mid xiiso leh oo hurdo ku haboon
7. Ku dhammaato cashar fudud oo waalidku carruurta kala hadli karo${avoidanceClause}

MUHIIM: Marka la sheego Nabiga Muxammad, mar walba ku qor "Nabadgalyo iyo Naxariisi korkiisa ha ahaatee" - ha isticmaalin soo gaabinta sida "scw" ama "PBUH".

MUHIIM: Dhamaadka sheekada ku dar saxiixa sidan:
"Mahadsanidiin!

Muuse Siciid Aw-Muuse
Aasaasaha Barbaarintasan Akademi"

Ka jawaab qaabkan JSON ah:
{
  "title": "Cinwaanka Ingiriisiga",
  "titleSomali": "Cinwaanka Soomaaliga",
  "content": "Sheekada oo dhan Soomaaliga...",
  "moralLesson": "Casharka sheekada Soomaaliga (1-2 jumlado)"
}`;

  console.log("[Bedtime Stories] Generating text with GPT-4o...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a Somali storyteller who writes Islamic bedtime stories for children aged 3-8. Always respond with valid JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 2048,
    response_format: { type: "json_object" }
  });

  const textContent = response.choices?.[0]?.message?.content;
  
  if (!textContent) {
    throw new Error("No story content generated");
  }
  
  console.log("[Bedtime Stories] GPT-4o response received");

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Bedtime Stories] Raw response:", textContent.slice(0, 500));
    throw new Error("Could not parse story JSON");
  }

  let jsonStr = jsonMatch[0];
  
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
    // Strategy 1: Parse as-is
    () => JSON.parse(jsonStr),
    // Strategy 2: Escape newlines inside string values properly
    () => {
      const cleaned = escapeNewlinesInStrings(jsonStr);
      return JSON.parse(cleaned);
    },
    // Strategy 3: Replace all newlines with escaped versions
    () => {
      const cleaned = jsonStr
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return JSON.parse(cleaned);
    },
    // Strategy 4: Simple control char replacement
    () => {
      const cleaned = jsonStr.replace(/[\x00-\x1F\x7F\n\r\t]/g, ' ');
      return JSON.parse(cleaned);
    },
    // Strategy 5: Extract fields using flexible regex  
    () => {
      const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
      const titleSomaliMatch = jsonStr.match(/"titleSomali"\s*:\s*"([^"]+)"/);
      
      // Extract content between "content": " and "moralLesson"
      let contentMatch = jsonStr.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"moralLesson"/);
      if (!contentMatch) {
        const contentStart = jsonStr.indexOf('"content"');
        const moralStart = jsonStr.indexOf('"moralLesson"');
        if (contentStart !== -1 && moralStart !== -1) {
          const contentSection = jsonStr.slice(contentStart, moralStart);
          const valueMatch = contentSection.match(/"content"\s*:\s*"([\s\S]*)"\s*,?\s*$/);
          if (valueMatch) {
            contentMatch = [valueMatch[0], valueMatch[1]];
          }
        }
      }
      
      let moralMatch = jsonStr.match(/"moralLesson"\s*:\s*"([^"]+)"/);
      if (!moralMatch) {
        const moralStart = jsonStr.indexOf('"moralLesson"');
        if (moralStart !== -1) {
          const moralSection = jsonStr.slice(moralStart);
          const valueMatch = moralSection.match(/"moralLesson"\s*:\s*"([\s\S]*?)"\s*\}/);
          if (valueMatch) {
            moralMatch = [valueMatch[0], valueMatch[1].replace(/[\n\r]/g, ' ')];
          }
        }
      }
      
      if (!titleMatch || !titleSomaliMatch || !contentMatch) {
        console.log("[Bedtime Stories] Regex extraction failed - title:", !!titleMatch, "titleSomali:", !!titleSomaliMatch, "content:", !!contentMatch);
        throw new Error("Could not extract required fields");
      }
      
      return {
        title: titleMatch[1],
        titleSomali: titleSomaliMatch[1],
        content: contentMatch[1].replace(/\\n/g, '\n').replace(/[\x00-\x1F\x7F]/g, ' '),
        moralLesson: moralMatch ? moralMatch[1].replace(/[\n\r]/g, ' ') : "Waxbarasho muhiim ah"
      };
    }
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = strategies[i]();
      if (result.title && result.titleSomali && result.content) {
        console.log(`[Bedtime Stories] JSON parsed with strategy ${i + 1}`);
        if (!result.moralLesson) {
          result.moralLesson = "Waxbarasho muhiim ah";
        }
        return result;
      }
    } catch (e) {
      console.log(`[Bedtime Stories] Strategy ${i + 1} failed:`, (e as Error).message);
    }
  }
  
  console.error("[Bedtime Stories] All parse strategies failed. Raw JSON:", jsonStr.slice(0, 800));
  throw new Error("Could not parse story JSON after all strategies");
}

async function generateStoryImage(scene: string, characterName: string): Promise<string> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Somali family illustration for children's bedtime story. ${scene}. Features a Somali father in comfortable home clothes (macawis/sarong or casual pants), Somali mother in elegant dirac and garbasaar headscarf, and happy Somali children. Art style: warm, colorful, child-friendly cartoon illustration. Setting: cozy traditional Somali home interior with Islamic decorations. Mood: gentle, peaceful, loving family moment. Character ${characterName} mentioned in story shown as respectful historical figure. Safe for children ages 3-8.`;

  console.log("[Bedtime Stories] Generating image with gpt-image-1...");

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
  });

  if (response.data && response.data.length > 0 && response.data[0].b64_json) {
    console.log("[Bedtime Stories] Image generated successfully");
    return `data:image/png;base64,${response.data[0].b64_json}`;
  }
  
  throw new Error("No image generated");
}

export async function generateDailyBedtimeStory(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const existingStory = await storage.getBedtimeStoryByDate(today);
  if (existingStory) {
    console.log(`[Bedtime Stories] Story already exists for ${today}`);
    return;
  }

  console.log(`[Bedtime Stories] Generating new story for ${today}...`);

  try {
    const character = await selectCharacterForToday();
    console.log(`[Bedtime Stories] Selected character: ${character.nameSomali}`);

    const recentStories = await storage.getBedtimeStories(10);
    const previousTitles = recentStories
      .filter(s => s.characterName === character.nameSomali)
      .map(s => s.titleSomali);
    console.log(`[Bedtime Stories] Previous titles for ${character.nameSomali}: ${previousTitles.length}`);

    const storyText = await generateStoryText(character, previousTitles);
    console.log(`[Bedtime Stories] Generated story: ${storyText.titleSomali}`);

    const imageScenes = [
      "Father gathering children for bedtime story, sitting on floor cushions",
      "Children listening attentively with wide eyes and smiles",
    ];

    const images: string[] = [];
    for (const scene of imageScenes) {
      try {
        const imageUrl = await generateStoryImage(scene, character.nameSomali);
        images.push(imageUrl);
        console.log(`[Bedtime Stories] Generated image ${images.length}/2`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Bedtime Stories] Failed to generate image for scene: ${scene}`, error);
      }
    }

    const storyData: InsertBedtimeStory = {
      title: storyText.title,
      titleSomali: storyText.titleSomali,
      content: storyText.content,
      characterName: character.nameSomali,
      characterType: character.type,
      moralLesson: storyText.moralLesson,
      ageRange: "3-8",
      images,
      storyDate: today,
      isPublished: true, // Auto-publish for daily cron job
    };

    const newStory = await storage.createBedtimeStory(storyData);
    console.log(`[Bedtime Stories] Successfully created story: ${storyText.titleSomali}`);

    try {
      console.log(`[Bedtime Stories] Generating audio (Ubax voice)...`);
      const audioUrl = await generateBedtimeStoryAudio(newStory.content, newStory.moralLesson, newStory.id);
      await storage.updateBedtimeStory(newStory.id, { audioUrl });
      console.log(`[Bedtime Stories] Audio generated and saved`);
    } catch (audioError) {
      console.error(`[Bedtime Stories] Audio generation failed (story saved without audio):`, audioError);
    }
    
    // Backup to Google Drive
    try {
      await saveMaaweelToGoogleDrive(
        storyText.titleSomali,
        storyText.content,
        character.nameSomali,
        storyText.moralLesson,
        today
      );
      console.log(`[Bedtime Stories] Backed up to Google Drive`);
    } catch (driveError) {
      console.error(`[Bedtime Stories] Google Drive backup failed:`, driveError);
    }
  } catch (error: any) {
    if (error?.code === '23505' || error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
      console.log(`[Bedtime Stories] Story already exists for ${today} (caught duplicate insert)`);
      return;
    }
    console.error("[Bedtime Stories] Failed to generate daily story:", error);
    throw error;
  }
}

// Cache for admin bedtime stories (module-level for clearing)
let bedtimeStoriesCache: { data: any[]; timestamp: number } | null = null;
const STORIES_CACHE_TTL = 30000; // 30 seconds

export function clearBedtimeStoriesCache(): void {
  bedtimeStoriesCache = null;
  console.log("[Bedtime Stories] Cache cleared");
}

export function registerBedtimeStoryRoutes(app: Express): void {
  app.get("/api/bedtime-stories", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const stories = await storage.getBedtimeStories(limit);
      res.json(stories);
    } catch (error) {
      console.error("Error fetching bedtime stories:", error);
      res.status(500).json({ error: "Failed to fetch stories" });
    }
  });
  
  app.get("/api/admin/bedtime-stories", async (req: Request, res: Response) => {
    try {
      const now = Date.now();
      if (bedtimeStoriesCache && (now - bedtimeStoriesCache.timestamp) < STORIES_CACHE_TTL) {
        return res.json(bedtimeStoriesCache.data);
      }
      const limit = parseInt(req.query.limit as string) || 30;
      const stories = await storage.getAllBedtimeStories(limit);
      bedtimeStoriesCache = { data: stories, timestamp: now };
      res.json(stories);
    } catch (error) {
      console.error("Error fetching all bedtime stories:", error);
      res.status(500).json({ error: "Failed to fetch stories" });
    }
  });

  app.get("/api/bedtime-stories/today", async (req: Request, res: Response) => {
    try {
      const story = await storage.getTodayBedtimeStory();
      if (!story) {
        return res.status(404).json({ error: "No story available for today" });
      }
      res.json(story);
    } catch (error) {
      console.error("Error fetching today's story:", error);
      res.status(500).json({ error: "Failed to fetch story" });
    }
  });

  app.get("/api/bedtime-stories/:id", async (req: Request, res: Response) => {
    try {
      const story = await storage.getBedtimeStory(req.params.id);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      res.json(story);
    } catch (error) {
      console.error("Error fetching story:", error);
      res.status(500).json({ error: "Failed to fetch story" });
    }
  });

  app.post("/api/bedtime-stories/generate", async (req: Request, res: Response) => {
    try {
      await generateDailyBedtimeStory();
      const story = await storage.getTodayBedtimeStory();
      res.json(story);
    } catch (error) {
      console.error("Error generating story:", error);
      res.status(500).json({ error: "Failed to generate story" });
    }
  });

  app.patch("/api/bedtime-stories/:id", async (req: Request, res: Response) => {
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
      const { titleSomali, content, moralLesson, isPublished, storyDate } = req.body;

      const updateData: Record<string, any> = {};
      if (titleSomali !== undefined) updateData.titleSomali = titleSomali;
      if (content !== undefined) updateData.content = content;
      if (moralLesson !== undefined) updateData.moralLesson = moralLesson;
      if (isPublished !== undefined) updateData.isPublished = isPublished;
      if (storyDate !== undefined) updateData.storyDate = storyDate;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const updated = await storage.updateBedtimeStory(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Story not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating story:", error);
      res.status(500).json({ error: "Failed to update story" });
    }
  });

  // Republish a bedtime story (updates the updatedAt timestamp)
  app.post("/api/bedtime-stories/:id/republish", async (req: Request, res: Response) => {
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
      const story = await storage.getBedtimeStory(id);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      // Update the story with new timestamp and ensure published
      const updated = await storage.updateBedtimeStoryWithTimestamp(id, { 
        isPublished: true 
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Failed to republish story" });
      }

      console.log(`[MAAWEELO] Republished story: ${updated.titleSomali}`);
      res.json(updated);
    } catch (error) {
      console.error("Error republishing story:", error);
      res.status(500).json({ error: "Failed to republish story" });
    }
  });

  app.post("/api/bedtime-stories/:id/generate-audio", async (req: Request, res: Response) => {
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
      const story = await storage.getBedtimeStory(id);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      console.log(`[TTS] Generating audio for story: ${story.titleSomali}`);
      const audioUrl = await generateBedtimeStoryAudio(story.content, story.moralLesson, story.id);
      
      const updated = await storage.updateBedtimeStory(id, { audioUrl });
      console.log(`[TTS] Audio generated and saved for story ${id}`);
      
      res.json(updated);
    } catch (error) {
      console.error("Error generating audio:", error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // === Content Engagement Routes ===

  // Get reactions for a story
  app.get("/api/bedtime-stories/:id/reactions", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      const data = await storage.getContentReactions("bedtime_story", req.params.id, parentId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  // Add/update reaction
  app.post("/api/bedtime-stories/:id/reactions", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { reactionType } = req.body;
      if (!["love", "like", "dislike", "sparkle"].includes(reactionType)) {
        return res.status(400).json({ error: "Invalid reaction type" });
      }
      const reaction = await storage.upsertContentReaction(parentId, "bedtime_story", req.params.id, reactionType);
      res.json(reaction);
    } catch (error) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  // Remove reaction
  app.delete("/api/bedtime-stories/:id/reactions", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      await storage.removeContentReaction(parentId, "bedtime_story", req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  // Get comments for a story
  app.get("/api/bedtime-stories/:id/comments", async (req: Request, res: Response) => {
    try {
      const comments = await storage.getContentComments("bedtime_story", req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Add comment
  app.post("/api/bedtime-stories/:id/comments", async (req: Request, res: Response) => {
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
        contentType: "bedtime_story",
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
  app.delete("/api/bedtime-stories/:id/comments/:commentId", async (req: Request, res: Response) => {
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

  // Get reactions for a comment
  app.get("/api/comments/:commentId/reactions", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      const data = await storage.getCommentReactions(req.params.commentId, parentId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching comment reactions:", error);
      res.status(500).json({ error: "Failed to fetch comment reactions" });
    }
  });

  // Add/update reaction to a comment
  app.post("/api/comments/:commentId/reactions", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { reactionType } = req.body;
      if (!["love", "like", "dislike", "sparkle"].includes(reactionType)) {
        return res.status(400).json({ error: "Invalid reaction type" });
      }
      
      // Get the comment to find its author for notification
      const comment = await storage.getCommentById(req.params.commentId);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      
      const reaction = await storage.upsertCommentReaction(parentId, req.params.commentId, reactionType);
      
      // Send notification to comment author (if not reacting to own comment)
      if (comment.parentId !== parentId) {
        const reactorParent = await storage.getParent(parentId);
        const reactionEmojis: Record<string, string> = {
          love: "❤️",
          like: "👍",
          dislike: "👎",
          sparkle: "✨"
        };
        await storage.createParentNotification({
          parentId: comment.parentId,
          type: "comment_reaction",
          title: "Faalladaada waa la jecel yahay!",
          body: `${reactorParent?.name || "Waalid"} ${reactionEmojis[reactionType]} ayuu ku raaciyay faalladaada`,
          payload: JSON.stringify({ commentId: req.params.commentId, reactionType, reactorId: parentId }),
        });
      }
      
      res.json(reaction);
    } catch (error) {
      console.error("Error adding comment reaction:", error);
      res.status(500).json({ error: "Failed to add comment reaction" });
    }
  });

  // Remove reaction from a comment
  app.delete("/api/comments/:commentId/reactions", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      await storage.removeCommentReaction(parentId, req.params.commentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing comment reaction:", error);
      res.status(500).json({ error: "Failed to remove comment reaction" });
    }
  });

  // Delete bedtime story (admin only)
  app.delete("/api/admin/bedtime-stories/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan soo gal" });
      }
      const parent = await storage.getParent(req.session.parentId);
      if (!parent?.isAdmin) {
        return res.status(403).json({ error: "Admin kaliya ayaa tirtiri kara" });
      }
      
      await storage.deleteBedtimeStory(req.params.id);
      res.json({ success: true, message: "Sheekada waa la tirtiray" });
    } catch (error) {
      console.error("Error deleting bedtime story:", error);
      res.status(500).json({ error: "Failed to delete bedtime story" });
    }
  });
}
