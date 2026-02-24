// Google Drive integration for voice recordings
// Uses Replit's Google Drive connector

import { google } from 'googleapis';
import { Readable } from 'stream';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

// Get fresh Google Drive client (never cache - tokens expire)
export async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Upload audio file to Google Drive
export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'audio/webm',
  folderId?: string
): Promise<{ fileId: string; webViewLink: string; webContentLink: string }> {
  const drive = await getGoogleDriveClient();

  const fileMetadata: any = {
    name: fileName,
  };

  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
  });

  // Make file accessible via link
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink || '',
    webContentLink: response.data.webContentLink || '',
  };
}

// Get file download URL
export async function getFileDownloadUrl(fileId: string): Promise<string> {
  const drive = await getGoogleDriveClient();
  
  const response = await drive.files.get({
    fileId,
    fields: 'webContentLink',
  });

  return response.data.webContentLink || '';
}

// Download file content from Google Drive using API
export async function downloadFromGoogleDrive(fileId: string): Promise<Buffer> {
  const drive = await getGoogleDriveClient();
  
  const response = await drive.files.get({
    fileId,
    alt: 'media',
  }, {
    responseType: 'arraybuffer',
  });

  return Buffer.from(response.data as ArrayBuffer);
}

// Delete file from Google Drive
export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  const drive = await getGoogleDriveClient();
  await drive.files.delete({ fileId });
}

// Rename file in Google Drive
export async function renameDriveFile(fileId: string, newName: string): Promise<{ name: string }> {
  const drive = await getGoogleDriveClient();
  const response = await drive.files.update({
    fileId,
    requestBody: { name: newName },
    fields: 'name',
  });
  console.log(`[GDRIVE] Renamed file ${fileId} to: ${newName}`);
  return { name: response.data.name || newName };
}

// Sheeko Recordings folder name
const SHEEKO_FOLDER_NAME = "Barbaarintasan Sheeko Recordings";

// Get or create Sheeko recordings folder
let sheekoFolderId: string | null = null;

