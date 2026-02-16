import OpenAI from "openai";

// Use Replit AI integration key if available, fallback to standard OPENAI_API_KEY
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

// Lazy-load OpenAI client
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export interface ModerationResult {
  isFlagged: boolean;
  violationType: string | null;
  confidenceScore: number;
  explanation: string | null;
}

export async function moderateContent(content: string): Promise<ModerationResult> {
  if (!apiKey) {
    console.warn("[AI Moderation] No OpenAI API key configured - moderation disabled");
    return {
      isFlagged: false,
      violationType: null,
      confidenceScore: 0,
      explanation: null
    };
  }

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a content moderation AI for a Somali parenting education platform. Your job is to analyze messages and detect harmful content.

IMPORTANT CONTEXT:
- This platform is for Somali parents discussing child-rearing and education
- Messages may be in Somali, Arabic, or English
- Be culturally sensitive to Somali/Islamic context
- Parenting discussions are normal and expected

FLAG these types of content with HIGH confidence (0.8+):
- Hate speech or discrimination
- Direct threats or calls to violence
- Sexual content or explicit material
- Harassment or bullying
- Personal attacks
- Spam or scam attempts
- Content harmful to children

DO NOT FLAG:
- Normal parenting discussions
- Religious content (Islam is common in Somali culture)
- Emotional expressions about parenting challenges
- Disagreements stated respectfully
- Cultural practices discussion

Respond in this exact JSON format:
{
  "isFlagged": boolean,
  "violationType": "hate_speech" | "harassment" | "threat" | "sexual" | "spam" | "harmful_to_children" | null,
  "confidenceScore": number between 0 and 1,
  "explanation": "Brief explanation in English" | null
}`
        },
        {
          role: "user",
          content: `Analyze this message for harmful content: "${content}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      isFlagged: result.isFlagged === true && result.confidenceScore >= 0.7,
      violationType: result.violationType || null,
      confidenceScore: result.confidenceScore || 0,
      explanation: result.explanation || null
    };
  } catch (error) {
    console.error("AI moderation error:", error);
    return {
      isFlagged: false,
      violationType: null,
      confidenceScore: 0,
      explanation: null
    };
  }
}
