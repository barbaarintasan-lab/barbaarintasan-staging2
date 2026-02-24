import cron from "node-cron";
import * as fs from 'fs';
import * as path from 'path';
import { storage } from "./storage";
import {
  sendSubscriptionReminderEmail,
  sendSubscriptionExpiredEmail,
} from "./email";
import {
  sendEventReminders,
  sendTelegramSubscriptionReminder,
  sendTelegramSubscriptionExpired,
  sendTelegramAppointmentReminder,
} from "./telegram";
import { generateDailyBedtimeStory } from "./bedtimeStories";
import { generateAndSaveParentMessage } from "./parentMessages";
import { generateAndSaveParentTip } from "./parentTips";
import { db } from "./db";
import { runBatchWorker, checkAllBatchJobsStatus } from "./batch-api";
import {
  enrollments,
  appointments,
  flashcardCategories,
  flashcards,
  parents,
  pushSubscriptions,
} from "@shared/schema";
import { eq, and, lte, gte, lt, isNull, or } from "drizzle-orm";
import OpenAI from "openai";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";
import webpush from "web-push";

const SOMALI_VOCABULARY: Record<
  string,
  Array<{ somali: string; english: string }>
> = {
  Khudaar: [
    { somali: "Baradho", english: "Potato" },
    { somali: "Karooto", english: "Carrot" },
    { somali: "Kaabash", english: "Cabbage" },
    { somali: "Basal", english: "Onion" },
    { somali: "Yaanyo", english: "Tomato" },
    { somali: "Basbaas", english: "Chili pepper" },
    { somali: "Qajaar", english: "Cucumber" },
    { somali: "Toon", english: "Garlic" },
    { somali: "Bamiyo", english: "Okra" },
    { somali: "Digir", english: "Beans" },
  ],
  Miro: [
    { somali: "Muus", english: "Banana" },
    { somali: "Liin macaan", english: "Orange" },
    { somali: "Cambe", english: "Mango" },
    { somali: "Babaay", english: "Papaya" },
    { somali: "Qare", english: "Watermelon" },
    { somali: "Cananaas", english: "Pineapple" },
    { somali: "Tufaax", english: "Apple" },
    { somali: "Canab", english: "Grapes" },
    { somali: "Liindhanaan", english: "Lemon" },
    { somali: "Timir", english: "Date" },
  ],
  Xayawaan: [
    { somali: "Libaax", english: "Lion" },
    { somali: "Maroodi", english: "Elephant" },
    { somali: "Geri", english: "Giraffe" },
    { somali: "Eey", english: "Dog" },
    { somali: "Bisad", english: "Cat" },
    { somali: "Lo'", english: "Cow" },
    { somali: "Ri'", english: "Goat" },
    { somali: "Ido", english: "Sheep" },
    { somali: "Geel", english: "Camel" },
    { somali: "Digaag", english: "Chicken" },
    { somali: "Shimbir", english: "Bird" },
    { somali: "Faras", english: "Horse" },
    { somali: "Dameer", english: "Donkey" },
  ],
  Jidhka: [
    { somali: "Madax", english: "Head" },
    { somali: "Il", english: "Eye" },
    { somali: "Dheg", english: "Ear" },
    { somali: "San", english: "Nose" },
    { somali: "Af", english: "Mouth" },
    { somali: "Ilig", english: "Tooth" },
    { somali: "Gacan", english: "Hand" },
    { somali: "Cag", english: "Foot" },
    { somali: "Far", english: "Finger" },
    { somali: "Laab", english: "Chest" },
    { somali: "Calool", english: "Stomach" },
    { somali: "Dhabar", english: "Back" },
  ],
  Midab: [
    { somali: "Cad", english: "White" },
    { somali: "Madow", english: "Black" },
    { somali: "Cas", english: "Red" },
    { somali: "Cagaar", english: "Green" },
    { somali: "Buluug", english: "Blue" },
    { somali: "Jaalle", english: "Yellow" },
    { somali: "Buni", english: "Brown" },
  ],
  Nambarro: [
    { somali: "Eber", english: "Zero" },
    { somali: "Kow", english: "One" },
    { somali: "Laba", english: "Two" },
    { somali: "Saddex", english: "Three" },
    { somali: "Afar", english: "Four" },
    { somali: "Shan", english: "Five" },
    { somali: "Lix", english: "Six" },
    { somali: "Toddoba", english: "Seven" },
    { somali: "Siddeed", english: "Eight" },
    { somali: "Sagaal", english: "Nine" },
    { somali: "Toban", english: "Ten" },
  ],
  Guriga: [
    { somali: "Kursi", english: "Chair" },
    { somali: "Miis", english: "Table" },
    { somali: "Sariir", english: "Bed" },
    { somali: "Albaab", english: "Door" },
    { somali: "Daaqad", english: "Window" },
    { somali: "Guri", english: "House" },
    { somali: "Koob", english: "Cup" },
    { somali: "Saxan", english: "Plate" },
  ],
  Qoys: [
    { somali: "Hooyo", english: "Mother" },
    { somali: "Aabbe", english: "Father" },
    { somali: "Walaal", english: "Sibling" },
    { somali: "Wiil", english: "Boy" },
    { somali: "Gabadh", english: "Girl" },
    { somali: "Nin", english: "Man" },
    { somali: "Naag", english: "Woman" },
  ],
};

