#!/usr/bin/env node
/*
  Pre-generate Arabic alphabet MP3 files using Azure TTS.

  Usage:
    AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=... node scripts/generateAlphabetAudio.js
    node scripts/generateAlphabetAudio.js --force

  Output:
    public/tts/alphabet/*.mp3
*/

import fs from "node:fs";
import path from "node:path";

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
const VOICE = process.env.AZURE_SPEECH_VOICE || "ar-SA-HamedNeural";
const FORCE = process.argv.includes("--force");

if (!KEY || !REGION) {
  console.error("Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION");
  process.exit(1);
}

const letters = [
  { slug: "alif", char: "ا", nameAr: "ألف" },
  { slug: "ba", char: "ب", nameAr: "باء" },
  { slug: "ta", char: "ت", nameAr: "تاء" },
  { slug: "tha", char: "ث", nameAr: "ثاء" },
  { slug: "jeem", char: "ج", nameAr: "جيم" },
  { slug: "ha", char: "ح", nameAr: "حاء" },
  { slug: "kha", char: "خ", nameAr: "خاء" },
  { slug: "dal", char: "د", nameAr: "دال" },
  { slug: "dhal", char: "ذ", nameAr: "ذال" },
  { slug: "ra", char: "ر", nameAr: "راء" },
  { slug: "zay", char: "ز", nameAr: "زاي" },
  { slug: "seen", char: "س", nameAr: "سين" },
  { slug: "sheen", char: "ش", nameAr: "شين" },
  { slug: "sad", char: "ص", nameAr: "صاد" },
  { slug: "dad", char: "ض", nameAr: "ضاد" },
  { slug: "taa", char: "ط", nameAr: "طاء" },
  { slug: "zaa", char: "ظ", nameAr: "ظاء" },
  { slug: "ain", char: "ع", nameAr: "عين" },
  { slug: "ghain", char: "غ", nameAr: "غين" },
  { slug: "fa", char: "ف", nameAr: "فاء" },
  { slug: "qaf", char: "ق", nameAr: "قاف" },
  { slug: "kaf", char: "ك", nameAr: "كاف" },
  { slug: "lam", char: "ل", nameAr: "لام" },
  { slug: "meem", char: "م", nameAr: "ميم" },
  { slug: "noon", char: "ن", nameAr: "نون" },
  { slug: "ha2", char: "ه", nameAr: "هاء" },
  { slug: "waw", char: "و", nameAr: "واو" },
  { slug: "ya", char: "ي", nameAr: "ياء" },
];

const harakat = [
  { suffix: "fatha", mark: "َ", labelAr: "الفتحة" },
  { suffix: "kasra", mark: "ِ", labelAr: "الكسرة" },
  { suffix: "damma", mark: "ُ", labelAr: "الضمة" },
];

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(text) {
  return `<speak version='1.0' xml:lang='ar-SA' xmlns='http://www.w3.org/2001/10/synthesis'>
  <voice name='${VOICE}'>
    <prosody rate='-8.00%' pitch='+0Hz'>${escapeXml(text)}</prosody>
  </voice>
</speak>`;
}

async function synthesizeToFile(ssml, outputPath) {
  const endpoint = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      "User-Agent": "Barbaarintasan-Alphabet-Audio-Generator",
    },
    body: ssml,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Azure TTS ${res.status}: ${errText}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(outputPath, audioBuffer);
}

function buildEntries() {
  const entries = [];

  for (const letter of letters) {
    entries.push({
      file: `${letter.slug}.mp3`,
      text: `${letter.nameAr}`,
      type: "base",
    });

    for (const h of harakat) {
      entries.push({
        file: `${letter.slug}_${h.suffix}.mp3`,
        text: `${letter.char}${h.mark}`,
        type: h.suffix,
      });
    }
  }

  return entries;
}

async function main() {
  const outputDir = path.join(process.cwd(), "public", "tts", "alphabet");
  await fs.promises.mkdir(outputDir, { recursive: true });

  const entries = buildEntries();
  console.log(`Generating ${entries.length} alphabet audio files into ${outputDir}`);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const outPath = path.join(outputDir, entry.file);

    if (!FORCE && fs.existsSync(outPath)) {
      skipped += 1;
      continue;
    }

    const ssml = buildSsml(entry.text);
    process.stdout.write(`[${i + 1}/${entries.length}] ${entry.file} ... `);

    try {
      await synthesizeToFile(ssml, outPath);
      created += 1;
      process.stdout.write("ok\n");
    } catch (err) {
      process.stdout.write("failed\n");
      throw err;
    }
  }

  const manifestPath = path.join(outputDir, "manifest.json");
  const manifest = {
    generatedAt: new Date().toISOString(),
    voice: VOICE,
    total: entries.length,
    created,
    skipped,
    files: entries.map((e) => e.file),
  };
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Done. created=${created}, skipped=${skipped}`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
