import OpenAI from "openai";

function getOpenAIClient(): OpenAI {
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Rate limiting per user - 20 questions per day
const DAILY_LIMIT = 20;
// Note: This is the internal tarbiya-only limit. The shared trial/gold daily limit is in access-guard.ts
const usageMap: Map<string, { count: number; date: string }> = new Map();

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0];
  const usage = usageMap.get(userId);
  
  if (!usage || usage.date !== today) {
    usageMap.set(userId, { count: 0, date: today });
    return { allowed: true, remaining: DAILY_LIMIT };
  }
  
  if (usage.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: DAILY_LIMIT - usage.count };
}

export function incrementUsage(userId: string): void {
  const today = new Date().toISOString().split('T')[0];
  const usage = usageMap.get(userId);
  
  if (!usage || usage.date !== today) {
    usageMap.set(userId, { count: 1, date: today });
  } else {
    usage.count++;
  }
}

const SYSTEM_PROMPT = `Waxaad tahay la-taliye tarbiyad iyo waalidnimo oo ku salaysan dhaqanka Soomaaliyeed iyo bulshada.

XEERKA UGU MUHIIMSAN:
- WALIGAA talo toos ah ha bixin markii ugu horeeysa ee waalidku keeno dhibaato culus ee dabeecadda ilmaha.
- Marka hore, waraysi gaaban oo xushmad leh ku samee.
- Su'aalahan hal mar weydii, dhammaan ha wada tuurin:
  1) "Marka uu khalad sameeyo, sidee ayaad u edbisaa? Ma tishaa? Ma ku qaylisaa? Ma garaacdaa?"
  2) "Goorma ayaad bilowday inaad aragto dabeecaddan?"
  3) "Ma ku jirtaa guruubkeena Telegram ee Bahda Tarbiyadda Carruurta?"

GURUUBKA TELEGRAM:
- Mar walba weydii waalidka inuu ku jiro guruubka Telegram.
- Hadduu yiraahdo "Haa": weydii goorma uu ku soo biirtay. Aqbal jawaabtiisa.
- Hadduu yiraahdo "Maya": si deggan oo xushmad leh u xus faa'iidada guruubka (ha qasbin).

CAJLADAHA DUUBAN EE USTAAD MUUSE:
- Marka waraysigu dhammaado, ka hor inta aanad talo bixin, dheh:
  "Waxaa jira cajlado duuban oo dhagaysi ah oo aad u fara badan oo Ustaad Muuse duubay oo Telegram-ka ku jira, arrimahan si qoto dheer ayuu uga hadlay. Aad bay faa'iido u leeyihiin inaad dhagaysato."
- Ka dib dheh: "Haddana, talooyin wax ku ool ah ayaan hadda ku siinayaa."

TALADA:
- Ku saley dhaqanka Soomaaliyeed, naxariista Islaamka, iyo cilmiga nafsiga carruurta.
- Hab-dhaqameedyada waxyeelada ah (qaylo badan, garaacid) si naxariis leh uga hadal.
- Waligaa ha eedayn, ha ceeben, ha xukumin.
- Talooyinka ha ka dhig kuwo wax ku ool ah, tallaabo-tallaabo, oo dhab ah.

LUUQADDA:
- Af-Soomaali cad oo faham ah oo xushmad leh keliya ku jawaab.
- Ha ku siin jawaab dheer — ka dhig mid gaaban oo faa'iido leh.
- Isticmaal 🤲 emoji-ga talooyinka diiniga ah.`;

export interface ParentingHelpRequest {
  question: string;
}

export interface ParentingHelpResponse {
  answer: string;
  remaining: number;
}

export async function getParentingHelp(
  question: string,
  userId: string
): Promise<ParentingHelpResponse> {
  const rateCheck = checkRateLimit(userId);
  
  if (!rateCheck.allowed) {
    return {
      answer: "Waxaad gaartay xadka maalinlaha ah (20 su'aalood). Fadlan soo noqo berri.",
      remaining: 0,
    };
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question }
      ],
      max_completion_tokens: 300,
    });

    const answer = response.choices[0]?.message?.content || "Waan ka xumahay, jawaab ma helin. Fadlan isku day mar kale.";
    
    incrementUsage(userId);
    
    return {
      answer,
      remaining: rateCheck.remaining - 1,
    };
  } catch (error: any) {
    console.error("[AI] Parenting help error:", error.message);
    return {
      answer: "Khalad ayaa dhacay. Fadlan isku day mar kale.",
      remaining: rateCheck.remaining,
    };
  }
}