async function checkExpiringSubscriptions() {
  console.log("[CRON] Checking for expiring subscriptions...");

  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringEnrollments = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.status, "active"),
          lte(enrollments.accessEnd, sevenDaysFromNow),
          gte(enrollments.accessEnd, now),
        ),
      );

    for (const enrollment of expiringEnrollments) {
      if (!enrollment.parentId || !enrollment.accessEnd) continue;

      const parent = await storage.getParent(enrollment.parentId);
      if (!parent) continue;

      const course = await storage.getCourse(enrollment.courseId);
      if (!course) continue;

      const msRemaining = enrollment.accessEnd.getTime() - now.getTime();
      const hoursRemaining = msRemaining / (1000 * 60 * 60);
      const daysRemaining = Math.ceil(hoursRemaining / 24);

      if (hoursRemaining <= 25 && !enrollment.reminder25HourSent) {
        console.log(
          `[CRON] Sending 25-hour reminder to ${parent.email} for ${course.title}`,
        );
        if (parent.email) {
          await sendSubscriptionReminderEmail(
            parent.email,
            parent.name,
            course.title,
            0,
            Math.round(hoursRemaining),
          );
        }
        if (parent.telegramChatId && parent.telegramOptin) {
          await sendTelegramSubscriptionReminder(
            parent.telegramChatId,
            parent.name,
            course.title,
            0,
            Math.round(hoursRemaining),
          );
        }
        await db
          .update(enrollments)
          .set({ reminder25HourSent: now })
          .where(eq(enrollments.id, enrollment.id));
      } else if (
        daysRemaining <= 3 &&
        daysRemaining > 1 &&
        !enrollment.reminder3DaySent
      ) {
        console.log(
          `[CRON] Sending 3-day reminder to ${parent.email} for ${course.title}`,
        );
        if (parent.email) {
          await sendSubscriptionReminderEmail(
            parent.email,
            parent.name,
            course.title,
            daysRemaining,
          );
        }
        if (parent.telegramChatId && parent.telegramOptin) {
          await sendTelegramSubscriptionReminder(
            parent.telegramChatId,
            parent.name,
            course.title,
            daysRemaining,
          );
        }
        await db
          .update(enrollments)
          .set({ reminder3DaySent: now })
          .where(eq(enrollments.id, enrollment.id));
      } else if (
        daysRemaining <= 7 &&
        daysRemaining > 3 &&
        !enrollment.reminder7DaySent
      ) {
        console.log(
          `[CRON] Sending 7-day reminder to ${parent.email} for ${course.title}`,
        );
        if (parent.email) {
          await sendSubscriptionReminderEmail(
            parent.email,
            parent.name,
            course.title,
            daysRemaining,
          );
        }
        if (parent.telegramChatId && parent.telegramOptin) {
          await sendTelegramSubscriptionReminder(
            parent.telegramChatId,
            parent.name,
            course.title,
            daysRemaining,
          );
        }
        await db
          .update(enrollments)
          .set({ reminder7DaySent: now })
          .where(eq(enrollments.id, enrollment.id));
      }
    }
  } catch (error) {
    console.error("[CRON] Error checking expiring subscriptions:", error);
  }
}

// AI Tip Settings - stored in JSON file
const AI_TIP_SETTINGS_FILE = path.join(process.cwd(), 'ai-tip-settings.json');

interface AiTipSettings {
  prompt: string;
  pauseUntil: string | null; // ISO date string, e.g., "2026-03-20"
}

const DEFAULT_PROMPT = `Waxaad tahay khabiir ku takhasusay barbaarinta carruurta oo Soomaali ku hadla.
    
Samee talo kooban oo wanaagsan oo ku saabsan {category} ee carruurta da'doodu tahay {ageRange}.

Qoraalka:
- Ha ku qor Af-Soomaali faseex oo sahal ah
- Talo hal ama laba tixraac ah oo macquul ah
- Ha ka dhigin mid aad u dheer - 2-4 xarig kaliya
- Ha ku dar emoji hal ama laba
- Ha ku dar "Mahadsanid, Barbaarintasan Academy" dhamaadka

Haddii aad ka hadlaysid "behavior" (dabeecadda), u qor sida waalidka uga caawin karaan ilmahooda inuu dabeecad wanaagsan yeesha.

Qor talo cusub oo aan loo aqoon:`;

