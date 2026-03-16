import OpenAI from "openai";
import { storage } from "../storage";
import type { AssessmentQuestion, AssessmentResponse, Course } from "@shared/schema";

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

interface AssessmentAnalysis {
  strengths: string[];
  needsImprovement: string[];
  focusAreas: string[];
  summary: string;
  parentingStyle?: string;
  parentingTips?: string[];
  courseRecommendations: {
    courseId: string;
    reason: string;
    focusArea: string;
    priority: number;
  }[];
}

export async function analyzeAssessment(
  assessmentId: string,
  childAgeRange: string,
  childQuestions: AssessmentQuestion[],
  parentQuestions: AssessmentQuestion[],
  responses: AssessmentResponse[],
  availableCourses: Course[]
): Promise<AssessmentAnalysis> {
  const childQuestionMap = new Map(childQuestions.map(q => [q.id, q]));
  const parentQuestionMap = new Map(parentQuestions.map(q => [q.id, q]));
  
  const childResponses = responses
    .filter(r => childQuestionMap.has(r.questionId))
    .map(r => {
      const question = childQuestionMap.get(r.questionId);
      return {
        category: question?.category || "unknown",
        question: question?.questionSomali || question?.question || "",
        response: r.response,
      };
    });

  const parentResponses = responses
    .filter(r => parentQuestionMap.has(r.questionId))
    .map(r => {
      const question = parentQuestionMap.get(r.questionId);
      return {
        dimension: question?.category || "unknown",
        question: question?.questionSomali || question?.question || "",
        response: r.response,
      };
    });

  // Only recommend these two courses that are ready for parents
  const readyCourseIds = ["0-6-bilood", "ilmo-is-dabira"];
  
  const courseInfo = availableCourses
    .filter(c => c.isLive && readyCourseIds.includes(c.courseId))
    .map(c => ({
      id: c.id,
      title: c.title,
      courseId: c.courseId,
      description: c.description,
      category: c.category,
      ageRange: c.ageRange,
    }));

  // Calculate average scores by category for better analysis
  const childScoresByCategory: Record<string, number[]> = {};
  childResponses.forEach(r => {
    const score = parseInt(r.response) || 3;
    if (!childScoresByCategory[r.category]) {
      childScoresByCategory[r.category] = [];
    }
    childScoresByCategory[r.category].push(score);
  });
  
  const childAverages = Object.entries(childScoresByCategory).map(([cat, scores]) => ({
    category: cat,
    average: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
    isLow: (scores.reduce((a, b) => a + b, 0) / scores.length) < 3
  }));

  // Get worst-scoring questions for specific feedback
  const worstChildQuestions = childResponses
    .filter(r => parseInt(r.response) <= 2)
    .slice(0, 4)
    .map(r => `- ${r.question} (Dhibcaha: ${r.response}/5)`);

  const worstParentQuestions = parentResponses
    .filter(r => parseInt(r.response) <= 2)
    .slice(0, 4)
    .map(r => `- ${r.question} (Dhibcaha: ${r.response}/5)`);

  const parentScoresByDimension: Record<string, number[]> = {};
  parentResponses.forEach(r => {
    const score = parseInt(r.response) || 3;
    if (!parentScoresByDimension[r.dimension]) {
      parentScoresByDimension[r.dimension] = [];
    }
    parentScoresByDimension[r.dimension].push(score);
  });

  const parentAverages = Object.entries(parentScoresByDimension).map(([dim, scores]) => ({
    dimension: dim,
    average: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
    isLow: (scores.reduce((a, b) => a + b, 0) / scores.length) < 3
  }));

  // Determine parenting style based on responsiveness and demandingness
  const responsivenessScore = parentAverages.find(p => p.dimension === 'responsiveness')?.average || "3";
  const demandingnessScore = parentAverages.find(p => p.dimension === 'demandingness')?.average || "3";

  const prompt = `Waxaad tahay khabiir korriinka carruurta. Falanqee qiimeynta oo ku bixi natiijo SAX.

MUHIIM: Haddii dhibciyadu < 3, waa inaad ka hadashaa DHIBAATOOYINKA GAARKA AH. Ha bixin "waa wanaagsan" marka dhibciyadu liidato yihiin!

=== NATIIJOOYIN ILMAHA (Da'da: ${childAgeRange}) ===
${childAverages.map(c => `- ${c.category}: ${c.average}/5 ${c.isLow ? "⚠️ HOOSE" : "✓"}`).join('\n')}

${worstChildQuestions.length > 0 ? `SU'AALAHA UGU DHIBCAHA LIITA (ILMAHA):
${worstChildQuestions.join('\n')}` : ''}

=== NATIIJOOYIN WAALIDNIMADA ===
${parentAverages.map(p => `- ${p.dimension}: ${p.average}/5 ${p.isLow ? "⚠️ HOOSE" : "✓"}`).join('\n')}

${worstParentQuestions.length > 0 ? `SU'AALAHA UGU DHIBCAHA LIITA (WAALIDNIMADA):
${worstParentQuestions.join('\n')}` : ''}

NOOCA WAALIDNIMADA:
- Responsiveness: ${responsivenessScore}, Demandingness: ${demandingnessScore}
- Labaduba > 3.5 = "Waalid Dhab ah"
- Demandingness > 3.5, Responsiveness < 3 = "Waalid Adag"
- Responsiveness > 3.5, Demandingness < 3 = "Waalid Debecsan"
- Labaduba < 3 = "Waalid Ka Fog"

KOORSOYADA:
${courseInfo.map(c => `- ID: ${c.id}, Magac: ${c.title}`).join('\n')}

Jawaab JSON sax ah (Af-Soomaali kaliya):
{"strengths":["2-3 dhinac oo wanaagsan"],"needsImprovement":["2-3 meel oo loo baahan horumar - isticmaal su'aalaha liita"],"focusAreas":["2 meel"],"parentingStyle":"nooca","parentingTips":["2 talo"],"summary":"2 weedho","courseRecommendations":[{"courseId":"ID","reason":"sabab gaar ah","focusArea":"dhinac","priority":1}]}`;


  try {
    // Log only category names, not actual scores for privacy
    console.log("[AI] Analyzing assessment for age range:", childAgeRange);
    
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Waxaad tahay khabiir korriinka carruurta. Jawaab JSON sax ah oo keliya - markdown ha isticmaalin. Af-Soomaali oo keliya. MUHIIM: Haddii dhibciyadu < 3 yihiin, waa inaad ka hadashaa dhibaatooyinka - ha bixin jawaabo wanaagsan marka dhibciyadu liidato yihiin!"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1200,
    });
    
    console.log("[AI] Response received, parsing JSON...");

    let content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Clean up response - remove markdown code blocks if present
    content = content.trim();
    if (content.startsWith("```json")) {
      content = content.slice(7);
    } else if (content.startsWith("```")) {
      content = content.slice(3);
    }
    if (content.endsWith("```")) {
      content = content.slice(0, -3);
    }
    content = content.trim();
    
    console.log("[AI] JSON parsing attempt, length:", content.length);

    const analysis = JSON.parse(content) as AssessmentAnalysis;
    
    if (!analysis.courseRecommendations) {
      analysis.courseRecommendations = [];
    }

    return analysis;
  } catch (error: any) {
    console.error("[AI] Assessment analysis failed:", error.message);
    
    // Build intelligent fallback based on actual calculated scores
    const lowChildCategories = childAverages.filter(c => c.isLow).map(c => c.category);
    const highChildCategories = childAverages.filter(c => !c.isLow).map(c => c.category);
    const lowParentDimensions = parentAverages.filter(p => p.isLow).map(p => p.dimension);
    
    // Category name translations
    const categoryNames: Record<string, string> = {
      cognitive: "Caqliga iyo fekerka",
      physical: "Dhaqdhaqaaqa jirka",
      emotional: "Dareenka",
      social: "Isdhexgalka bulshada",
      language: "Luqadda",
      responsiveness: "Jawaab-celinta waalidnimo",
      demandingness: "Nidaamka iyo xeerarka"
    };
    
    // Determine parenting style from calculated scores
    const respScore = parseFloat(responsivenessScore);
    const demScore = parseFloat(demandingnessScore);
    let parentingStyle = "Waalid Dhab ah";
    if (respScore >= 3.5 && demScore >= 3.5) parentingStyle = "Waalid Dhab ah";
    else if (demScore >= 3.5 && respScore < 3) parentingStyle = "Waalid Adag";
    else if (respScore >= 3.5 && demScore < 3) parentingStyle = "Waalid Debecsan";
    else if (respScore < 3 && demScore < 3) parentingStyle = "Waalid Ka Fog";
    
    const strengths = highChildCategories.length > 0 
      ? highChildCategories.slice(0, 3).map(c => `${categoryNames[c] || c} - waa mid wanaagsan`)
      : ["Waxaad bilowday waxbarashada waalidnimada - taasi waa tallaabo muhiim ah"];
    
    const needsImprovement = lowChildCategories.length > 0
      ? lowChildCategories.map(c => `${categoryNames[c] || c} - wuxuu u baahan yahay taageero dheeraad ah`)
      : lowParentDimensions.length > 0
        ? lowParentDimensions.map(p => `${categoryNames[p] || p} - wuxuu u baahan yahay horumar`)
        : ["Sii wad dadaalka wanaagsan ee aad ku jirto"];
    
    const focusAreas = [...lowChildCategories, ...lowParentDimensions]
      .slice(0, 2)
      .map(c => categoryNames[c] || c);
    if (focusAreas.length === 0) focusAreas.push("Sii wad waxbarashada", "Ku dadaal joogtaynta");
    
    const hasIssues = lowChildCategories.length > 0 || lowParentDimensions.length > 0;
    const summary = hasIssues
      ? `Qiimaynta waxay muujisay in qaar ka mid ah dhinacyada ay u baahan yihiin taageero. Nooca waalidnimadaada waa "${parentingStyle}". Koorsoyadan waxay kugu caawin doonaan.`
      : `Waxaad tahay waalid dadaal badan. Nooca waalidnimadaada waa "${parentingStyle}". Sii wad dadaalka wanaagsan.`;
    
    return {
      strengths,
      needsImprovement,
      focusAreas,
      parentingStyle,
      parentingTips: [
        "Maalin kasta la hadal ilmahaaga oo dhegayso",
        "Ciyaar waxbarasho leh la wadaag"
      ],
      summary,
      courseRecommendations: availableCourses
        .filter(c => c.isLive && (c.ageRange === childAgeRange || c.ageRange === "all" || !c.ageRange))
        .slice(0, 3)
        .map((c, i) => ({
          courseId: c.id,
          reason: lowChildCategories[0] 
            ? `Waxay kugu caawin doontaa horumarinta ${categoryNames[lowChildCategories[0]] || lowChildCategories[0]}`
            : "Koorsadan waxay kordhisaa aqoontaada waalidnimo",
          focusArea: focusAreas[0] || "Waxbarashada guud",
          priority: i + 1
        }))
    };
  }
}

