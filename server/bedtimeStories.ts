import type { Express, Request, Response } from "express";
import { createHash } from "crypto";
import { storage } from "./storage";
import type { InsertBedtimeStory } from "@shared/schema";
import { generateBedtimeStoryAudio } from "./tts";
import { saveMaaweelToGoogleDrive, searchMaaweelByCharacter } from "./googleDrive";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { translations } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { isSomaliLanguage, normalizeLanguageCode } from "./utils/translations";
import { uploadToR2, isR2Configured } from "./r2Storage";

function getSomaliaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Mogadishu' });
}

// Use Replit AI Integration on Replit, fallback to direct OpenAI on Fly.io
const useReplitIntegration = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
console.log(`[Bedtime Stories] OpenAI config: ${useReplitIntegration ? 'Replit Integration' : 'Direct OpenAI API'}`);

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  ...(useReplitIntegration ? { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL } : {}),
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const useGemini = !!GEMINI_API_KEY;
console.log(`[Bedtime Stories] Gemini config: ${useGemini ? 'Available (primary)' : 'Not configured (using OpenAI only)'}`);

function getGeminiAI(): GoogleGenAI | null {
  if (!GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

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

async function generateStoryTextWithGemini(character: { name: string; nameSomali: string; type: string }, previousTitles: string[] = []): Promise<{ title: string; titleSomali: string; content: string; moralLesson: string }> {
  const ai = getGeminiAI();
  if (!ai) throw new Error("Gemini API key not configured");

  const characterType = character.type === "sahabi" ? "Saxaabiga Nabiga Muxammad (Nabadgalyo iyo Naxariisi korkiisa ha ahaatee)" : "Taabiciin (kuwa Saxaabada raacay)";
  
  const avoidanceClause = previousTitles.length > 0 
    ? `\n\nMUHIIM: Ha qorin sheeko la mid ah kuwan hore ee ${character.nameSomali}:\n${previousTitles.map((t, i) => `${i + 1}. "${t}"`).join('\n')}\n\nQor sheeko cusub oo mowduuc kala duwan.`
    : '';

  const prompt = `Qor sheeko gaaban oo ku saabsan ${character.nameSomali} (${character.name}), oo ahaa ${characterType}, oo loogu talagalay carruurta da'doodu u dhaxayso 6 bilood ilaa 13 sano.
Sheekadu waa inay ahaataa mid run ah oo ku saleysan taariikhda Islaamka.
Luqadda waa inay ahaataa Af-Soomaali fudud oo carruurtu fahmi karaan.
Ka dhig mid xiiso leh oo habeenkii hurdada ka hor loo akhriyo.
MUHIIM: Sheekada ku bilaaw 'Caawa waxaan idiinka sheekaynayaa...'.
Ha isticmaalin ereyo adag.
Sheekadu waa inay ku dhamaataa cashar wanaagsan iyo ducadan: 'aan ku salino Nabigeeni Muxammed Salalaahu Caleyhi Wasalam, aana akhrino ducadii hurdada Bismikalaahu ma Amuutu wa Axyaa'.${avoidanceClause}

Dhamaadka sheekada ku dar:
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

  console.log("[Bedtime Stories] Generating text with Gemini 2.5 Flash...");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: prompt,
    config: {
      systemInstruction: "Waxaad tahay qoraa sheekooyinka carruurta oo ku takhasusay sheekooyinka cawayska iyo taariikhda Islaamka. Waxaad u qortaa sheekooyinka Af-Soomaali aad u macaan oo fudud. MUHIIM: Sheekada ku bilaaw 'Caawa waxaan idiinka sheekaynayaa'. Sheekada ku dhameey 'aan ku salino Nabigeeni Muxammed Salalaahu Caleyhi Wasalam, aana akhrino ducadii hurdada Bismikalaahu ma Amuutu wa Axyaa'. Weligaa ha ku darin wax sawir ah oo muujinaya Nebiga (NNKH) ama Malaa'igta, sidoo kale qoraalkaagu waa inuu ahaadaa mid xushmad leh oo waafaqsan mabaadi'da Islaamka. Always respond with valid JSON containing title, titleSomali, content, and moralLesson fields.",
      temperature: 0.8,
    }
  });

  const textContent = response.text;
  if (!textContent) throw new Error("No story content from Gemini");

  console.log("[Bedtime Stories] Gemini response received");

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse Gemini story JSON");

  const parsed = JSON.parse(jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, ' '));
  if (!parsed.title || !parsed.titleSomali || !parsed.content) {
    throw new Error("Gemini response missing required fields");
  }
  if (!parsed.moralLesson) parsed.moralLesson = "Waxbarasho muhiim ah";

  return parsed;
}

async function generateStoryImageWithGemini(scene: string, characterName: string): Promise<string> {
  const ai = getGeminiAI();
  if (!ai) throw new Error("Gemini API key not configured");

  const prompt = `A beautiful, soft, child-friendly cartoon illustration for a children's book about Islamic history. Theme: ${scene}. Character: ${characterName}. Character Appearance: The people should look Somali, with Somali features and skin tones. Clothing: Men and boys should wear traditional Somali attire, specifically a 'Macawis' and a shirt ('Shaar'). STRICT RELIGIOUS REQUIREMENT: NEVER depict the Prophet Muhammad (PBUH), any other Prophets, or Angels in any human or physical form. Use symbolic representations such as a beautiful glowing light or nature. Style: warm colors, watercolor texture, gentle and peaceful atmosphere.`;

  console.log("[Bedtime Stories] Generating image with Gemini...");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: {
        parts: [{ text: prompt }],
      },
    } as any);

    for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        console.log("[Bedtime Stories] Gemini image generated successfully");
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in Gemini response");
  } catch (error) {
    console.error("[Bedtime Stories] Gemini image generation failed:", error);
    throw error;
  }
}