export function getAiTipSettings(): AiTipSettings {
  try {
    if (fs.existsSync(AI_TIP_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AI_TIP_SETTINGS_FILE, 'utf-8'));
      return {
        prompt: data.prompt || DEFAULT_PROMPT,
        pauseUntil: data.pauseUntil || null,
      };
    }
  } catch (e) {
    console.warn("[AI-TIP] Error reading settings file:", e);
  }
  return { prompt: DEFAULT_PROMPT, pauseUntil: null };
}

export function saveAiTipSettings(settings: Partial<AiTipSettings>): AiTipSettings {
  const current = getAiTipSettings();
  const updated = {
    prompt: settings.prompt !== undefined ? settings.prompt : current.prompt,
    pauseUntil: settings.pauseUntil !== undefined ? settings.pauseUntil : current.pauseUntil,
  };
  fs.writeFileSync(AI_TIP_SETTINGS_FILE, JSON.stringify(updated, null, 2));
  console.log("[AI-TIP] Settings saved:", { promptLength: updated.prompt.length, pauseUntil: updated.pauseUntil });
  return updated;
}

function isAiTipPaused(): boolean {
  const settings = getAiTipSettings();
  if (!settings.pauseUntil) return false;
  const pauseDate = new Date(settings.pauseUntil);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today < pauseDate;
}

// AI Tip Generator - generates daily parenting tips in Somali
async function generateAiParentingTip() {
  if (isAiTipPaused()) {
    const settings = getAiTipSettings();
    console.log(`[CRON] AI tip generation is PAUSED until ${settings.pauseUntil} - skipping`);
    return;
  }

  console.log("[CRON] Generating AI parenting tip...");

  const openaiApiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!openaiApiKey) {
    console.log(
      "[CRON] OpenAI API key not configured - skipping AI tip generation",
    );
    return;
  }

  try {
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: openaiBaseUrl,
    });

    const ageRanges = [
      "0-6 bilood",
      "6-12 bilood",
      "1-2 sano",
      "2-4 sano",
      "4-6 sano",
    ];
    const categories = [
      "feeding",
      "sleep",
      "play",
      "health",
      "emotional",
      "behavior",
      "learning",
    ];

    const randomAgeRange =
      ageRanges[Math.floor(Math.random() * ageRanges.length)];
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];

    const categoryNames: Record<string, string> = {
      feeding: "Quudinta",
      sleep: "Hurdada",
      play: "Ciyaarta",
      health: "Caafimaadka",
      emotional: "Dareenka",
      behavior: "Dabeecadda",
      learning: "Barashada",
    };

    const settings = getAiTipSettings();
    const prompt = settings.prompt
      .replace(/\{category\}/g, categoryNames[randomCategory])
      .replace(/\{ageRange\}/g, randomAgeRange);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 300,
    });

    const tipContent = response.choices[0]?.message?.content?.trim();
    if (!tipContent) {
      console.log("[CRON] No content received from OpenAI");
      return;
    }

    // Generate a title based on category
    const title = `${categoryNames[randomCategory]} - ${randomAgeRange}`;

    // Calculate publish date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const publishDate = tomorrow.toISOString().split("T")[0];

    // Store the tip for admin review
    const tip = await storage.createAiGeneratedTip({
      title,
      content: tipContent,
      ageRange: randomAgeRange,
      category: randomCategory,
      publishDate,
    });

    console.log(`[CRON] AI tip generated successfully: ${tip.id} - ${title}`);
  } catch (error) {
    console.error("[CRON] Error generating AI tip:", error);
  }
}

