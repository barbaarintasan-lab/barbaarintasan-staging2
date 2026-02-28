import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import type { InsertParentTip } from "@shared/schema";
import { DEVELOPMENTAL_STAGES } from "@shared/schema";
import { generateParentMessageAudio } from "./tts";
import OpenAI from "openai";

const useReplitIntegration = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  ...(useReplitIntegration ? { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL } : {}),
});

const STAGE_TOPICS: Record<string, { topics: string[]; ageRange: string }> = {
  "newborn-0-3m": {
    ageRange: "0-3 bilood",
    topics: [
      "Naas-nuujinta iyo cuntada dhallaanka",
      "Hurdada dhallaanka cusub",
      "Xidhiidhka hooyo iyo dhallaanka",
      "Oohinta dhallaanka - sababaha iyo xalka",
      "Caafimaadka dhallaanka cusub",
      "Tallaalka iyo daryeelka caafimaad",
      "Horumarinta dareenka dhallaanka",
    ]
  },
  "infant-3-6m": {
    ageRange: "3-6 bilood",
    topics: [
      "Cuntada koowaad ee dhallaanka",
      "Dhaqdhaqaaqa iyo jidhka - ku gurguurista",
      "Ciyaaraha horumarinta maskaxda",
      "Hurdada habeenkii - jadwalka",
      "Dareenka bulshada - dhoola cadeynta",
      "Ilkaha koowaad ee dhallaanka",
      "Badbaadada guriga - dhallaanka",
    ]
  },
  "infant-6-12m": {
    ageRange: "6-12 bilood",
    topics: [
      "Cuntada iscunidda - finger foods",
      "Tallaabooyinka koowaad - socodka",
      "Luqadda koowaad - erayada",
      "Ciyaaraha horumarinta",
      "Cabbirka iyo baarista alaabta",
      "Xiriirka carruurta kale",
      "Jadwalka maalinlaha ah",
    ]
  },
  "toddler-1-2y": {
    ageRange: "1-2 sano",
    topics: [
      "Luqadda - erayada cusub barashada",
      "Madax-bannaanida - 'Aniga baan samaynayaa'",
      "Xanaaqda iyo dareenka - tantrums",
      "Ciyaaraha waxbarashada",
      "Tababarka musqusha - toilet training",
      "Cuntada nafaqada leh",
      "Anshaxa - haa iyo maya",
    ]
  },
  "toddler-2-3y": {
    ageRange: "2-3 sano",
    topics: [
      "Luqadda iyo hadalka - jumlado",
      "Bulshada - saaxiibbo la ciyaarista",
      "Dareenka iyo naxariista",
      "Barashada midabada iyo tirooyin",
      "Isdhexgelinta carruurta kale",
      "Caadooyinka wanaagsan - salaanta",
      "Khayaaliga iyo ciyaarta",
    ]
  },
  "preschool-3-5y": {
    ageRange: "3-5 sano",
    topics: [
      "Diyaarinta dugsiga - xarfaha",
      "Xisaabta - tirinta iyo cabbirka",
      "Bulshada - saaxiibtinimada",
      "Dareenka iyo is-maamulka",
      "Waxbarashada diinta - salaadda",
      "Fikradda iyo su'aalaha",
      "Mas'uuliyada yar - shaqooyinka guriga",
    ]
  },
  "school-age-5-7y": {
    ageRange: "5-7 sano",
    topics: [
      "Dugsiga - ku diyaargarowga",
      "Akhriska iyo qoraalka",
      "Xisaabta iyo xalinta dhibaatooyinka",
      "Saaxiibtinimada iyo bully-ga",
      "Isku kalsoonida iyo awood gelinta",
      "Waajibaadka guriga - homework",
      "Waqtiga screen-ka iyo ciyaaraha",
    ]
  },
};

function escapeNewlinesInStrings(json: string): string {
  let result = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (escape) { result += char; escape = false; continue; }
    if (char === '\\') { result += char; escape = true; continue; }
    if (char === '"') { inString = !inString; result += char; continue; }
    if (inString && char === '\n') { result += '\\n'; }
    else if (inString && char === '\r') { result += '\\r'; }
    else if (inString && char === '\t') { result += '\\t'; }
    else { result += char; }
  }
  return result;
}