async function generateStoryText(character: { name: string; nameSomali: string; type: string }, previousTitles: string[] = []): Promise<{ title: string; titleSomali: string; content: string; moralLesson: string }> {
  if (useGemini) {
    try {
      return await generateStoryTextWithGemini(character, previousTitles);
    } catch (geminiError: any) {
      console.error("[Bedtime Stories] Gemini text generation failed, falling back to GPT-4o:", geminiError?.message || geminiError);
    }
  }

  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("No AI API key configured (neither Gemini nor OpenAI)");
  }

  const characterType = character.type === "sahabi" ? "Saxaabiga Nabiga Muxammad (Nabadgalyo iyo Naxariisi korkiisa ha ahaatee)" : "Taabiciin (kuwa Saxaabada raacay)";

  const avoidanceClause = previousTitles.length > 0 
    ? `\n\nMUHIIM: Ha qorin sheeko la mid ah kuwan hore ee ${character.nameSomali}:\n${previousTitles.map((t, i) => `${i + 1}. "${t}"`).join('\n')}\n\nQor sheeko cusub oo mowduuc kala duwan - tusaale: saxansaxo, waxbarasho, saaxiibtinimo, run sheegid, waalidin maamuus, dulqaad, dedaal, ama sheeko kale oo xiiso leh.`
    : '';

  const prompt = `Qor sheeko gaaban oo ku saabsan ${character.nameSomali} (${character.name}), oo ahaa ${characterType}, oo loogu talagalay carruurta da'doodu u dhaxayso 6 bilood ilaa 13 sano.
Sheekadu waa inay ahaataa mid run ah oo ku saleysan taariikhda Islaamka.
Luqadda waa inay ahaataa Af-Soomaali fudud oo carruurtu fahmi karaan.
Ka dhig mid xiiso leh oo habeenkii hurdada ka hor loo akhriyo.
MUHIIM: Sheekada ku bilaaw 'Caawa waxaan idiinka sheekaynayaa...'.
Ha isticmaalin ereyo adag.
Sheekadu waa inay ku dhamaataa cashar wanaagsan iyo ducadan: 'aan ku salino Nabigeeni Muxammed Salalaahu Caleyhi Wasalam, aana akhrino ducadii hurdada Bismikalaahu ma Amuutu wa Axyaa'.${avoidanceClause}

Dhamaadka sheekada ku dar:
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
        content: "Waxaad tahay qoraa sheekooyinka carruurta oo ku takhasusay sheekooyinka cawayska iyo taariikhda Islaamka. Waxaad u qortaa sheekooyinka Af-Soomaali aad u macaan oo fudud. MUHIIM: Sheekada ku bilaaw 'Caawa waxaan idiinka sheekaynayaa'. Sheekada ku dhameey 'aan ku salino Nabigeeni Muxammed Salalaahu Caleyhi Wasalam, aana akhrino ducadii hurdada Bismikalaahu ma Amuutu wa Axyaa'. Weligaa ha ku darin wax sawir ah oo muujinaya Nebiga (NNKH) ama Malaa'igta, sidoo kale qoraalkaagu waa inuu ahaadaa mid xushmad leh oo waafaqsan mabaadi'da Islaamka. Always respond with valid JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 4096,
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
  if (useGemini) {
    try {
      return await generateStoryImageWithGemini(scene, characterName);
    } catch (geminiError: any) {
      console.error("[Bedtime Stories] Gemini image failed, falling back to gpt-image-1:", geminiError?.message || geminiError);
    }
  }

  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("No AI API key configured for image generation");
  }

  const prompt = `A beautiful, soft, child-friendly cartoon illustration for a children's book about Islamic history. Theme: ${scene}. Character: ${characterName}. Character Appearance: The people should look Somali, with Somali features and skin tones. Clothing: Men and boys should wear traditional Somali attire, specifically a 'Macawis' and a shirt ('Shaar'). STRICT RELIGIOUS REQUIREMENT: NEVER depict the Prophet Muhammad (PBUH), any other Prophets, or Angels in any human or physical form. Use symbolic representations such as a beautiful glowing light or nature. Style: warm colors, watercolor texture, gentle and peaceful atmosphere.`;

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

