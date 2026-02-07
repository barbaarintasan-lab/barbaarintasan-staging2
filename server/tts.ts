// Azure Speech Services Text-to-Speech integration
// Uses Ubax (female) voice for bedtime stories, Muuse (male) voice for parent messages
// Fallback to Camb AI if Azure is not configured

import { uploadToGoogleDrive, getOrCreateFolder } from "./googleDrive";
import { uploadToR2, isR2Configured, R2BucketType } from "./r2Storage";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Azure Speech configuration
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

// Somali voices
const AZURE_VOICE_MUUSE = "so-SO-MuuseNeural"; // Male voice - for parent messages
const AZURE_VOICE_UBAX = "so-SO-UbaxNeural";   // Female voice - for bedtime stories

// Camb AI fallback configuration
const CAMB_AI_API_KEY = process.env.CAMB_AI_API_KEY;
const CAMB_AI_BASE_URL = "https://client.camb.ai/apis";
const DEFAULT_VOICE_ID = 144300;
const SOMALI_LANGUAGE_ID = 118;

const MAX_CHARS_PER_REQUEST = 4000; // Azure allows up to 10,000 chars, use 4000 for safety
const CAMB_MAX_CHARS = 450; // Camb AI free plan limit

interface TTSOptions {
  voiceId?: number;
  gender?: number;
  age?: number;
  azureVoice?: string; // Azure voice name (e.g., AZURE_VOICE_MUUSE or AZURE_VOICE_UBAX)
}

interface TTSTaskResponse {
  task_id: string;
}

interface TTSStatusResponse {
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
  run_id?: number;
  exception_reason?: string | null;
  message?: string | null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Split text into chunks at sentence boundaries
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      const words = sentence.split(/\s+/);
      for (const word of words) {
        if ((currentChunk + " " + word).length > maxLength) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = word;
        } else {
          currentChunk = currentChunk ? currentChunk + " " + word : word;
        }
      }
    } else if ((currentChunk + " " + sentence).length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 0);
}

// Escape text for SSML
function escapeForSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Azure TTS synthesis
async function synthesizeWithAzure(text: string, voiceName: string = AZURE_VOICE_MUUSE): Promise<Buffer> {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    throw new Error("Azure Speech credentials not configured");
  }

  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='so-SO'>
    <voice name='${voiceName}'>
      <prosody rate='0.95' volume='+30%'>
        ${escapeForSsml(text)}
      </prosody>
    </voice>
  </speak>`;

  const endpoint = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
      "User-Agent": "BarbaarintasanAcademy",
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[TTS] Azure error:", response.status, errorText);
    throw new Error(`Azure TTS error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Camb AI synthesis (fallback)