const STAGE_SCIENCE: Record<string, string> = {
  "newborn-0-3m": `Marxaladda MURJUX (0-3 bilood): Ilmuhu wuxuu ku jiraa marxaladda ugu horeysa ee nolosha. Maskaxdu way sii koraysa, dareenyadiisuna (aragga, maqalka, taabashada) way soo baxayaan. Ilmuhu wuxuu bilaabayaa inuu aqoonsado wajiga hooyadiis, wuxuu ka jawaabaa codka, wuuna bilaabayaa inuu dhoollacadiyo. Hurdada, cuntada, iyo xidhiidhka jirka ah (skin-to-skin) ayaa aad muhiim u ah.`,
  "infant-3-6m": `Marxaladda FADHI-BARAD (3-6 bilood): Ilmuhu wuxuu bilaabayaa inuu madaxa taago, gacmaha wax ku qabto, oo uu bilaabo codad samaystiisa (cooing/babbling). Wuxuu bilaabayaa inuu wax si fiican u arko, wuuna xiriir sameysto dadka hareeraha ah. Ciyaartu waxay bilaabataa inay noqoto qalab waxbarasho. Ilmuhu wuxuu diyaar u noqonayaa inuu fadhiisto.`,
  "infant-6-12m": `Marxaladda GURGUURTE (6-12 bilood): Ilmuhu wuxuu bilaabayaa inuu gurguurto, oo uu dhulka sahmiyao. Wuxuu bilaabayaa erayada koowaad (mama, baba). Cuntada adag ayuu bilaabayaa. Waxay xiligan muuqdaan xakamaynta gacmaha iyo faraha (fine motor skills). Ilmuhu wuxuu muujiyaa dareen kala duwan sida cabsida qof aan la aqoon (stranger anxiety).`,
  "toddler-1-2y": `Marxaladda SOCOD BARAD (1-2 sano): Ilmuhu wuxuu bilaabayaa inuu socdo oo uu xoogaa madax-bannaanideed muujiyo. Ereyo badan ayuu bartaa, wuuna bilaabayaa inuu ereyada isku xiro. Dareenyadiisu way xoogaystaan, wuxuuna u baahan yahay in la baro xakamaynta dareenka. Ciyaartu waxay noqotaa qaab waxbarasho oo muhiim ah.`,
  "toddler-2-3y": `Marxaladda INYOW (2-3 sano): Ilmuhu erayada aad buu u bartaa (language explosion), wuxuu bilaabayaa jumlado dhameystiran. Wuxuu muujiyaa madax-adayg (terrible twos) oo uu baranayo madax-bannaanida. Wuxuu bilaabayaa ciyaarta carruurta kale (parallel play). Waxaa muhiim ah nidaamka iyo xeerarka cad ee macquulka ah.`,
  "preschool-3-5y": `Marxaladda DAREEME (3-5 sano): Ilmuhu wuxuu bartaa bulshada iyo saaxiibtinimada. Khayaalkiisu wuu xoogaystaa, ciyaartu waxay noqotaa ciyaar malawaaleysi ah (imaginative play). Wuxuu bilaabayaa inuu su'aalaha badan weydiiyao ("Maxaa?", "Waa maxay?"). Waxaa muhiim ah akhriska, xisaabta aasaasiga ah, iyo diyaarinta dugsiga.`,
  "school-age-5-7y": `Marxaladda SALAAD-BARAD (5-7 sano): Ilmuhu wuxuu bilaabayaa dugsiga, wuxuuna baranayaa akhriska iyo xisaabta. Saaxiibtinimadiisu way xoogaystaa. Wuxuu bilaabayaa inuu fahmo waxyaabaha saxda iyo qaladka ah. Waxaa muhiim ah tababarka cibaadooyinka (salaadda), mas'uuliyadda, iyo dhiirigalinta akhrisga iyo cilmiga.`,
};