async function generateAiFlashcards() {
  console.log("[CRON] Generating AI flashcard images...");

  const openaiApiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!openaiApiKey) {
    console.log(
      "[CRON] OpenAI API key not configured - skipping flashcard generation",
    );
    return;
  }

  try {
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: openaiBaseUrl,
    });

    const allCategories = await db
      .select()
      .from(flashcardCategories)
      .where(eq(flashcardCategories.isActive, true));
    if (allCategories.length === 0) {
      console.log("[CRON] No active flashcard categories found");
      return;
    }

    const existingFlashcards = await db
      .select({ nameSomali: flashcards.nameSomali })
      .from(flashcards);
    const existingNames = new Set(
      existingFlashcards.map((f) => f.nameSomali.toLowerCase()),
    );

    const categoryToDbCategory: Record<string, (typeof allCategories)[0]> = {};
    for (const cat of allCategories) {
      categoryToDbCategory[cat.name] = cat;
    }

    const pendingWords: Array<{
      categoryName: string;
      categoryId: string;
      somali: string;
      english: string;
    }> = [];

    for (const [categoryName, words] of Object.entries(SOMALI_VOCABULARY)) {
      const dbCategory = categoryToDbCategory[categoryName];
      if (!dbCategory) continue;

      for (const word of words) {
        if (!existingNames.has(word.somali.toLowerCase())) {
          pendingWords.push({
            categoryName,
            categoryId: dbCategory.id,
            somali: word.somali,
            english: word.english,
          });
        }
      }
    }

    if (pendingWords.length === 0) {
      console.log("[CRON] All vocabulary words already have flashcards");
      return;
    }

    const shuffled = pendingWords.sort(() => Math.random() - 0.5);
    const toGenerate = shuffled.slice(0, 5);

    console.log(
      `[CRON] Generating ${toGenerate.length} flashcard images from ${pendingWords.length} pending words`,
    );

    for (const word of toGenerate) {
      try {
        console.log(
          `[CRON] Generating image for: ${word.somali} (${word.english})`,
        );

        const imagePrompt = `Create a simple, colorful, child-friendly educational flashcard image for the word "${word.english}". 
The image should:
- Show a clear, cute illustration of ${word.english.toLowerCase()}
- Use bright, vibrant colors
- Have a clean white or light pastel background
- Be suitable for young children learning vocabulary
- NOT include any text or labels
- Be in a flat, modern cartoon style
- Be centered and easily recognizable`;

        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
        });

        const imageBase64 = response.data[0]?.b64_json;
        if (!imageBase64) {
          console.log(`[CRON] No image generated for ${word.somali}`);
          continue;
        }

        const imageBuffer = Buffer.from(imageBase64, "base64");

        const publicSearchPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
        const firstPath = publicSearchPaths.split(",")[0]?.trim();
        if (!firstPath) {
          console.log("[CRON] PUBLIC_OBJECT_SEARCH_PATHS not configured");
          continue;
        }

        const pathParts = firstPath.split("/").filter(Boolean);
        const bucketName = pathParts[0];
        const timestamp = Date.now();
        const fileName = `flashcards/${word.categoryName.toLowerCase()}/${word.somali.toLowerCase().replace(/\s+/g, "-")}-${timestamp}.png`;

        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(`public/${fileName}`);

        await file.save(imageBuffer, {
          contentType: "image/png",
          metadata: {
            cacheControl: "public, max-age=31536000",
          },
        });

        const imageUrl = `/public-files/${fileName}`;

        const existingCount = await db
          .select({ count: flashcards.id })
          .from(flashcards)
          .where(eq(flashcards.categoryId, word.categoryId));
        const order = existingCount.length;

        await storage.createFlashcard({
          categoryId: word.categoryId,
          nameSomali: word.somali,
          nameEnglish: word.english,
          imageUrl,
          order,
          isActive: true,
        });

        console.log(
          `[CRON] Flashcard created successfully: ${word.somali} (${word.english})`,
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (wordError) {
        console.error(
          `[CRON] Error generating flashcard for ${word.somali}:`,
          wordError,
        );
      }
    }

    console.log("[CRON] AI flashcard generation completed");
  } catch (error) {
    console.error("[CRON] Error generating AI flashcards:", error);
  }
}