async function synthesizeChunkWithCamb(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const {
    voiceId = DEFAULT_VOICE_ID,
    gender = 1,
    age = 35,
  } = options;

  if (!CAMB_AI_API_KEY) {
    throw new Error("CAMB_AI_API_KEY is not configured");
  }

  const createResponse = await fetch(`${CAMB_AI_BASE_URL}/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CAMB_AI_API_KEY,
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      language: SOMALI_LANGUAGE_ID,
      gender,
      age,
      project_name: "Barbaarintasan Academy",
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error("[TTS] Camb AI create task error:", errorText);
    throw new Error(`Camb AI API error: ${createResponse.status} - ${errorText}`);
  }

  const taskData: TTSTaskResponse = await createResponse.json();
  const taskId = taskData.task_id;

  let runId: number | undefined;
  const maxAttempts = 30;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(2000);

    const statusResponse = await fetch(`${CAMB_AI_BASE_URL}/tts/${taskId}`, {
      headers: {
        "x-api-key": CAMB_AI_API_KEY,
      },
    });

    if (!statusResponse.ok) {
      console.error("[TTS] Status check failed:", statusResponse.status);
      continue;
    }

    const statusData: TTSStatusResponse = await statusResponse.json();

    if (statusData.status === "SUCCESS" && statusData.run_id) {
      runId = statusData.run_id;
      break;
    } else if (statusData.status === "FAILED") {
      throw new Error(`TTS task failed: ${statusData.exception_reason || statusData.message || "Unknown error"}`);
    }
  }

  if (!runId) {
    throw new Error("TTS task timed out after 60 seconds");
  }

  const audioResponse = await fetch(`${CAMB_AI_BASE_URL}/tts-result/${runId}`, {
    headers: {
      "x-api-key": CAMB_AI_API_KEY,
    },
  });

  if (!audioResponse.ok) {
    const errorText = await audioResponse.text();
    throw new Error(`Failed to download audio: ${audioResponse.status} - ${errorText}`);
  }

  const arrayBuffer = await audioResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Concatenate audio files with ffmpeg
async function concatenateAudioFiles(audioBuffers: Buffer[], format: string = "mp3"): Promise<Buffer> {
  if (audioBuffers.length === 0) {
    throw new Error("No audio buffers to concatenate");
  }
  if (audioBuffers.length === 1) {
    return audioBuffers[0];
  }

  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const inputFiles: string[] = [];
  const listFile = path.join(tmpDir, `tts-list-${timestamp}.txt`);
  const outputPath = path.join(tmpDir, `tts-combined-${timestamp}.mp3`);
  
  try {
    for (let i = 0; i < audioBuffers.length; i++) {
      const inputPath = path.join(tmpDir, `tts-chunk-${timestamp}-${i}.${format}`);
      fs.writeFileSync(inputPath, audioBuffers[i]);
      inputFiles.push(inputPath);
    }
    
    const listContent = inputFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(listFile, listContent);
    
    console.log(`[TTS] Concatenating ${audioBuffers.length} audio chunks with ffmpeg...`);
    await execAsync(`ffmpeg -f concat -safe 0 -i "${listFile}" -codec:a libmp3lame -qscale:a 2 "${outputPath}" -y`);
    
    const combinedBuffer = fs.readFileSync(outputPath);
    console.log(`[TTS] Combined audio: ${combinedBuffer.length} bytes (MP3)`);
    
    return combinedBuffer;
  } finally {
    for (const f of inputFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
    try { fs.unlinkSync(listFile); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}

// Main synthesis function - tries Azure first, falls back to Camb AI
export async function synthesizeSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const useAzure = AZURE_SPEECH_KEY && AZURE_SPEECH_REGION;
  const voiceName = options.azureVoice || AZURE_VOICE_MUUSE;
  const voiceLabel = voiceName === AZURE_VOICE_UBAX ? "Ubax" : "Muuse";
  
  if (useAzure) {
    console.log(`[TTS] Using Azure Speech (${voiceLabel} voice) for ${text.length} characters`);
    
    // Azure allows larger chunks
    const chunks = splitTextIntoChunks(text, MAX_CHARS_PER_REQUEST);
    console.log(`[TTS] Split into ${chunks.length} chunks`);
    
    const audioBuffers: Buffer[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[TTS] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
      const buffer = await synthesizeWithAzure(chunks[i], voiceName);
      audioBuffers.push(buffer);
      
      if (i < chunks.length - 1) {
        await sleep(100); // Small delay between Azure requests
      }
    }
    
    if (audioBuffers.length === 1) {
      console.log(`[TTS] Generated ${audioBuffers[0].length} bytes of MP3 audio (Azure - ${voiceLabel})`);
      return audioBuffers[0];
    }
    
    const combinedBuffer = await concatenateAudioFiles(audioBuffers, "mp3");
    console.log(`[TTS] Generated ${combinedBuffer.length} bytes of MP3 audio (Azure - ${voiceLabel})`);
    return combinedBuffer;
  }
  
  // Fallback to Camb AI
  console.log(`[TTS] Using Camb AI fallback for ${text.length} characters`);
  const chunks = splitTextIntoChunks(text, CAMB_MAX_CHARS);
  console.log(`[TTS] Synthesizing ${text.length} characters in ${chunks.length} chunks with Camb AI TTS (Somali)`);

  const audioBuffers: Buffer[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[TTS] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    const buffer = await synthesizeChunkWithCamb(chunks[i], options);
    audioBuffers.push(buffer);
    
    if (i < chunks.length - 1) {
      await sleep(500);
    }
  }

  const combinedBuffer = await concatenateAudioFiles(audioBuffers, "flac");
  console.log(`[TTS] Generated ${combinedBuffer.length} bytes of MP3 audio (Camb AI)`);
  
  return combinedBuffer;
}

export async function generateAndUploadAudio(
  text: string,
  fileName: string,
  folderName: string = "tts-audio",
  options: TTSOptions = {},
  bucketType: R2BucketType = 'dhambaal'
): Promise<string> {
  const audioBuffer = await synthesizeSpeech(text, options);

  // Try R2 first (works on Fly.io), then fall back to Google Drive (Replit only)
  if (isR2Configured()) {
    try {
      console.log(`[TTS] Using R2 storage (${bucketType} bucket) for audio upload...`);
      const result = await uploadToR2(
        audioBuffer,
        `${fileName}.mp3`,
        "audio/mpeg",
        "Audio",
        bucketType
      );
      console.log(`[TTS] Uploaded MP3 audio to R2: ${result.url}`);
      return result.url;
    } catch (r2Error) {
      console.warn("[TTS] R2 upload failed, trying Google Drive:", r2Error);
    }
  }

  // Fall back to Google Drive (Replit only)
  try {
    const folderId = await getOrCreateFolder(folderName);
    const result = await uploadToGoogleDrive(
      audioBuffer,
      `${fileName}.mp3`,
      "audio/mpeg",
      folderId
    );
    console.log(`[TTS] Uploaded MP3 audio to Drive: ${result.fileId}`);
    return `https://drive.google.com/uc?export=download&id=${result.fileId}`;
  } catch (driveError) {
    console.error("[TTS] Google Drive upload failed:", driveError);
    // Last resort: return base64 data URL
    console.log("[TTS] Falling back to base64 data URL");
    const base64Audio = audioBuffer.toString("base64");
    return `data:audio/mpeg;base64,${base64Audio}`;
  }
}