function buildFallbackStoryText(character: { name: string; nameSomali: string; type: string }): { title: string; titleSomali: string; content: string; moralLesson: string } {
  const titleSomali = `Sheeko ku Saabsan ${character.nameSomali}`;
  const title = `Story of ${character.name}`;
  const content = `Caawa waxaan idiinka sheekaynayaa ${character.nameSomali}.

Wuxuu ahaa qof iimaan leh, akhlaaq wanaagsan leh, oo dadka ku dhiirri geliya samir iyo run sheegid. Sheekadiisu waxay ina xasuusinaysaa in caruurtu bartaan edeb, naxariis, iyo xushmad.

Marka qoyska oo dhan is maqlo oo wada hadlo, ilmuhu wuxuu bartaa kalsooni, jacayl, iyo anshax. Talo yar: habeen kasta waqti gaaban u qoondee sheeko iyo duco.

aan ku salino Nabigeeni Muxammed Salalaahu Caleyhi Wasalam, aana akhrino ducadii hurdada Bismikalaahu ma Amuutu wa Axyaa.

Mahadsanidiin!

Muuse Siciid Aw-Muuse
Aasaasaha Barbaarintasan Akademi`;
  const moralLesson = "Samir, akhlaaq wanaagsan, iyo ixtiraam waalid waa furaha guusha.";
  return { title, titleSomali, content, moralLesson };
}

