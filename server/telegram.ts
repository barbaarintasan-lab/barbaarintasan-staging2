import { storage } from "./storage";
import crypto from "crypto";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Cache for member count to avoid hitting Telegram API too frequently
let cachedMemberCount: { count: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export async function getTelegramGroupMemberCount(): Promise<number | null> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_CHAT_ID) {
    console.error("[Telegram] Bot token or group chat ID not configured");
    return null;
  }

  // Return cached value if still valid
  if (cachedMemberCount && (Date.now() - cachedMemberCount.timestamp) < CACHE_TTL_MS) {
    return cachedMemberCount.count;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/getChatMemberCount?chat_id=${TELEGRAM_GROUP_CHAT_ID}`);
    const result = await response.json();
    
    if (!result.ok) {
      console.error("[Telegram] Failed to get member count:", result.description);
      // Return cached value if available, otherwise null
      return cachedMemberCount?.count || null;
    }
    
    // Update cache
    cachedMemberCount = {
      count: result.result,
      timestamp: Date.now()
    };
    
    console.log(`[Telegram] Member count: ${result.result}`);
    return result.result;
  } catch (error) {
    console.error("[Telegram] Error getting member count:", error);
    // Return cached value if available
    return cachedMemberCount?.count || null;
  }
}

export function getWebhookSecretToken(): string {
  if (!TELEGRAM_BOT_TOKEN) return "";
  return crypto.createHash("sha256").update(TELEGRAM_BOT_TOKEN + "_webhook").digest("hex").slice(0, 32);
}

export function verifyWebhookRequest(secretTokenHeader: string | undefined): boolean {
  if (!TELEGRAM_BOT_TOKEN) return false;
  const expectedToken = getWebhookSecretToken();
  return secretTokenHeader === expectedToken;
}

export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[Telegram] Bot token not configured");
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error("[Telegram] Failed to send message:", result.description);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Telegram] Error sending message:", error);
    return false;
  }
}

export async function sendEventReminders(): Promise<void> {
  console.log("[Telegram] Checking for upcoming event reminders...");
  
  try {
    const events = await storage.getLiveEvents();
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    for (const event of events) {
      if (!event.isPublished) continue;
      
      const eventDate = new Date(event.scheduledAt);
      const rsvps = await storage.getEventRsvps(event.id);
      
      for (const rsvp of rsvps) {
        const parent = await storage.getParent(rsvp.parentId);
        if (!parent || !(parent as any).telegramOptin || !(parent as any).telegramChatId) continue;
        
        const rsvpData = rsvp as any;
        
        if (eventDate > now && eventDate <= oneHourFromNow && !rsvpData.reminder1hSentAt) {
          const reminderMessage = `🔔 <b>Xusustaan!</b>\n\n📺 "${event.title}" ayaa bilaabmaya 1 saac gudaheeda!\n\n📅 ${eventDate.toLocaleString("so-SO")}\n\n👉 Ka soo qeyb gal app-ka Barbaarintasan`;
          const sent = await sendTelegramMessage((parent as any).telegramChatId, reminderMessage);
          if (sent) {
            await storage.markRsvpReminderSent(rsvp.id, "1h");
            console.log(`[Telegram] Sent 1h reminder to parent ${parent.id} for event ${event.id}`);
          }
        } else if (eventDate > oneHourFromNow && eventDate <= oneDayFromNow && !rsvpData.reminder24hSentAt) {
          const isWithin25Hours = eventDate.getTime() - now.getTime() <= 25 * 60 * 60 * 1000;
          const isAfter23Hours = eventDate.getTime() - now.getTime() >= 23 * 60 * 60 * 1000;
          if (isWithin25Hours && isAfter23Hours) {
            const reminderMessage = `🔔 <b>Xusustaan Berri!</b>\n\n📺 "${event.title}" ayaa berri dhacaya!\n\n📅 ${eventDate.toLocaleString("so-SO")}\n\n👉 Fadlan is diyaari`;
            const sent = await sendTelegramMessage((parent as any).telegramChatId, reminderMessage);
            if (sent) {
              await storage.markRsvpReminderSent(rsvp.id, "24h");
              console.log(`[Telegram] Sent 24h reminder to parent ${parent.id} for event ${event.id}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[Telegram] Error sending reminders:", error);
  }
}

export async function handleTelegramWebhook(update: any): Promise<string | null> {
  if (!update.message) return null;
  
  const chatId = update.message.chat.id.toString();
  const text = update.message.text || "";
  
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    if (parts.length > 1) {
      const parentId = parts[1];
      try {
        const parent = await storage.getParent(parentId);
        if (parent) {
          await storage.updateParent(parentId, { 
            telegramOptin: true, 
            telegramChatId: chatId 
          });
          return `✅ Waad ku guuleysatay! Akoonkaaga Barbaarintasan waa la isku xiray.\n\n📱 Hadda waxaad heli doontaa xusuusin marka casharo Live ah ay dhow yihiin.\n\n🎓 Ku soo laabo app-ka!`;
        }
      } catch (error) {
        console.error("[Telegram] Error linking account:", error);
      }
    }
    return `👋 Soo dhawoow Barbaarintasan Bot!\n\nSi aad u hesho xusuusin casharo Live ah, fadlan ku xirnow akoontaada:\n\n1. Tag Profile page\n2. Riix "Ku xirnow Telegram"`;
  }
  
  if (text === "/help") {
    return `🤖 <b>Barbaarintasan Bot</b>\n\n📚 Bot-kan wuxuu ku soo diraa xusuusin marka casharo Live ah ay dhow yihiin.\n\n<b>Amarrada:</b>\n/start - Ku xirnow akoonkaaga\n/help - Caawin`;
  }
  
  return null;
}