export async function getOrCreateSheekoFolder(): Promise<string> {
  if (sheekoFolderId) {
    return sheekoFolderId;
  }

  const drive = await getGoogleDriveClient();
  
  // Check if folder already exists
  const searchResponse = await drive.files.list({
    q: `name='${SHEEKO_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    sheekoFolderId = searchResponse.data.files[0].id!;
    console.log(`[GDRIVE] Found existing Sheeko folder: ${sheekoFolderId}`);
    return sheekoFolderId;
  }

  // Create new folder
  const folderResponse = await drive.files.create({
    requestBody: {
      name: SHEEKO_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  sheekoFolderId = folderResponse.data.id!;
  console.log(`[GDRIVE] Created new Sheeko folder: ${sheekoFolderId}`);
  return sheekoFolderId;
}

// Generic folder cache
const folderCache: Map<string, string> = new Map();

// Get or create a folder by name (supports nested paths like "tts-audio/sheekooyin")
export async function getOrCreateFolder(folderPath: string): Promise<string> {
  // Check cache first
  if (folderCache.has(folderPath)) {
    return folderCache.get(folderPath)!;
  }

  const drive = await getGoogleDriveClient();
  const pathParts = folderPath.split('/').filter(p => p.length > 0);
  
  let parentId: string | undefined = undefined;
  let currentPath = '';
  
  for (const folderName of pathParts) {
    currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    
    // Check if this segment is cached
    if (folderCache.has(currentPath)) {
      parentId = folderCache.get(currentPath);
      continue;
    }
    
    // Build query to find folder
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }
    
    const searchResponse = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      pageSize: 1,
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      parentId = searchResponse.data.files[0].id!;
      folderCache.set(currentPath, parentId);
      console.log(`[GDRIVE] Found existing folder: ${currentPath} (${parentId})`);
    } else {
      // Create folder
      const createRequest: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) {
        createRequest.parents = [parentId];
      }
      
      const folderResponse = await drive.files.create({
        requestBody: createRequest,
        fields: 'id',
      });

      parentId = folderResponse.data.id!;
      folderCache.set(currentPath, parentId);
      console.log(`[GDRIVE] Created folder: ${currentPath} (${parentId})`);
    }
  }

  if (!parentId) {
    throw new Error(`Failed to get or create folder: ${folderPath}`);
  }

  return parentId;
}

// Content backup folder names
const DHAMBAAL_FOLDER = "Barbaarintasan/Dhambaalka Waalidka";
const MAAWEELADA_FOLDER = "Barbaarintasan/Maaweelada Caruurta";
const AUDIO_FOLDER = "Barbaarintasan/Audio";

// Upload audio to Google Drive and return public URL
export async function uploadAudioToGoogleDrive(
  audioBuffer: Buffer,
  fileName: string,
  type: 'dhambaal' | 'sheeko'
): Promise<string | null> {
  try {
    const subFolder = type === 'dhambaal' ? 'Dhambaalka' : 'Maaweelada';
    const folderId = await getOrCreateFolder(`${AUDIO_FOLDER}/${subFolder}`);
    
    const result = await uploadToGoogleDrive(
      audioBuffer,
      fileName,
      'audio/mpeg',
      folderId
    );
    
    // Return direct download URL
    const directUrl = `https://drive.google.com/uc?export=download&id=${result.fileId}`;
    console.log(`[GDRIVE] Uploaded audio: ${fileName} -> ${directUrl}`);
    return directUrl;
  } catch (error) {
    console.error('[GDRIVE] Failed to upload audio:', error);
    return null;
  }
}

// Image folder
const IMAGES_FOLDER = "Barbaarintasan/Images";

// Upload image to Google Drive and return public URL
export async function uploadImageToGoogleDrive(
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string,
  type: 'dhambaal' | 'sheeko'
): Promise<string | null> {
  try {
    const subFolder = type === 'dhambaal' ? 'Dhambaalka' : 'Maaweelada';
    const folderId = await getOrCreateFolder(`${IMAGES_FOLDER}/${subFolder}`);
    
    const result = await uploadToGoogleDrive(
      imageBuffer,
      fileName,
      mimeType,
      folderId
    );
    
    // Return direct view URL using lh3.googleusercontent.com format (works better for embedding)
    const directUrl = `https://lh3.googleusercontent.com/d/${result.fileId}`;
    console.log(`[GDRIVE] Uploaded image: ${fileName} -> ${directUrl}`);
    return directUrl;
  } catch (error) {
    console.error('[GDRIVE] Failed to upload image:', error);
    return null;
  }
}

// Save parent message (dhambaal) to Google Drive
export async function saveDhambaalToGoogleDrive(
  title: string,
  content: string,
  date: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  try {
    const folderId = await getOrCreateFolder(DHAMBAAL_FOLDER);
    const fileName = `${date} - ${title.replace(/[/\\?%*:|"<>]/g, '-')}.txt`;
    const fileContent = `${title}\n${'='.repeat(title.length)}\n\nTaariikhda: ${date}\n\n${content}`;
    
    const result = await uploadToGoogleDrive(
      Buffer.from(fileContent, 'utf-8'),
      fileName,
      'text/plain',
      folderId
    );
    
    console.log(`[GDRIVE] Saved dhambaal to Google Drive: ${fileName}`);
    return { fileId: result.fileId, webViewLink: result.webViewLink };
  } catch (error) {
    console.error('[GDRIVE] Failed to save dhambaal:', error);
    return null;
  }
}

// Save bedtime story (maaweelada) to Google Drive
export async function saveMaaweelToGoogleDrive(
  title: string,
  content: string,
  characterName: string,
  moralLesson: string,
  date: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  try {
    const folderId = await getOrCreateFolder(MAAWEELADA_FOLDER);
    const fileName = `${date} - ${title.replace(/[/\\?%*:|"<>]/g, '-')}.txt`;
    const fileContent = `${title}\n${'='.repeat(title.length)}\n\nTaariikhda: ${date}\nQofka: ${characterName}\n\n${content}\n\n---\nCasharka: ${moralLesson}`;
    
    const result = await uploadToGoogleDrive(
      Buffer.from(fileContent, 'utf-8'),
      fileName,
      'text/plain',
      folderId
    );
    
    console.log(`[GDRIVE] Saved maaweelada to Google Drive: ${fileName}`);
    return { fileId: result.fileId, webViewLink: result.webViewLink };
  } catch (error) {
    console.error('[GDRIVE] Failed to save maaweelada:', error);
    return null;
  }
}

// List files in folder
export async function listDriveFiles(folderId?: string): Promise<any[]> {
  const drive = await getGoogleDriveClient();
  
  let query = "mimeType='audio/webm' or mimeType='audio/mp3' or mimeType='audio/mpeg'";
  if (folderId) {
    query = `'${folderId}' in parents and (${query})`;
  }

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, size, createdTime, webViewLink, webContentLink)',
    orderBy: 'createdTime desc',
    pageSize: 50,
  });

  return response.data.files || [];
}

// List all content files (text files) in a folder
export async function listContentFiles(folderPath: string): Promise<{ id: string; name: string; createdTime: string }[]> {
  try {
    const drive = await getGoogleDriveClient();
    const folderId = await getOrCreateFolder(folderPath);
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType='text/plain' or mimeType='application/json') and trashed=false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'name asc',
      pageSize: 100,
    });
    
    return (response.data.files || []).map(f => ({
      id: f.id!,
      name: f.name!,
      createdTime: f.createdTime!
    }));
  } catch (error) {
    console.error(`[GDRIVE] Failed to list content files in ${folderPath}:`, error);
    return [];
  }
}