export async function expireSubscriptions() {
  console.log("[CRON] Checking for expired subscriptions...");

  try {
    const expiredEnrollments = await storage.getExpiredEnrollments();
    console.log(`[CRON] Found ${expiredEnrollments.length} expired enrollment(s) to process`);

    if (expiredEnrollments.length === 0) {
      console.log("[CRON] No expired enrollments found - all good");
      return { processed: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

    for (const enrollment of expiredEnrollments) {
      try {
        console.log(`[CRON] Expiring enrollment ${enrollment.id} (parentId: ${enrollment.parentId}, courseId: ${enrollment.courseId}, accessEnd: ${enrollment.accessEnd})`);
        await storage.updateEnrollmentStatus(enrollment.id, "expired");
        processed++;

        if (enrollment.parentId) {
          const parent = await storage.getParent(enrollment.parentId);
          const course = await storage.getCourse(enrollment.courseId);

          if (parent && course) {
            console.log(`[CRON] Enrollment expired for ${parent.name} (${parent.email}) - ${course.title} - accessEnd was ${enrollment.accessEnd}`);
            if (parent.email) {
              console.log(`[CRON] Sending expiration email to ${parent.email}`);
              try {
                await sendSubscriptionExpiredEmail(
                  parent.email,
                  parent.name,
                  course.title,
                );
                console.log(`[CRON] Expiration email sent to ${parent.email}`);
              } catch (emailErr) {
                console.error(`[CRON] Failed to send expiration email to ${parent.email}:`, emailErr);
              }
            }
            if (parent.telegramChatId && parent.telegramOptin) {
              console.log(`[CRON] Sending expiration Telegram to ${parent.telegramChatId}`);
              try {
                await sendTelegramSubscriptionExpired(
                  parent.telegramChatId,
                  parent.name,
                  course.title,
                );
                console.log(`[CRON] Expiration Telegram sent to ${parent.telegramChatId}`);
              } catch (tgErr) {
                console.error(`[CRON] Failed to send expiration Telegram:`, tgErr);
              }
            }
          } else {
            console.warn(`[CRON] Could not find parent (${enrollment.parentId}) or course (${enrollment.courseId}) for expired enrollment`);
          }
        }
      } catch (enrollErr) {
        errors++;
        console.error(`[CRON] Error processing enrollment ${enrollment.id}:`, enrollErr);
      }
    }

    console.log(`[CRON] Expiration complete: ${processed} processed, ${errors} errors`);
    return { processed, errors };
  } catch (error) {
    console.error("[CRON] Error expiring subscriptions:", error);
    return { processed: 0, errors: 1 };
  }
}

// Send Telegram reminders 1 hour before appointments
async function checkAppointmentReminders() {
  console.log("[CRON] Checking for upcoming appointment reminders...");

  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Get all approved appointments that haven't received 1h reminder
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "approved"),
          isNull(appointments.reminder1hSentAt),
        ),
      );

    for (const apt of upcomingAppointments) {
      // Parse appointment datetime
      const aptDateTime = new Date(
        `${apt.appointmentDate}T${apt.appointmentTime}`,
      );
      const minutesUntilAppt =
        (aptDateTime.getTime() - now.getTime()) / (1000 * 60);

      // Send reminder if appointment is between 30 and 90 minutes away (to catch the 1-hour mark)
      if (minutesUntilAppt > 30 && minutesUntilAppt <= 90) {
        const parent = await storage.getParent(apt.parentId);

        if (parent && parent.telegramChatId && parent.telegramOptin) {
          console.log(
            `[CRON] Sending 1-hour appointment reminder to ${parent.name} via Telegram`,
          );

          await sendTelegramAppointmentReminder(
            parent.telegramChatId,
            parent.name,
            apt.teacherName,
            apt.appointmentDate,
            apt.appointmentTime,
            apt.topic || undefined,
            apt.meetingLink || undefined,
          );

          // Mark reminder as sent
          await db
            .update(appointments)
            .set({ reminder1hSentAt: now })
            .where(eq(appointments.id, apt.id));

          console.log(`[CRON] Appointment reminder sent for ${apt.id}`);
        }
      }
    }
  } catch (error) {
    console.error("[CRON] Error checking appointment reminders:", error);
  }
}

// Send daily study reminders to parents who enabled them
async function sendDailyStudyReminders() {
  try {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, "0") + ":00";

    console.log(
      `[CRON] Checking for daily study reminders at ${currentHour}...`,
    );

    // Get all parents with daily reminder enabled for this hour
    const parentsWithReminders = await db
      .select()
      .from(parents)
      .where(
        and(
          eq(parents.dailyReminderEnabled, true),
          eq(parents.dailyReminderTime, currentHour),
        ),
      );

    if (parentsWithReminders.length === 0) {
      console.log(`[CRON] No parents have reminders set for ${currentHour}`);
      return;
    }

    console.log(
      `[CRON] Found ${parentsWithReminders.length} parents with reminders at ${currentHour}`,
    );

    // Check if VAPID keys are configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log(
        "[CRON] VAPID keys not configured - skipping push notifications",
      );
      return;
    }

    // Set VAPID details if not already set
    try {
      webpush.setVapidDetails(
        "mailto:info@barbaarintasan.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    } catch (e) {
      // Already set
    }

    const motivationalMessages = [
      "Waa wakhtigii waxbarashada! Casharada cusub ayaa ku sugaya.",
      "Maalin wanaagsan! Waxaa waqti u ah inaad ilmahaaga wax la barato.",
      "Xusuus: Cashar kasta waa qalab cusub oo waxbarasho ah!",
      "Waxbarasho yar oo maalin kasta wax weyn bay keentaa.",
      "Carruurta waxbarashada waqti siiya! Casharada waa diyaar.",
    ];

    const randomMessage =
      motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];

    for (const parent of parentsWithReminders) {
      const title = "Xusuusin Waxbarasho";

      // Save notification to inbox
      await storage.createParentNotification({
        parentId: parent.id,
        title,
        body: randomMessage,
        type: "reminder",
        payload: JSON.stringify({ url: "/courses" }),
      });

      await sendPushToParent(parent.id, parent.name, {
        title,
        body: randomMessage,
        url: "/courses",
      });
    }
  } catch (error) {
    console.error("[CRON] Error sending daily study reminders:", error);
  }
}