async function generateTipText(stage: typeof DEVELOPMENTAL_STAGES[number], topic: string): Promise<{ title: string; content: string; keyPoints: string }> {
  const stageScience = STAGE_SCIENCE[stage.id] || "";
  const prompt = `Waxaad tahay khabiir horumarinta caruurta oo Soomaali ah. Qor talo GAABAN oo ku saabsan: "${topic}" oo loogu talagalay waalidka carruurtoodu tahay marxaladda "${stage.label}" (${stage.labelEn}).

CILMIGA MARXALADDAN:
${stageScience}

XEERARKA QORAALKA:
1. Soomaali fudud oo waalidku si deg deg u fahmi karo
2. AAD U GAAB: Ugu badnaan 60-80 ereyood oo keliya (8 layn oo telefon screen ah)
3. Hal talo oo muhiim ah oo keliya - ha ku bixin talooyin badan
4. Toos talooyada u gal - HA SHEEKAYSAN, HA SHARXIN cilmi badan
5. Tusaale dhab ah oo hal mid keliya
6. Ku saabsan marxaladda ${stage.label} oo keliya

MUHIIM: Marka la sheego Nabiga Muxammad, ku qor "Nabadgalyo iyo Naxariisi korkiisa ha ahaatee".
MUHIIM: HA KU DARIN salaan. Toos mawduuca u gal.
MUHIIM: QORAALKU WAA INUU AAD U GAAB YAHAY - sida SMS ama WhatsApp message!

Ka jawaab JSON sax ah:
{
  "title": "Cinwaanka gaaban (4-6 ereyood)",
  "content": "Talooyada gaaban...",
  "keyPoints": "Qodob 1\\nQodob 2\\nQodob 3"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a Somali child development expert. Always respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 800,
    response_format: { type: "json_object" }
  });

  const textContent = response.choices?.[0]?.message?.content;
  if (!textContent) throw new Error("No content generated");

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse tip JSON");

  const strategies = [
    () => { const cleaned = escapeNewlinesInStrings(jsonMatch[0]); return JSON.parse(cleaned); },
    () => { const cleaned = jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\n/g, '\\n'); return JSON.parse(cleaned); },
    () => { const cleaned = jsonMatch[0].replace(/[\x00-\x1F\x7F\n\r\t]/g, ' '); return JSON.parse(cleaned); },
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = strategies[i]();
      if (result.title && result.content) {
        if (!result.keyPoints) result.keyPoints = "Talo muhiim ah";
        return result;
      }
    } catch (e) {
      console.log(`[Parent Tips] Strategy ${i + 1} failed:`, (e as Error).message);
    }
  }

  throw new Error("Could not parse tip JSON after all strategies");
}

async function generateTipImage(stage: string, topic: string): Promise<string> {
  const prompt = `Professional warm illustration for Somali parenting tip about "${topic}" for ${stage} age group. Art style: warm, modern, educational illustration. Features a loving Somali family - mother in elegant dirac and garbasaar, father in smart clothes, with their child at appropriate age. Setting: cozy Somali home. Mood: nurturing, educational, joyful. Colors: warm earthy tones. Safe for family viewing.`;

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    quality: "low",
  });

  if (!response.data?.[0]?.b64_json) throw new Error("No image generated");
  return `data:image/png;base64,${response.data[0].b64_json}`;
}

export async function generateAndSaveParentTip(stageId?: string): Promise<void> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Mogadishu' });
  const stages = stageId 
    ? DEVELOPMENTAL_STAGES.filter(s => s.id === stageId)
    : DEVELOPMENTAL_STAGES;

  for (const stage of stages) {
    try {
      const existingTips = await storage.getParentTipsByDate(today);
      const alreadyGenerated = existingTips.some(t => t.stage === stage.id);
      if (alreadyGenerated) {
        console.log(`[Parent Tips] Tip already exists for ${stage.id} on ${today}`);
        continue;
      }

      const stageTopics = STAGE_TOPICS[stage.id];
      if (!stageTopics) continue;

      const existingStageTips = await storage.getParentTipsByStage(stage.id, 30);
      const usedTopics = existingStageTips.map(t => t.topic);
      const availableTopics = stageTopics.topics.filter(t => !usedTopics.includes(t));
      const topic = availableTopics.length > 0
        ? availableTopics[Math.floor(Math.random() * availableTopics.length)]
        : stageTopics.topics[Math.floor(Math.random() * stageTopics.topics.length)];

      console.log(`[Parent Tips] Generating tip for ${stage.id}: ${topic}`);
      const tipText = await generateTipText(stage, topic);

      let images: string[] = [];
      try {
        const image = await generateTipImage(stage.label, topic);
        images = [image];
      } catch (err) {
        console.log(`[Parent Tips] Image generation failed for ${stage.id}, continuing without image`);
      }

      const tipData: InsertParentTip = {
        title: tipText.title,
        content: tipText.content,
        stage: stage.id,
        topic: topic,
        keyPoints: tipText.keyPoints,
        images,
        tipDate: today,
        isPublished: true,
      };

      const saved = await storage.createParentTip(tipData);
      console.log(`[Parent Tips] Saved tip for ${stage.id}: ${tipText.title}`);

      try {
        const audioUrl = await generateParentMessageAudio(saved.content, `tip-${saved.id}`);
        await storage.updateParentTip(saved.id, { audioUrl });
        console.log(`[Parent Tips] Audio generated for ${stage.id}`);
      } catch (err) {
        console.log(`[Parent Tips] Audio generation failed for ${stage.id}, continuing without audio`);
      }
    } catch (error) {
      console.error(`[Parent Tips] Failed to generate tip for ${stage.id}:`, error);
    }
  }
}

export function registerParentTipsRoutes(app: Express): void {
  app.get("/api/parent-tips/homepage", async (_req: Request, res: Response) => {
    try {
      const tips = await storage.getRecentParentTips(3);
      res.json(tips);
    } catch (error) {
      console.error("Error fetching homepage tips:", error);
      res.status(500).json({ error: "Failed to fetch tips" });
    }
  });

  app.get("/api/parent-tips", async (req: Request, res: Response) => {
    try {
      const stage = req.query.stage as string;
      let tips;
      if (stage && stage !== 'all') {
        tips = await storage.getParentTipsByStage(stage, 50);
      } else {
        tips = await storage.getAllParentTips(200);
      }
      res.json(tips);
    } catch (error) {
      console.error("Error fetching parent tips:", error);
      res.status(500).json({ error: "Failed to fetch tips" });
    }
  });

  app.get("/api/parent-tips/stages", async (_req: Request, res: Response) => {
    try {
      const tips = await storage.getAllParentTips(500);
      const stageCounts: Record<string, number> = {};
      for (const tip of tips) {
        stageCounts[tip.stage] = (stageCounts[tip.stage] || 0) + 1;
      }
      res.json({
        stages: DEVELOPMENTAL_STAGES.map(s => ({
          ...s,
          count: stageCounts[s.id] || 0
        }))
      });
    } catch (error) {
      console.error("Error fetching stages:", error);
      res.status(500).json({ error: "Failed to fetch stages" });
    }
  });

  app.get("/api/parent-tips/:id", async (req: Request, res: Response) => {
    try {
      const tip = await storage.getParentTip(req.params.id);
      if (!tip) return res.status(404).json({ error: "Tip not found" });
      res.json(tip);
    } catch (error) {
      console.error("Error fetching tip:", error);
      res.status(500).json({ error: "Failed to fetch tip" });
    }
  });

  app.put("/api/admin/parent-tips/:id", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) return res.status(401).json({ error: "Authentication required" });
      const parent = await storage.getParent(parentId);
      if (!parent?.isAdmin) return res.status(403).json({ error: "Admin access required" });

      const { title, content, keyPoints } = req.body;
      if (!title && !content && keyPoints === undefined) return res.status(400).json({ error: "Title, content or keyPoints required" });

      const updateData: any = {};
      if (title) updateData.title = title;
      if (content) updateData.content = content;
      if (keyPoints !== undefined) updateData.keyPoints = keyPoints;

      const updated = await storage.updateParentTip(req.params.id, updateData);
      if (!updated) return res.status(404).json({ error: "Tip not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating tip:", error);
      res.status(500).json({ error: "Failed to update tip" });
    }
  });

  app.post("/api/admin/parent-tips/:id/audio", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) return res.status(401).json({ error: "Authentication required" });
      const parent = await storage.getParent(parentId);
      if (!parent?.isAdmin) return res.status(403).json({ error: "Admin access required" });

      const tip = await storage.getParentTip(req.params.id);
      if (!tip) return res.status(404).json({ error: "Tip not found" });

      const voiceName = req.body.voiceName === "ubax" ? "so-SO-UbaxNeural" : "so-SO-MuuseNeural";
      const voiceLabel = req.body.voiceName === "ubax" ? "Ubax (Naag)" : "Muuse (Lab)";

      console.log(`[Parent Tips] Generating audio for tip ${tip.id} with voice ${voiceLabel}`);

      const { generateAndUploadAudio } = await import("./tts");
      const timestamp = Date.now();
      const audioUrl = await generateAndUploadAudio(
        tip.content,
        `tip-${tip.id}-${timestamp}`,
        "tts-audio/talooyinka",
        { azureVoice: voiceName },
        'dhambaal'
      );

      await storage.updateParentTip(tip.id, { audioUrl });
      const updated = await storage.getParentTip(tip.id);
      res.json(updated);
    } catch (error) {
      console.error("Error generating tip audio:", error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  app.post("/api/admin/generate-parent-tips", async (req: Request, res: Response) => {
    try {
      const parentId = (req.session as any)?.parentId;
      if (!parentId) return res.status(401).json({ error: "Authentication required" });
      const parent = await storage.getParent(parentId);
      if (!parent?.isAdmin) return res.status(403).json({ error: "Admin access required" });

      const stageId = req.body.stageId as string | undefined;
      await generateAndSaveParentTip(stageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error generating tips:", error);
      res.status(500).json({ error: "Failed to generate tips" });
    }
  });

  console.log("[Parent Tips] Routes registered");
}