export function getTelegramLinkUrl(parentId: string): string {
  if (!TELEGRAM_BOT_TOKEN) return "";
  const botUsername = "Barbaarintasan_Academy_Bot";
  return `https://t.me/${botUsername}?start=${parentId}`;
}

export async function sendTelegramSubscriptionReminder(
  chatId: string,
  customerName: string,
  courseName: string,
  daysRemaining: number,
  hoursRemaining?: number
): Promise<boolean> {
  let timeMessage: string;
  if (hoursRemaining !== undefined && hoursRemaining <= 25) {
    timeMessage = `${hoursRemaining} saacadood`;
  } else if (daysRemaining === 0) {
    timeMessage = "maanta";
  } else {
    timeMessage = `${daysRemaining} maalmood`;
  }

  const message = `⚠️ <b>Xasuusin Muhiim ah - Barbaarintasan Academy</b>

Salaan ${customerName}! 👋

Koorsadaada "<b>${courseName}</b>" waxay dhamaataysaa <b>${timeMessage}</b>.

📱 <b>Siyaabaha Lacag Bixinta:</b>
• EVC Plus: 0907790584
• Zaad: 0907790584
• E-Dahab: 0907790584

Si aad u sii waddato barashada, fadlan bixi lacagta bisha ee <b>$30</b>.

Kadib markii aad lacagta bixiso, nagala soo xiriir WhatsApp: 0907790584

Mahadsanid! 💙
Guruubka Barbaarintasan Academy`;

  return sendTelegramMessage(chatId, message);
}

export async function sendTelegramSubscriptionExpired(
  chatId: string,
  customerName: string,
  courseName: string
): Promise<boolean> {
  const message = `❌ <b>Wakhtigaagu wuu dhammaaday - Barbaarintasan Academy</b>

Salaan ${customerName}! 👋

Koorsadaada "<b>${courseName}</b>" way xirantahay sababtoo ah wakhtigaagii wuu dhammaaday.

📱 <b>Siyaabaha Lacag Bixinta:</b>
• EVC Plus: 0907790584
• Zaad: 0907790584
• E-Dahab: 0907790584

Si aad dib ugu furto koorsada, fadlan bixi lacagta bisha ee <b>$30</b>.

Kadib markii aad lacagta bixiso, nagala soo xiriir WhatsApp: 0907790584

Mahadsanid! 💙
Guruubka Barbaarintasan Academy`;

  return sendTelegramMessage(chatId, message);
}

// Appointment reminder - 1 hour before
export async function sendTelegramAudio(
  audioUrl: string,
  caption: string,
  chatId?: string
): Promise<{ messageId: number; fileId: string } | null> {
  const targetChatId = chatId || TELEGRAM_GROUP_CHAT_ID;
  if (!TELEGRAM_BOT_TOKEN || !targetChatId) {
    console.error("[Telegram] Bot token or chat ID not configured for audio send");
    return null;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/sendAudio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        audio: audioUrl,
        caption: caption,
        parse_mode: "HTML",
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error("[Telegram] Failed to send audio:", result.description);
      return null;
    }

    const messageId = result.result.message_id;
    const fileId = result.result.audio?.file_id || "";
    console.log(`[Telegram] Audio sent successfully, message_id: ${messageId}, file_id: ${fileId}`);
    return { messageId, fileId };
  } catch (error) {
    console.error("[Telegram] Error sending audio:", error);
    return null;
  }
}

export async function sendTelegramAppointmentReminder(
  chatId: string,
  parentName: string,
  teacherName: string,
  appointmentDate: string,
  appointmentTime: string,
  topic?: string,
  meetingLink?: string
): Promise<boolean> {
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  };

  let message = `🔔 <b>Xasuusin Ballan - Barbaarintasan Academy</b>

Salaan ${parentName}! 👋

Ballantaada waxay bilaabmaysaa <b>1 saac</b> kadib!

📅 <b>Taariikhda:</b> ${formatDate(appointmentDate)}
⏰ <b>Waqtiga:</b> ${appointmentTime}
👨‍🏫 <b>Macalinka:</b> ${teacherName}`;

  if (topic) {
    message += `\n📋 <b>Mawduuca:</b> ${topic}`;
  }

  if (meetingLink) {
    message += `\n\n🔗 <b>Ku biir kulanka:</b> ${meetingLink}`;
  }

  message += `

Fadlan diyaar u noqo kulanka! ✅

Mahadsanid! 💙
Guruubka Barbaarintasan Academy`;

  return sendTelegramMessage(chatId, message);
}
