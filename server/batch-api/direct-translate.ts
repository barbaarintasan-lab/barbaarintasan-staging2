import OpenAI from 'openai';
import { db } from '../db';
import { 
  translations, courses, modules, lessons, quizQuestions, 
  parentMessages, bedtimeStories,
  testimonials, announcements, homepageSections, aiGeneratedTips
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

function getAIClient(): OpenAI {
  const replitKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const replitBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const directKey = process.env.OPENAI_API_KEY;

  if (replitKey && replitBase) {
    return new OpenAI({ apiKey: replitKey, baseURL: replitBase });
  }
  if (directKey) {
    return new OpenAI({ apiKey: directKey });
  }
  throw new Error('No OpenAI API key available');
}

async function translateText(text: string): Promise<string> {
  const client = getAIClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a professional translator specializing in educational content for Somali parents.' },
      { role: 'user', content: `Translate the following Somali text to English. Maintain the educational tone and context. Return only the translation without any additional explanation or formatting.\n\nSomali text:\n${text}\n\nEnglish translation:` }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });
  return res.choices[0].message.content?.trim() || '';
}

async function saveTranslation(entityType: string, entityId: string, fieldName: string, translatedText: string) {
  await db.insert(translations).values({
    entityType,
    entityId,
    fieldName,
    sourceLanguage: 'somali',
    targetLanguage: 'english',
    translatedText
  }).onConflictDoUpdate({
    target: [translations.entityType, translations.entityId, translations.fieldName, translations.targetLanguage],
    set: { translatedText, updatedAt: new Date() }
  });
}

async function translateEntity(entityType: string, entityId: string, fields: Record<string, string | null | undefined>) {
  let translated = 0;
  for (const [fieldName, text] of Object.entries(fields)) {
    if (!text || text.trim().length < 3) continue;
    
    const existing = await db.select().from(translations).where(
      and(
        eq(translations.entityType, entityType),
        eq(translations.entityId, entityId),
        eq(translations.fieldName, fieldName),
        eq(translations.targetLanguage, 'english')
      )
    );
    if (existing.length > 0) continue;

    try {
      const result = await translateText(text);
      if (result) {
        await saveTranslation(entityType, entityId, fieldName, result);
        translated++;
        console.log(`[Direct Translate] ✓ ${entityType}.${fieldName} (${entityId})`);
      }
    } catch (err: any) {
      console.error(`[Direct Translate] ✗ ${entityType}.${fieldName} (${entityId}):`, err.message);
    }
  }
  return translated;
}