async function sendPushToParent(parentId: string, parentName: string, payload: object) {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.parentId, parentId));

  if (subscriptions.length === 0) return;

  let sent = false;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      if (!sent) {
        console.log(`[CRON] Sent push notification to ${parentName}`);
        sent = true;
      }
      break;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await storage.deletePushSubscription(parentId, sub.endpoint);
        console.log(`[CRON] Removed expired subscription for ${parentName}`);
      } else {
        console.error(`[CRON] Failed push to ${parentName}:`, err.message);
      }
    }
  }
}

async function sendBedtimeStoryNotification() {
  try {
    const todayStory = await storage.getTodayBedtimeStory();
    if (!todayStory) {
      console.log("[CRON] No bedtime story available for today, skipping notification");
      return;
    }

    const allParents = await db.select().from(parents);
    const title = "Waqtigii Sheekada Hurdo! 🌙";
    const body = `Sheeko cusub: ${todayStory.titleSomali}`;

    for (const parent of allParents) {
      await storage.createParentNotification({
        parentId: parent.id,
        title,
        body,
        type: "bedtime_story",
        payload: JSON.stringify({ url: "/maaweelo", storyId: todayStory.id }),
      });

      await sendPushToParent(parent.id, parent.name, {
        title,
        body,
        url: "/maaweelo",
        icon: "🌙",
      });
    }
    console.log(`[CRON] Bedtime story notifications sent to ${allParents.length} parents`);
  } catch (error) {
    console.error("[CRON] Error sending bedtime story notifications:", error);
  }
}

async function sendInactiveParentNotifications() {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log("[CRON] VAPID keys not configured - skipping inactive parent notifications");
      return;
    }

    try {
      webpush.setVapidDetails(
        "mailto:info@barbaarintasan.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    } catch (e) {}

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const inactiveParents = await db
      .select()
      .from(parents)
      .where(
        and(
          or(
            lt(parents.lastActiveAt, twentyFourHoursAgo),
            isNull(parents.lastActiveAt),
          ),
          or(
            lt(parents.lastEngagementNotifiedAt, twentyFourHoursAgo),
            isNull(parents.lastEngagementNotifiedAt),
          ),
        )
      );

    if (inactiveParents.length === 0) {
      console.log("[CRON] No inactive parents found for re-engagement notification");
      return;
    }

    console.log(`[CRON] Found ${inactiveParents.length} inactive parents (24h+), sending re-engagement notifications...`);

    const reEngagementMessages = [
      "Waalid, waan ku xiisanay! Waalidiinta kale ayaa appka ka faa'iidaysanaya - adna kaalay oo wakhtigaaga waxbarasho geli!",
      "Barbaarintasan waa ku sugaysa! Casharado cusub iyo waalidiinta kale ayaa ku sugaya – na soo booqo maanta!",
      "Ilmahaagu wuxuu kugu amaani doono, markuu koro, inaad wax baran jirtay - kaalay oo waqti waxbarasho oo tayo leh geli maanta!",
      "Waalidiinta badan ayaa maanta wax ka bartay Barbaarintasan - adna ku soo biir oo casharadaada sii wad!",
      "Ma ogtahay? Waxbarasho yar oo maalin kasta ah wax weyn bay keentaa - soo booqo appka oo cashar cusub baro!",
      "Waalid, muddo ayaad maqnayd! Waalidiinta kale ayaa casharado badan dhammaystay - adna soo laabo!",
      "Carruurta waalidkood wax barto waa kuwa guuleysta - kaalay oo waxbaro oo bilow maanta!",
      "Waalid qiimo leh, waalidiin kale ayaa maanta waxbarashadooda horumarinaya. Adigana waan kuu xiisaynay — soo booqo app-ka oo ilmahaaga u hur wakhti qiimo leh.",
    ];

    const randomMessage = reEngagementMessages[Math.floor(Math.random() * reEngagementMessages.length)];
    const title = "❤️ Waan kuu xiisaynay!";

    let sentCount = 0;
    let failCount = 0;

    for (const parent of inactiveParents) {
      try {
        await storage.createParentNotification({
          parentId: parent.id,
          title,
          body: randomMessage,
          type: "engagement",
          payload: JSON.stringify({ url: "/" }),
        });

        await sendPushToParent(parent.id, parent.name, {
          title,
          body: randomMessage,
          url: "/",
        });
        sentCount++;
        await db
          .update(parents)
          .set({ lastEngagementNotifiedAt: new Date() })
          .where(eq(parents.id, parent.id));
      } catch (err) {
        console.error(`[CRON] Error processing inactive notification for parent ${parent.id}:`, err);
      }
    }

    console.log(`[CRON] Inactive parent notifications complete: ${sentCount} sent, ${failCount} failed, ${inactiveParents.length} parents targeted`);
  } catch (error) {
    console.error("[CRON] Error sending inactive parent notifications:", error);
  }
}