export async function generateBedtimeStoryAudio(
  storyContent: string,
  moralLesson: string | null,
  storyId: string
): Promise<string> {
  let fullText = storyContent;
  if (moralLesson) {
    fullText += `\n\nCasharka Muhiimka ah: ${moralLesson}`;
  }
  
  const timestamp = Date.now();
  return generateAndUploadAudio(fullText, `sheeko-${storyId}-${timestamp}`, "tts-audio/sheekooyin", { azureVoice: AZURE_VOICE_UBAX }, 'sheeko');
}

export async function generateParentMessageAudio(
  messageContent: string,
  messageId: string
): Promise<string> {
  const timestamp = Date.now();
  return generateAndUploadAudio(messageContent, `dhambaal-${messageId}-${timestamp}`, "tts-audio/dhambaalka", { azureVoice: AZURE_VOICE_MUUSE }, 'dhambaal');
}

// Generate audio and return as base64 data URL (works on Fly.io without Google Drive)
export async function generateAudioAsBase64(
  text: string,
  options: TTSOptions = {}
): Promise<string> {
  try {
    console.log("[TTS] Generating audio as base64 data URL...");
    const audioBuffer = await synthesizeSpeech(text, options);
    const base64Audio = audioBuffer.toString("base64");
    const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;
    console.log(`[TTS] Generated base64 audio (${Math.round(base64Audio.length / 1024)} KB)`);
    return dataUrl;
  } catch (error) {
    console.error("[TTS] Error generating audio:", error);
    throw error;
  }
}

export async function generateBedtimeStoryAudioBase64(
  storyContent: string,
  moralLesson: string | null
): Promise<string> {
  let fullText = storyContent;
  if (moralLesson) {
    fullText += `\n\nCasharka Muhiimka ah: ${moralLesson}`;
  }
  // Use Ubax (female voice) for bedtime stories
  return generateAudioAsBase64(fullText, { azureVoice: AZURE_VOICE_UBAX });
}

export async function generateParentMessageAudioBase64(
  messageContent: string
): Promise<string> {
  // Use Muuse (male voice) for parent messages
  return generateAudioAsBase64(messageContent, { azureVoice: AZURE_VOICE_MUUSE });
}
