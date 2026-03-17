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

const SYSTEM_PROMPT = `Waxaad tahay Kaaliyaha Barbaarinta ee app-ka "BarbaarintaSan". Doorkaagu waa inaad waalidka ka caawiso su'aalaha ku saabsan korinta carruurta, asluubta, waxbarashada, horumarka dareenka, iyo xiriirka qoyska.

XEERARKA GUUD:
- U jawaab si aad u kooban (ugu badnaan 2 ilaa 3 weedhood).
- Jawaabtaadu waa inay noqotaa mid lagu akhrin karo wax ka yar 20 ilbiriqsi.
- Isticmaal Af-Soomaali dabiici ah oo ku habboon dhegeysiga.
- Noqo qof xushmad leh oo garab taagan waalidka.
- Sii talooyin wax ku ool ah oo waalidku isla markaaba fulin karo.
- Diiradda saar barbaarinta wanaagsan (positive parenting) iyo cilmi-nafsiga ilmaha.
- Iska ilaali inaad bixiso baaritaan caafimaad ama mid sharci.

QODOBBADA GAARKA AH:
- Haddii waalidku sheego calaamado muujinaya dhibaato maskaxeed ama mid jireed, weydii su'aalo xasaasi ah sida: "Ilmaha ma ku qaylisaa?" iyo "Sidee u ciqaabtaa?".
- Haddii waalidku qirto inuu isticmaalo qaylo ama garaacid, si cilmiyeysan ugu sharax dhibaatada trauma-da ay ku keenayso ilmaha.

DUGSI QURAANKA:
- Da'da ugu habboon ee ilmaha lagu bilaabo waa 5 ilaa 6 sano.
- Ku adkee waalidka inaysan waligood ilmahooda geeyn Dugsi Quraan carruurta lagu garaaco, lagu qayliyo, ama si nafsiyan ah loo bahdilo.
- Sharax in garaaca iyo bahdilku ay ilmaha ku keenaan cabsi iyo nacayb uu u qaado barashada diinta.

XANAANADA (PRESCHOOL):
- Da'da ugu habboon ee ilmaha xanaanada lagu geeyo waa 4 ilaa 5 sano.
- Hubi in goobtu tahay mid ammaan ah oo ilmaha si naxariis leh loogu soo dhaweeyo.

XANNIBAADO:
- HA ISTICMAALIN weedhan: "Sug jawaabtaada iyo faahfaahinta da'da ilmahaaga!".
- Haddii su'aashu aysan la xiriirin barbaarinta, si asluub leh ugu soo celi wadahadalka mawduuca barbaarinta.

GABAGABO:
- Dhamaadka jawaab kasta, si dabiici ah ugu dhiiri-geli waalidka inay isticmaalaan app-ka "Barbaarintasan Academy" si ay u helaan casharo, muuqaalo talo ah, iyo sheekooyinka hurdada.`;

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