export function startCronJobs() {
  console.log("[CRON] Starting subscription management cron jobs...");

  // Check subscriptions every hour
  cron.schedule("0 * * * *", async () => {
    await checkExpiringSubscriptions();
    await expireSubscriptions();
    await sendDailyStudyReminders();
  });

  // Send event reminders every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    await sendEventReminders();
  });

  // Check appointment reminders every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    await checkAppointmentReminders();
  });

  // Generate AI parenting tip every 3 hours from 6:00 AM to 9:00 PM East Africa Time
  // Runs at: 6:00 AM, 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM, 9:00 PM EAT
  cron.schedule("0 6,9,12,15,18,21 * * *", async () => {
    await generateAiParentingTip();
  }, { timezone: "Africa/Nairobi" });

  // Generate AI flashcard images daily at 7:00 AM
  cron.schedule("0 7 * * *", async () => {
    await generateAiFlashcards();
  });

  // Generate daily parent message (Dhambaalka Waalidka) at 8:00 AM East Africa Time
  cron.schedule("0 8 * * *", async () => {
    console.log("[CRON] Generating daily parent message (Dhambaalka Waalidka)...");
    try {
      await generateAndSaveParentMessage();
      console.log("[CRON] Daily parent message generated successfully");
    } catch (error) {
      console.error("[CRON] Failed to generate daily parent message:", error);
    }
  }, { timezone: "Africa/Mogadishu" });

  // Generate daily bedtime story at 8:00 AM East Africa Time (same time as parent message)
  cron.schedule("0 8 * * *", async () => {
    console.log("[CRON] Generating daily bedtime story...");
    try {
      await generateDailyBedtimeStory();
      console.log("[CRON] Daily bedtime story generated successfully");
    } catch (error) {
      console.error("[CRON] Failed to generate daily bedtime story:", error);
    }
  }, { timezone: "Africa/Mogadishu" });

  // Generate daily parent tips for one random stage at 7:30 AM East Africa Time
  cron.schedule("30 7 * * *", async () => {
    console.log("[CRON] Generating daily parent tip...");
    try {
      const stages = ["newborn-0-3m", "infant-3-6m", "infant-6-12m", "toddler-1-2y", "toddler-2-3y", "preschool-3-5y", "school-age-5-7y"];
      const randomStage = stages[Math.floor(Math.random() * stages.length)];
      await generateAndSaveParentTip(randomStage);
      console.log(`[CRON] Daily parent tip generated successfully for ${randomStage}`);
    } catch (error) {
      console.error("[CRON] Failed to generate daily parent tip:", error);
    }
  }, { timezone: "Africa/Mogadishu" });

  // Send bedtime story notification at 6:00 PM East Africa Time
  cron.schedule("0 18 * * *", async () => {
    console.log("[CRON] Sending bedtime story notifications...");
    await sendBedtimeStoryNotification();
  }, { timezone: "Africa/Mogadishu" });

  // Send re-engagement notifications to inactive parents every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    console.log("[CRON] Checking for inactive parents (24h+) to send re-engagement notifications...");
    await sendInactiveParentNotifications();
  });

  // Run OpenAI Batch API worker every night at 2:00 AM East Africa Time
  cron.schedule("0 2 * * *", async () => {
    console.log("[CRON] Running OpenAI Batch API worker for bulk translations and content generation...");
    try {
      await runBatchWorker();
      console.log("[CRON] Batch API worker completed successfully");
    } catch (error) {
      console.error("[CRON] Failed to run batch API worker:", error);
    }
  }, { timezone: "Africa/Mogadishu" });

  // Check batch job status every hour
  cron.schedule("30 * * * *", async () => {
    console.log("[CRON] Checking OpenAI Batch API job status...");
    try {
      await checkAllBatchJobsStatus();
      console.log("[CRON] Batch API status check completed");
    } catch (error) {
      console.error("[CRON] Failed to check batch API status:", error);
    }
  }, { timezone: "Africa/Mogadishu" });

  console.log(
    "[CRON] Cron jobs scheduled (subscriptions hourly, events 30min, appointments 15min, AI tips every 3h (6AM-9PM EAT), flashcards 7AM, parent message 8AM, bedtime story 8AM EAT, bedtime notification 6PM, daily reminders hourly, inactive re-engagement every 6h, batch worker 2AM EAT, batch status check hourly)",
  );

  setTimeout(async () => {
    console.log("[CRON] Running initial subscription check...");
    await checkExpiringSubscriptions();
    await expireSubscriptions();
  }, 10000);

  // Check for missed daily content on startup (catches days where cron didn't fire)
  setTimeout(async () => {
    console.log("[CRON] Checking for missed daily content on startup...");
    try {
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Africa/Mogadishu' }); // YYYY-MM-DD Somalia time

      // Check if today's Dhambaal exists
      const todayDhambaal = await storage.getTodayParentMessage();
      if (!todayDhambaal) {
        console.log(`[CRON] No Dhambaal found for today (${todayStr}), generating now...`);
        try {
          await generateAndSaveParentMessage();
          console.log("[CRON] Missed Dhambaal generated successfully on startup");
        } catch (err) {
          console.error("[CRON] Failed to generate missed Dhambaal on startup:", err);
        }
      } else {
        console.log(`[CRON] Today's Dhambaal already exists: "${todayDhambaal.title}"`);
      }

      // Check if today's bedtime story exists
      const todayStory = await storage.getTodayBedtimeStory();
      if (!todayStory) {
        console.log(`[CRON] No bedtime story found for today (${todayStr}), generating now...`);
        try {
          await generateDailyBedtimeStory();
          console.log("[CRON] Missed bedtime story generated successfully on startup");
        } catch (err) {
          console.error("[CRON] Failed to generate missed bedtime story on startup:", err);
        }
      } else {
        console.log(`[CRON] Today's bedtime story already exists: "${todayStory.titleSomali}"`);
      }
    } catch (error) {
      console.error("[CRON] Error checking for missed daily content:", error);
    }
  }, 15000); // Wait 15 seconds after startup to allow DB connections to settle
}

