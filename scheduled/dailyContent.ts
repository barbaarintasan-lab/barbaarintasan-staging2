/**
 * Scheduled Deployment Script - Daily Content Generation
 * 
 * This script generates Dhambaalka Waalidka (Parent Blog) and 
 * Maaweelada Caruurta (Bedtime Stories) content daily.
 * 
 * Schedule: 5:00 AM UTC = 8:00 AM East Africa Time
 * Cron: 0 5 * * *
 * Timezone: Africa/Nairobi
 * 
 * Run command: npx tsx scheduled/dailyContent.ts
 * 
 * Features:
 * - Telegram notification on success/failure
 * - 3 retry attempts for each content type
 * - Detailed logging
 */

import { generateDailyBedtimeStory } from "../server/bedtimeStories";
import { generateAndSaveParentMessage } from "../server/parentMessages";
import { fileURLToPath } from "url";
import { resolve } from "path";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const TELEGRAM_GROUP_CHAT_ID_2 = process.env.TELEGRAM_GROUP_CHAT_ID_2;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000; // 10 seconds between retries

async function sendToTelegramGroup(chatId: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
      console.error(`[Telegram] Failed to send to ${chatId}:`, result.description);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[Telegram] Error sending to ${chatId}:`, error);
    return false;
  }
}

async function sendTelegramNotification(message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("[Telegram] Bot token not configured - skipping notification");
    return false;
  }

  const groupIds = [TELEGRAM_GROUP_CHAT_ID, TELEGRAM_GROUP_CHAT_ID_2].filter(Boolean) as string[];
  
  if (groupIds.length === 0) {
    console.log("[Telegram] No group chat IDs configured - skipping notification");
    return false;
  }

  let successCount = 0;
  for (const chatId of groupIds) {
    const success = await sendToTelegramGroup(chatId, message);
    if (success) {
      successCount++;
      console.log(`[Telegram] Notification sent to group ${chatId}`);
    }
  }
  
  console.log(`[Telegram] Sent to ${successCount}/${groupIds.length} groups`);
  return successCount > 0;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry(
  name: string, 
  generateFn: () => Promise<any>
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Scheduled] ${name} - Attempt ${attempt}/${MAX_RETRIES}...`);
      await generateFn();
      console.log(`[Scheduled] ✅ ${name} - SUCCESS on attempt ${attempt}`);
      return true;
    } catch (error) {
      console.error(`[Scheduled] ❌ ${name} - FAILED on attempt ${attempt}`);
      console.error(`[Scheduled] Error:`, error);
      
      if (attempt < MAX_RETRIES) {
        console.log(`[Scheduled] Waiting ${RETRY_DELAY_MS/1000}s before retry...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  return false;
}

async function generateDailyContent() {
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];
  const eatTime = new Date().toLocaleString('en-US', { 
    timeZone: 'Africa/Nairobi',
    dateStyle: 'full',
    timeStyle: 'short'
  });
  
  console.log("========================================");
  console.log(`[Scheduled] Daily Content Generation`);
  console.log(`[Scheduled] Date: ${today}`);
  console.log(`[Scheduled] EAT Time: ${eatTime}`);
  console.log(`[Scheduled] Started at: ${new Date().toISOString()}`);
  console.log("========================================");

  // Generate Dhambaalka Waalidka (Parent Blog Post) with retry
  console.log("\n[Scheduled] === Dhambaalka Waalidka ===");
  const dhambaalSuccess = await generateWithRetry(
    "Dhambaalka Waalidka",
    generateAndSaveParentMessage
  );

  // Generate Maaweelada Caruurta (Bedtime Story) with retry
  console.log("\n[Scheduled] === Maaweelada Caruurta ===");
  const maaweeladeSuccess = await generateWithRetry(
    "Maaweelada Caruurta",
    generateDailyBedtimeStory
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const allSuccess = dhambaalSuccess && maaweeladeSuccess;
  
  console.log("\n========================================");
  console.log(`[Scheduled] Summary for ${today}:`);
  console.log(`[Scheduled] Dhambaal: ${dhambaalSuccess ? "✅" : "❌"}`);
  console.log(`[Scheduled] Maaweelada: ${maaweeladeSuccess ? "✅" : "❌"}`);
  console.log(`[Scheduled] Duration: ${duration}s`);
  console.log(`[Scheduled] Finished at: ${new Date().toISOString()}`);
  console.log("========================================");

  // Send Telegram notification with content summary
  if (allSuccess) {
    await sendTelegramNotification(`
<b>✅ BSA Dhambaalka & Sheekada - Cusub!</b>

📅 <b>Taariikhda:</b> ${today}
⏰ <b>Waqtiga:</b> ${eatTime}

📝 <b>Dhambaalka Waalidka:</b> ${dhambaalSuccess ? "✅ Waa la sameeyay (+ cod)" : "❌ Guuldareystay"}
📖 <b>Sheekada Caruurta:</b> ${maaweeladeSuccess ? "✅ Waa la sameeyay (+ cod)" : "❌ Guuldareystay"}

⏱ <b>Waqtiga qaatay:</b> ${duration}s

<i>App-ka ka eeg: appbarbaarintasan.com</i>
`.trim());
  } else {
    await sendTelegramNotification(`
<b>⚠️ BSA Content - Qaar baa guuldareystay</b>

📅 <b>Taariikhda:</b> ${today}
📝 Dhambaal: ${dhambaalSuccess ? "✅" : "❌"}
📖 Sheeko: ${maaweeladeSuccess ? "✅" : "❌"}
⏱ Waqtiga: ${duration}s

<i>Fadlan eeg logs-ka.</i>
`.trim());
  }

  // Return result - let caller decide what to do with failures
  // Note: process.exit() should only be called from main module, not from API endpoint
  if (!allSuccess) {
    console.log("\n[Scheduled] Some content failed - returning partial result");
  } else {
    console.log("\n[Scheduled] All content generated successfully");
  }
  
  return { success: allSuccess, dhambaal: dhambaalSuccess, maaweelada: maaweeladeSuccess };
}

// Export for API endpoint trigger
export { generateDailyContent };

// Check if running as standalone script (ESM compatible)
const isMainModule = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  generateDailyContent()
    .then((result) => {
      if (!result.success || !result.dhambaal || !result.maaweelada) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("[Scheduled] Fatal error:", error);
      
      // Try to send failure notification
      const today = new Date().toISOString().split('T')[0];
      await sendTelegramNotification(`
<b>🚨 BSA Daily Content - FATAL ERROR</b>

📅 <b>Date:</b> ${today}
❌ <b>Error:</b> ${error.message || 'Unknown error'}

<i>Script-ka wuu guuldareystay. Fadlan eeg logs-ka.</i>
`.trim());
      
      process.exit(1);
    });
}