// Get file content by ID
export async function getFileContent(fileId: string): Promise<string | null> {
  try {
    const drive = await getGoogleDriveClient();
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    );
    return response.data as string;
  } catch (error) {
    console.error(`[GDRIVE] Failed to get file content ${fileId}:`, error);
    return null;
  }
}

// List all dhambaal files from Google Drive
export async function listDhambaalFiles(): Promise<{ id: string; name: string; createdTime: string }[]> {
  return listContentFiles(DHAMBAAL_FOLDER);
}

// List all maaweelada files from Google Drive
export async function listMaaweelFiles(): Promise<{ id: string; name: string; createdTime: string }[]> {
  return listContentFiles(MAAWEELADA_FOLDER);
}

// Parse dhambaal file content
export function parseDhambaalContent(content: string, fileName: string): {
  title: string;
  body: string;
  date: string;
} | null {
  try {
    const lines = content.split('\n');
    const title = lines[0]?.trim() || '';
    
    // Extract date from filename (format: "2026-01-23 - Title.txt")
    const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
    
    // Find content after "Taariikhda:" line
    let body = '';
    let foundDateLine = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Taariikhda:')) {
        foundDateLine = true;
        continue;
      }
      if (foundDateLine && lines[i].trim()) {
        body = lines.slice(i).join('\n').trim();
        break;
      }
    }
    
    if (!body) {
      // Fallback: skip first 3 lines (title, separator, empty)
      body = lines.slice(4).join('\n').trim();
    }
    
    return { title, body, date };
  } catch (error) {
    console.error('[GDRIVE] Failed to parse dhambaal content:', error);
    return null;
  }
}

// Parse maaweelada file content
export function parseMaaweelContent(content: string, fileName: string): {
  title: string;
  body: string;
  characterName: string;
  moralLesson: string;
  date: string;
} | null {
  try {
    const lines = content.split('\n');
    const title = lines[0]?.trim() || '';
    
    // Extract date from filename
    const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
    
    // Extract character name
    let characterName = '';
    let moralLesson = '';
    let bodyStartIndex = 4;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('Qofka:')) {
        characterName = lines[i].replace('Qofka:', '').trim();
      }
      if (lines[i].startsWith('Casharka:')) {
        moralLesson = lines[i].replace('Casharka:', '').trim();
      }
    }
    
    // Extract body (between character line and moral lesson)
    let body = '';
    let inBody = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('Qofka:')) {
        inBody = true;
        continue;
      }
      if (lines[i].includes('---') || lines[i].startsWith('Casharka:')) {
        break;
      }
      if (inBody && lines[i].trim()) {
        body += lines[i] + '\n';
      }
    }
    body = body.trim();
    
    if (!body) {
      // Fallback
      body = lines.slice(4).join('\n').split('---')[0].trim();
    }
    
    return { title, body, characterName, moralLesson, date };
  } catch (error) {
    console.error('[GDRIVE] Failed to parse maaweelada content:', error);
    return null;
  }
}

// Search for stories by character name in Google Drive backups
export async function searchMaaweelByCharacter(characterName: string): Promise<{
  id: string;
  name: string;
  createdTime: string;
  title: string;
  titleSomali: string;
  content: string;
  characterName: string;
  moralLesson: string;
  date: string;
}[]> {
  try {
    const files = await listMaaweelFiles();
    const results: {
      id: string;
      name: string;
      createdTime: string;
      title: string;
      titleSomali: string;
      content: string;
      characterName: string;
      moralLesson: string;
      date: string;
    }[] = [];
    
    for (const file of files) {
      const content = await getFileContent(file.id);
      if (!content) continue;
      
      const parsed = parseMaaweelContent(content, file.name);
      if (!parsed) continue;
      
      // Check if this story matches the character name
      if (parsed.characterName.toLowerCase().includes(characterName.toLowerCase())) {
        results.push({
          id: file.id,
          name: file.name,
          createdTime: file.createdTime,
          title: parsed.title, // The backup saves titleSomali as title
          titleSomali: parsed.title, // The backup saves titleSomali as title
          content: parsed.body,
          characterName: parsed.characterName,
          moralLesson: parsed.moralLesson,
          date: parsed.date,
        });
      }
    }
    
    console.log(`[GDRIVE] Found ${results.length} stories for character: ${characterName}`);
    return results;
  } catch (error) {
    console.error(`[GDRIVE] Failed to search for stories by character ${characterName}:`, error);
    return [];
  }
}