// AI Lesson Settings - stored in JSON file
const AI_LESSON_SETTINGS_FILE = path.join(process.cwd(), 'ai-lesson-settings.json');

interface AiLessonSettings {
  prompt: string;
}

const DEFAULT_LESSON_PROMPT = `Waxaad tahay macallin ku takhasusay barbaarinta carruurta oo Soomaali ku hadla. Waxaad u qoraysaa waalidiinta Soomaaliyeed.

Samee cashar qoraal ah oo ku saabsan: {topic}
Koorsada: {courseTitle}
Qaybta: {moduleTitle}

Qoraalka:
- Ha ku qor Af-Soomaali faseex oo sahal ah oo waalidiintu fahmaan
- Casharku ha noqdo mid faahfaahsan, 400-800 kelmadood
- Ha ku dar tusaalooyin macquul ah oo nolosha ka mid ah
- Qaybaha casharka si fiican u kala saar (Hordhac, Qodobbo muhiim ah, Talooyinka, Gunaanad)
- Ha isticmaal luqad hoose oo dareen leh oo waalidiinta la xiriirta
- Ha ku dar emoji yar yar meelaha ku habboon
- Dhamaadka ha ku dar "Barbaarintasan Academy"

Qor casharka:`;

export function getAiLessonSettings(): AiLessonSettings {
  try {
    if (fs.existsSync(AI_LESSON_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AI_LESSON_SETTINGS_FILE, 'utf-8'));
      return { prompt: data.prompt || DEFAULT_LESSON_PROMPT };
    }
  } catch (e) {
    console.warn("[AI-LESSON] Error reading settings file:", e);
  }
  return { prompt: DEFAULT_LESSON_PROMPT };
}

export function saveAiLessonSettings(settings: Partial<AiLessonSettings>): AiLessonSettings {
  const current = getAiLessonSettings();
  const updated = {
    prompt: settings.prompt !== undefined ? settings.prompt : current.prompt,
  };
  fs.writeFileSync(AI_LESSON_SETTINGS_FILE, JSON.stringify(updated, null, 2));
  console.log("[AI-LESSON] Settings saved:", { promptLength: updated.prompt.length });
  return updated;
}

// Export for manual trigger from admin
export { generateAiParentingTip, generateAiFlashcards };