export async function runDirectTranslation(limit: number = 10): Promise<{ total: number; details: Record<string, number> }> {
  const details: Record<string, number> = {};
  let total = 0;

  console.log(`[Direct Translate] Starting direct translation (limit: ${limit} per type)...`);

  const untranslatedCourses = await db.select({
    id: courses.id, title: courses.title, description: courses.description, comingSoonMessage: courses.comingSoonMessage
  }).from(courses).where(
    sql`NOT EXISTS (SELECT 1 FROM ${translations} WHERE ${translations.entityType} = 'course' AND ${translations.entityId} = ${courses.id} AND ${translations.targetLanguage} = 'english')`
  ).limit(limit);

  for (const c of untranslatedCourses) {
    const n = await translateEntity('course', c.id, { title: c.title, description: c.description, comingSoonMessage: c.comingSoonMessage });
    total += n;
  }
  details.courses = untranslatedCourses.length;

  const untranslatedModules = await db.select({
    id: modules.id, title: modules.title
  }).from(modules).where(
    sql`NOT EXISTS (SELECT 1 FROM ${translations} WHERE ${translations.entityType} = 'module' AND ${translations.entityId} = ${modules.id} AND ${translations.targetLanguage} = 'english')`
  ).limit(limit);

  for (const m of untranslatedModules) {
    const n = await translateEntity('module', m.id, { title: m.title });
    total += n;
  }
  details.modules = untranslatedModules.length;

  const untranslatedLessons = await db.select({
    id: lessons.id, title: lessons.title, description: lessons.description, textContent: lessons.textContent
  }).from(lessons).where(
    sql`NOT EXISTS (SELECT 1 FROM ${translations} WHERE ${translations.entityType} = 'lesson' AND ${translations.entityId} = ${lessons.id} AND ${translations.targetLanguage} = 'english')`
  ).limit(limit);

  for (const l of untranslatedLessons) {
    const n = await translateEntity('lesson', l.id, { title: l.title, description: l.description, textContent: l.textContent });
    total += n;
  }
  details.lessons = untranslatedLessons.length;

  const untranslatedMessages = await db.select({
    id: parentMessages.id, title: parentMessages.title, content: parentMessages.content, keyPoints: parentMessages.keyPoints
  }).from(parentMessages).where(
    and(
      eq(parentMessages.isPublished, true),
      sql`NOT EXISTS (SELECT 1 FROM ${translations} WHERE ${translations.entityType} = 'parent_message' AND ${translations.entityId} = ${parentMessages.id} AND ${translations.targetLanguage} = 'english')`
    )
  ).limit(limit);

  for (const m of untranslatedMessages) {
    const n = await translateEntity('parent_message', m.id, { title: m.title, content: m.content, keyPoints: m.keyPoints });
    total += n;
  }
  details.parent_messages = untranslatedMessages.length;

  const untranslatedStories = await db.select({
    id: bedtimeStories.id, titleSomali: bedtimeStories.titleSomali, content: bedtimeStories.content, moralLesson: bedtimeStories.moralLesson
  }).from(bedtimeStories).where(
    and(
      eq(bedtimeStories.isPublished, true),
      sql`NOT EXISTS (SELECT 1 FROM ${translations} WHERE ${translations.entityType} = 'bedtime_story' AND ${translations.entityId} = ${bedtimeStories.id} AND ${translations.targetLanguage} = 'english')`
    )
  ).limit(limit);

  for (const s of untranslatedStories) {
    const n = await translateEntity('bedtime_story', s.id, { title: s.titleSomali, content: s.content, moralLesson: s.moralLesson });
    total += n;
  }
  details.bedtime_stories = untranslatedStories.length;

  const untranslatedTestimonials = await db.select({
    id: testimonials.id, message: testimonials.message, name: testimonials.name, courseTag: testimonials.courseTag
  }).from(testimonials).where(
    sql`NOT EXISTS (SELECT 1 FROM ${translations} WHERE ${translations.entityType} = 'testimonial' AND ${translations.entityId} = ${testimonials.id} AND ${translations.targetLanguage} = 'english')`
  ).limit(limit);

  for (const t of untranslatedTestimonials) {
    const n = await translateEntity('testimonial', t.id, { message: t.message, name: t.name, courseTag: t.courseTag });
    total += n;
  }
  details.testimonials = untranslatedTestimonials.length;

  const untranslatedAnnouncements = await db.select({
    id: announcements.id, title: announcements.title, content: announcements.content
  }).from(announcements).where(
    and(
      eq(announcements.isActive, true),
      sql`NOT EXISTS (SELECT 1 FROM ${translations} WHERE ${translations.entityType} = 'announcement' AND ${translations.entityId} = ${announcements.id} AND ${translations.targetLanguage} = 'english')`
    )
  ).limit(limit);

  for (const a of untranslatedAnnouncements) {
    const n = await translateEntity('announcement', a.id, { title: a.title, content: a.content });
    total += n;
  }
  details.announcements = untranslatedAnnouncements.length;

  const untranslatedSections = await db.select({
    id: homepageSections.id, title: homepageSections.title
  }).from(homepageSections).where(
    sql`NOT EXISTS (SELECT 1 FROM ${translations} WHERE ${translations.entityType} = 'homepage_section' AND ${translations.entityId} = ${homepageSections.id} AND ${translations.targetLanguage} = 'english')`
  ).limit(limit);

  for (const h of untranslatedSections) {
    const n = await translateEntity('homepage_section', h.id, { title: h.title });
    total += n;
  }
  details.homepage_sections = untranslatedSections.length;

  const untranslatedTips = await db.select({
    id: aiGeneratedTips.id, title: aiGeneratedTips.title, content: aiGeneratedTips.content, correctedContent: aiGeneratedTips.correctedContent
  }).from(aiGeneratedTips).where(
    and(
      eq(aiGeneratedTips.status, 'approved'),
      sql`NOT EXISTS (SELECT 1 FROM ${translations} WHERE ${translations.entityType} = 'ai_tip' AND ${translations.entityId} = ${aiGeneratedTips.id} AND ${translations.targetLanguage} = 'english')`
    )
  ).limit(limit);

  for (const tip of untranslatedTips) {
    const n = await translateEntity('ai_tip', tip.id, { title: tip.title, content: tip.content, correctedContent: tip.correctedContent });
    total += n;
  }
  details.ai_tips = untranslatedTips.length;

  console.log(`[Direct Translate] Done! ${total} fields translated.`);
  return { total, details };
}

export async function getTranslationStats() {
  const stats = await db.execute(sql`
    SELECT entity_type, COUNT(*) as count 
    FROM ${translations} 
    WHERE target_language = 'english'
    GROUP BY entity_type
  `);
  
  const totals = await db.execute(sql`
    SELECT 'course' as type, COUNT(*) as total FROM ${courses}
    UNION ALL SELECT 'module', COUNT(*) FROM ${modules}
    UNION ALL SELECT 'lesson', COUNT(*) FROM ${lessons}
    UNION ALL SELECT 'parent_message', COUNT(*) FROM ${parentMessages} WHERE is_published = true
    UNION ALL SELECT 'bedtime_story', COUNT(*) FROM ${bedtimeStories} WHERE is_published = true
    UNION ALL SELECT 'testimonial', COUNT(*) FROM ${testimonials}
    UNION ALL SELECT 'announcement', COUNT(*) FROM ${announcements} WHERE is_active = true
    UNION ALL SELECT 'homepage_section', COUNT(*) FROM ${homepageSections}
    UNION ALL SELECT 'ai_tip', COUNT(*) FROM ${aiGeneratedTips} WHERE status = 'approved'
  `);

  return { translated: stats.rows, totals: totals.rows };
}