function buildFallbackImageDataUrl(title: string, subtitle: string, bgA: string, bgB: string): string {
  const safeTitle = title.replace(/[<>&"']/g, "");
  const safeSubtitle = subtitle.replace(/[<>&"']/g, "");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgA}"/>
      <stop offset="100%" stop-color="${bgB}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="860" cy="180" r="120" fill="#ffffff22"/>
  <circle cx="190" cy="860" r="150" fill="#ffffff1a"/>
  <rect x="96" y="640" width="832" height="220" rx="28" fill="#00000055"/>
  <text x="128" y="720" fill="#ffffff" font-size="50" font-family="Arial, sans-serif" font-weight="700">${safeTitle}</text>
  <text x="128" y="782" fill="#f5edff" font-size="34" font-family="Arial, sans-serif">${safeSubtitle}</text>
  <text x="128" y="838" fill="#ede9fe" font-size="26" font-family="Arial, sans-serif">Maaweelada Caruurta</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function resolveImageResponseSource(record: { thumbnailUrl?: string | null; images?: string[] | null }, fallbackPath: string): string {
  if (record.thumbnailUrl) return record.thumbnailUrl;
  if (Array.isArray(record.images) && record.images[0]) return record.images[0];
  return fallbackPath;
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

function isRemoteImageUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

async function uploadBedtimeImageToR2(
  imageSource: string,
  storyDate: string,
  storyLabel: string,
  imageIndex: number
): Promise<string> {
  if (!imageSource.startsWith("data:image")) {
    return imageSource;
  }

  if (!isR2Configured()) {
    return imageSource;
  }

  const parsed = parseDataImage(imageSource);
  const fileName = `maaweelo-${storyDate}-${storyLabel}-${imageIndex + 1}.${parsed.extension}`;
  try {
    const { url } = await uploadToR2(parsed.buffer, fileName, parsed.mimeType, "Images/maaweelo", "sheeko");
    return url;
  } catch (error) {
    console.error(`[Bedtime Stories] R2 image upload failed for ${fileName}, keeping legacy data URL:`, error);
    return imageSource;
  }
}

function sendImageSource(res: Response, source: string, fallbackPath: string): void {
  const finalSource = source || fallbackPath;
  if (isRemoteImageUrl(finalSource)) {
    // Remote R2/CDN images can be cached longer by clients.
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.redirect(finalSource);
  }

  res.setHeader("Cache-Control", "public, max-age=300");

  if (finalSource.startsWith("data:")) {
    const etag = `W/"cover-${createHash("sha1").update(finalSource).digest("base64url")}"`;
    res.setHeader("ETag", etag);

    const ifNoneMatch = res.req?.headers["if-none-match"];
    if (typeof ifNoneMatch === "string" && ifNoneMatch.includes(etag)) {
      res.status(304).end();
      return;
    }

    const cached = bedtimeStoryDecodedBufferCache.get(finalSource);
    if (cached && Date.now() < cached.expiry) {
      res.setHeader("Content-Type", cached.contentType);
      res.send(cached.buffer);
      return;
    }

    const match = finalSource.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const contentType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      bedtimeStoryDecodedBufferCache.set(finalSource, {
        buffer,
        contentType,
        expiry: Date.now() + BEDTIME_STORY_DATA_BUFFER_TTL,
      });
      res.setHeader("Content-Type", contentType);
      res.send(buffer);
      return;
    }
  }

  return res.redirect(finalSource);
}

export async function generateDailyBedtimeStory(): Promise<void> {
  const today = getSomaliaToday();
  
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

    let storyText: { title: string; titleSomali: string; content: string; moralLesson: string };
    try {
      storyText = await generateStoryText(character, previousTitles);
    } catch (textError) {
      console.error("[Bedtime Stories] AI text generation failed, using fallback template:", textError);
      storyText = buildFallbackStoryText(character);
    }
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

    if (images.length === 0) {
      console.log("[Bedtime Stories] Using local fallback images");
      images.push(buildFallbackImageDataUrl(storyText.titleSomali, character.nameSomali, "#4c1d95", "#1e1b4b"));
      images.push(buildFallbackImageDataUrl("Caawa Sheeko Cusub", "Maaweelo", "#6d28d9", "#312e81"));
    }

    const storyLabel = Date.now().toString(36);
    const normalizedImages: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const uploaded = await uploadBedtimeImageToR2(images[i], today, storyLabel, i);
      normalizedImages.push(uploaded);
    }

    const preferredThumbnail = normalizedImages[0] || images[0] || null;

    const storyData: InsertBedtimeStory = {
      title: storyText.title,
      titleSomali: storyText.titleSomali,
      content: storyText.content,
      characterName: character.nameSomali,
      characterType: character.type,
      moralLesson: storyText.moralLesson,
      ageRange: "3-8",
      images: normalizedImages,
      thumbnailUrl: preferredThumbnail,
      storyDate: today,
      isPublished: true, // Auto-publish for daily cron job
    };

    const newStory = await storage.createBedtimeStory(storyData);
    console.log(`[Bedtime Stories] Successfully created story: ${storyText.titleSomali}`);
    clearBedtimeStoriesCache();

    if (!newStory.thumbnailUrl && preferredThumbnail) {
      try {
        await storage.updateBedtimeStory(newStory.id, { thumbnailUrl: preferredThumbnail });
      } catch (thumbError) {
        console.error(`[Bedtime Stories] Inline thumbnail fallback failed:`, thumbError);
      }
    }

    try {
      console.log(`[Bedtime Stories] Generating audio (Ubax voice)...`);
      const { generateAndUploadAudio } = await import("./tts");
      const audioUrl = await generateAndUploadAudio(
        newStory.content,
        `maaweelo-${newStory.id}`,
        "tts-audio/maaweelada",
        { azureVoice: "so-SO-UbaxNeural" },
        'sheeko'
      );
      await storage.updateBedtimeStory(newStory.id, { audioUrl });
      console.log(`[Bedtime Stories] Audio generated and saved to R2: ${audioUrl}`);
    } catch (audioError) {
      console.error(`[Bedtime Stories] Audio generation failed (story saved without audio):`, audioError);
    }
    
    /* Google Drive backup disabled as per user request
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
    */
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
const STORIES_CACHE_TTL = 30000;
const todayStoryCache = new Map<string, { data: any; expiry: number }>();
const listStoriesCache = new Map<string, { data: any[]; expiry: number }>();
const bedtimeStoryCoverCache = new Map<string, { source: string; expiry: number }>();
const bedtimeStoryDecodedBufferCache = new Map<string, { buffer: Buffer; contentType: string; expiry: number }>();
const LIST_STORIES_TTL = 120000;
const BEDTIME_STORY_COVER_TTL = 300000;
const BEDTIME_STORY_DATA_BUFFER_TTL = 300000;

function setBedtimeStoryApiNoStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

export function clearBedtimeStoriesCache(): void {
  bedtimeStoriesCache = null;
  todayStoryCache.clear();
  listStoriesCache.clear();
  bedtimeStoryCoverCache.clear();
  bedtimeStoryDecodedBufferCache.clear();
}

async function applyTranslationsToStories<T extends Record<string, any> & { id: string }>(
  stories: T[],
  language: string
): Promise<T[]> {
  if (isSomaliLanguage(language) || stories.length === 0) {
    return stories;
  }

  const storyIds = stories.map(s => s.id);
  const allTranslations = await db.select()
    .from(translations)
    .where(
      and(
        eq(translations.entityType, 'bedtime_story'),
        inArray(translations.entityId, storyIds),
        eq(translations.targetLanguage, normalizeLanguageCode(language))
      )
    );

  const translationsByStory = new Map<string, typeof allTranslations>();
  for (const translation of allTranslations) {
    if (!translationsByStory.has(translation.entityId)) {
      translationsByStory.set(translation.entityId, []);
    }
    translationsByStory.get(translation.entityId)!.push(translation);
  }

  return stories.map(story => {
    const storyTranslations = translationsByStory.get(story.id) || [];
    const translated = { ...story };
    for (const t of storyTranslations) {
      if (['title', 'content', 'moralLesson'].includes(t.fieldName)) {
        translated[t.fieldName] = t.translatedText;
      }
    }
    return translated;
  });
}

export function registerBedtimeStoryRoutes(app: Express): void {
  app.get("/api/bedtime-stories/latest", async (req: Request, res: Response) => {
    try {
      setBedtimeStoryApiNoStore(res);
      const lang = req.query.lang as string;
      let todayStory = await storage.getTodayBedtimeStory();
      if (!todayStory) {
        try {
          await generateDailyBedtimeStory();
          todayStory = await storage.getTodayBedtimeStory();
        } catch (genError) {
          console.error("[Bedtime Stories] Auto-generate on /latest failed:", genError);
        }
      }

      const stories = todayStory ? [todayStory] : await storage.getBedtimeStories(1);
      if (stories.length === 0) {
        return res.status(404).json({ error: "No story available" });
      }
      let story = stories[0] as any;
      if (!Array.isArray(story.images) || story.images.length === 0) {
        const fallbackImages = [
          buildFallbackImageDataUrl(story.titleSomali || "Maaweelo", story.characterName || "Sheeko", "#4c1d95", "#1e1b4b"),
          buildFallbackImageDataUrl("Caawa Sheeko Cusub", "Maaweelo", "#6d28d9", "#312e81"),
        ];
        const updated = await storage.updateBedtimeStory(story.id, {
          images: fallbackImages,
          thumbnailUrl: story.thumbnailUrl || fallbackImages[0],
        });
        if (updated) {
          story = updated as any;
        }
      } else if (!story.thumbnailUrl && Array.isArray(story.images) && story.images[0]) {
        const updated = await storage.updateBedtimeStory(story.id, {
          thumbnailUrl: story.images[0],
        });
        if (updated) {
          story = updated as any;
        }
      }

      const translated = await applyTranslationsToStories([story], lang);
      story = translated[0] as any;
      res.json({
        id: story.id,
        titleSomali: story.titleSomali,
        characterName: story.characterName,
        thumbnailUrl: story.thumbnailUrl || null,
        images: Array.isArray(story.images) ? story.images : [],
        storyDate: story.storyDate,
      });
    } catch (error) {
      console.error("Error fetching latest bedtime story:", error);
      res.status(500).json({ error: "Failed to fetch latest story" });
    }
  });

  app.get("/api/bedtime-stories", async (req: Request, res: Response) => {
    try {
      setBedtimeStoryApiNoStore(res);
      const lang = req.query.lang as string;
      const requestedLimit = Number.parseInt(String(req.query.limit || "60"), 10);
      const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 120) : 60;
      const cacheKey = `bs-list-${lang || 'so'}-${limit}`;
      const cached = listStoriesCache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        return res.json(cached.data);
      }

      let stories = await storage.getBedtimeStories(limit);
      stories = await applyTranslationsToStories(stories, lang);
      const lightweightStories = stories.map((story) => ({
        ...story,
        images: [],
        thumbnailUrl: `/api/bedtime-stories/${story.id}/cover`,
      }));
      listStoriesCache.set(cacheKey, { data: lightweightStories as any[], expiry: Date.now() + LIST_STORIES_TTL });
      res.json(lightweightStories);
    } catch (error) {
      console.error("Error fetching bedtime stories:", error);
      res.status(500).json({ error: "Failed to fetch stories" });
    }
  });

  app.get("/api/bedtime-stories/:id/cover", async (req: Request, res: Response) => {
    try {
      const cached = bedtimeStoryCoverCache.get(req.params.id);
      if (cached && Date.now() < cached.expiry) {
        return sendImageSource(res, cached.source, "/images/sheeko_app_icon_purple_gradient.png");
      }

      const story = await storage.getBedtimeStoryCover(req.params.id);
      if (!story) {
        bedtimeStoryCoverCache.delete(req.params.id);
        return res.redirect("/images/sheeko_app_icon_purple_gradient.png");
      }

      const source = resolveImageResponseSource({
        thumbnailUrl: story.thumbnailUrl,
        images: story.coverImage ? [story.coverImage] : [],
      }, "/images/sheeko_app_icon_purple_gradient.png");
      if (source.startsWith("data:image")) {
        console.warn(`[Bedtime Stories] Legacy data URL used in /cover for story ${req.params.id} (migration-needed)`);
      }
      bedtimeStoryCoverCache.set(req.params.id, {
        source,
        expiry: Date.now() + BEDTIME_STORY_COVER_TTL,
      });
      return sendImageSource(res, source, "/images/sheeko_app_icon_purple_gradient.png");
    } catch (error) {
      console.error("Error fetching bedtime story cover:", error);
      bedtimeStoryCoverCache.delete(req.params.id);
      return res.redirect("/images/sheeko_app_icon_purple_gradient.png");
    }
  });
  
  app.get("/api/admin/bedtime-stories", async (req: Request, res: Response) => {
    try {
      const now = Date.now();
      if (bedtimeStoriesCache && (now - bedtimeStoriesCache.timestamp) < STORIES_CACHE_TTL) {
        return res.json(bedtimeStoriesCache.data);
      }
      const stories = await storage.getAllBedtimeStories();
      bedtimeStoriesCache = { data: stories, timestamp: now };
      res.json(stories);
    } catch (error) {
      console.error("Error fetching all bedtime stories:", error);
      res.status(500).json({ error: "Failed to fetch stories" });
    }
  });

  app.get("/api/bedtime-stories/today", async (req: Request, res: Response) => {
    try {
      setBedtimeStoryApiNoStore(res);
      const lang = req.query.lang as string;
      const cacheKey = `bs-today-${lang || 'so'}`;
      const cached = todayStoryCache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        return res.json(cached.data);
      }
      let story = await storage.getTodayBedtimeStory();
      if (!story) {
        // Self-heal: try generating today's Maaweelo before falling back.
        try {
          await generateDailyBedtimeStory();
          story = await storage.getTodayBedtimeStory();
        } catch (genError) {
          console.error("[Bedtime Stories] Auto-generate on /today failed:", genError);
        }

        if (!story) {
          // Final fallback to latest published story.
          const latestStories = await storage.getBedtimeStories(1);
          if (latestStories.length === 0) {
            return res.status(404).json({ error: "No story available for today" });
          }
          story = latestStories[0] as any;
        }
      }

      if (!Array.isArray((story as any).images) || (story as any).images.length === 0) {
        const fallbackImages = [
          buildFallbackImageDataUrl((story as any).titleSomali || "Maaweelo", (story as any).characterName || "Sheeko", "#4c1d95", "#1e1b4b"),
          buildFallbackImageDataUrl("Caawa Sheeko Cusub", "Maaweelo", "#6d28d9", "#312e81"),
        ];
        const updated = await storage.updateBedtimeStory((story as any).id, {
          images: fallbackImages,
          thumbnailUrl: (story as any).thumbnailUrl || fallbackImages[0],
        });
        if (updated) {
          story = updated as any;
        }
      } else if (!(story as any).thumbnailUrl && Array.isArray((story as any).images) && (story as any).images[0]) {
        const updated = await storage.updateBedtimeStory((story as any).id, {
          thumbnailUrl: (story as any).images[0],
        });
        if (updated) {
          story = updated as any;
        }
      }

      const translated = await applyTranslationsToStories([story], lang);
      const result = translated[0];
      todayStoryCache.set(cacheKey, { data: result, expiry: Date.now() + 120000 });
      res.json(result);
    } catch (error) {
      console.error("Error fetching today's story:", error);
      res.status(500).json({ error: "Failed to fetch story" });
    }
  });

  app.get("/api/bedtime-stories/:id", async (req: Request, res: Response) => {
    try {
      setBedtimeStoryApiNoStore(res);
      const lang = req.query.lang as string;
      let story = await storage.getBedtimeStory(req.params.id);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      const translated = await applyTranslationsToStories([story], lang);
      res.json(translated[0]);
    } catch (error) {
      console.error("Error fetching story:", error);
      res.status(500).json({ error: "Failed to fetch story" });
    }
  });

  app.post("/api/bedtime-stories/generate", async (req: Request, res: Response) => {
    try {
      await generateDailyBedtimeStory();
      clearBedtimeStoriesCache();
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

      clearBedtimeStoriesCache();

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
      clearBedtimeStoriesCache();
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
      clearBedtimeStoriesCache();
      
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

  // Search for stories by character name in Google Drive backups (admin only)
  app.get("/api/admin/bedtime-stories/search/:characterName", async (req: Request, res: Response) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan soo gal" });
      }
      const parent = await storage.getParent(req.session.parentId);
      if (!parent?.isAdmin) {
        return res.status(403).json({ error: "Admin kaliya ayaa baadhitaan kara" });
      }
      
      const { characterName } = req.params;
      console.log(`[Bedtime Stories] Searching Google Drive backups for character: ${characterName}`);
      
      const stories = await searchMaaweelByCharacter(characterName);
      res.json({ 
        success: true, 
        count: stories.length,
        stories 
      });
    } catch (error) {
      console.error("Error searching stories from Google Drive:", error);
      res.status(500).json({ error: "Failed to search stories" });
    }
  });

  // Restore a story from Google Drive backup to database (admin only)
  app.post("/api/admin/bedtime-stories/restore", async (req: Request, res: Response) => {
    try {
      if (!req.session.parentId) {
        return res.status(401).json({ error: "Fadlan soo gal" });
      }
      const parent = await storage.getParent(req.session.parentId);
      if (!parent?.isAdmin) {
        return res.status(403).json({ error: "Admin kaliya ayaa soo celin kara" });
      }
      
      let { title, titleSomali, content, characterName, moralLesson, storyDate } = req.body;
      
      // titleSomali is required, but title (English) can be derived from titleSomali if not provided
      if (!titleSomali || !content || !characterName || !storyDate) {
        return res.status(400).json({ error: "Missing required fields: titleSomali, content, characterName, storyDate" });
      }
      
      // If English title is not provided, use the Somali title
      // (Google Drive backups only contain the Somali title)
      if (!title) {
        title = titleSomali;
      }
      
      // Check if story already exists for this date
      const existingStory = await storage.getBedtimeStoryByDate(storyDate);
      if (existingStory) {
        return res.status(409).json({ 
          error: "Story already exists for this date",
          existingStory 
        });
      }
      
      // Find character type from SAHABI_CHARACTERS or TABIYIN_CHARACTERS
      const allCharacters = [...SAHABI_CHARACTERS, ...TABIYIN_CHARACTERS];
      const character = allCharacters.find(c => c.nameSomali === characterName);
      const characterType = character?.type || "sahabi";
      
      const storyData: InsertBedtimeStory = {
        title,
        titleSomali,
        content,
        characterName,
        characterType,
        moralLesson: moralLesson || "Waxbarasho muhiim ah",
        ageRange: "3-8",
        images: [],
        storyDate,
        isPublished: false, // Start as unpublished for review
      };
      
      const newStory = await storage.createBedtimeStory(storyData);
      console.log(`[Bedtime Stories] Restored story from Google Drive: ${titleSomali}`);
      
      res.json({ 
        success: true, 
        message: "Sheekada waa la soo celiyay",
        story: newStory 
      });
    } catch (error: any) {
      console.error("Error restoring story from Google Drive:", error);
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        return res.status(409).json({ error: "Story already exists for this date" });
      }
      res.status(500).json({ error: "Failed to restore story" });
    }
  });
}