export async function processAssessmentWithAI(assessmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const assessment = await storage.getParentAssessment(assessmentId);
    if (!assessment) {
      return { success: false, error: "Assessment not found" };
    }

    const childQuestions = await storage.getActiveAssessmentQuestions(assessment.childAgeRange);
    const parentQuestions = await storage.getActiveAssessmentQuestions("parent");
    const responses = await storage.getAssessmentResponses(assessmentId);
    const allCourses = await storage.getAllCourses();

    const analysis = await analyzeAssessment(
      assessmentId,
      assessment.childAgeRange,
      childQuestions,
      parentQuestions,
      responses,
      allCourses
    );

    await storage.saveAiInsights({
      assessmentId,
      strengths: JSON.stringify(analysis.strengths),
      needsImprovement: JSON.stringify(analysis.needsImprovement),
      focusAreas: JSON.stringify(analysis.focusAreas),
      summary: analysis.summary,
      parentingStyle: analysis.parentingStyle,
      parentingTips: analysis.parentingTips ? JSON.stringify(analysis.parentingTips) : null,
      aiModel: "gpt-4o-mini",
    });

    if (analysis.courseRecommendations && analysis.courseRecommendations.length > 0) {
      // Filter out recommendations with missing courseId and validate
      const validRecommendations = analysis.courseRecommendations
        .filter(rec => rec.courseId && typeof rec.courseId === 'string')
        .map(rec => ({
          assessmentId,
          courseId: rec.courseId,
          priority: rec.priority || 1,
          reason: rec.reason || "",
          focusArea: rec.focusArea || "",
        }));
      
      if (validRecommendations.length > 0) {
        await storage.saveLearningPathRecommendations(validRecommendations);
      }
    }

    await storage.updateParentAssessmentStatus(assessmentId, "analyzed");

    return { success: true };
  } catch (error: any) {
    console.error("[AI] Process assessment failed:", error.message);
    return { success: false, error: error.message };
  }
}
