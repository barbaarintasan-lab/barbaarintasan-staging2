// Google Drive Integration for Maktabada (Library)
// Supports: Replit connector (dev), OAuth refresh token, and Service Account (Fly.io production)
import { google, drive_v3 } from 'googleapis';

const MAKTABADA_FOLDER_NAME = "Barbaarintasan Maktabada";

let cachedOAuthToken: { token: string; expiresAt: number } | null = null;
let cachedServiceAccountClient: any = null;
let cachedReplitToken: { token: string; expiresAt: number } | null = null;

const videoMetadataCache = new Map<string, { name: string; mimeType: string; size: number; cachedAt: number }>();
const METADATA_CACHE_TTL = 30 * 60 * 1000;
const REPLIT_TOKEN_CACHE_TTL = 45 * 60 * 1000;

async function getAccessTokenViaReplit(): Promise<string> {
  if (cachedReplitToken && Date.now() < cachedReplitToken.expiresAt) {
    return cachedReplitToken.token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Replit connector not available');
  }

  console.log('[Google Drive] Fetching connection settings via Replit...');
  
  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected via Replit');
  }

  cachedReplitToken = {
    token: accessToken,
    expiresAt: Date.now() + REPLIT_TOKEN_CACHE_TTL
  };
  console.log('[Google Drive] Cached Replit access token for 45 minutes');
  
  return accessToken;
}

async function getAccessTokenViaOAuth(): Promise<string> {
  if (cachedOAuthToken && Date.now() < cachedOAuthToken.expiresAt) {
    return cachedOAuthToken.token;
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth credentials not configured');
  }

  console.log('[Google Drive] Refreshing access token via OAuth...');
  
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh Google Drive access token');
  }

  cachedOAuthToken = {
    token: credentials.access_token,
    expiresAt: (credentials.expiry_date || Date.now() + 3500000) - 60000
  };
  
  console.log('[Google Drive] Got fresh access token via OAuth');
  return credentials.access_token;
}

export async function getAccessToken(): Promise<string> {
  const isReplit = !!(process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL);
  
  if (isReplit) {
    try {
      return await getAccessTokenViaReplit();
    } catch (err) {
      console.log('[Google Drive] Replit connector failed, trying other methods...');
    }
  }
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return await getAccessTokenViaServiceAccount();
    } catch (err: any) {
      console.log('[Google Drive] Service Account token failed:', err.message, '- trying OAuth...');
    }
  }

  const hasDriveRefreshToken = !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (hasDriveRefreshToken) {
    return await getAccessTokenViaOAuth();
  }

  throw new Error('No Google Drive credentials available for access token');
}

async function getDriveClientViaReplit() {
  const accessToken = await getAccessTokenViaReplit();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function getDriveClientViaOAuth() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth credentials not configured');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);
  
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function getDriveClientViaServiceAccount() {
  if (cachedServiceAccountClient) {
    return cachedServiceAccountClient;
  }

  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('Google Service Account JSON not configured');
  }

  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  cachedServiceAccountClient = google.drive({ version: 'v3', auth });
  console.log('[Google Drive] Using Service Account for Drive access');
  return cachedServiceAccountClient;
}

async function getAccessTokenViaServiceAccount(): Promise<string> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('Google Service Account JSON not configured');
  }

  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const accessToken = await auth.getAccessToken();
  if (!accessToken) {
    throw new Error('Failed to get access token from Service Account');
  }

  console.log('[Google Drive] Got access token via Service Account');
  return accessToken;
}

async function getDriveClient() {
  const isReplit = !!(process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL);
  
  if (isReplit) {
    try {
      return await getDriveClientViaReplit();
    } catch (err) {
      console.log('[Google Drive] Replit connector failed for Drive client, trying other methods...');
    }
  }
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return await getDriveClientViaServiceAccount();
    } catch (err: any) {
      console.log('[Google Drive] Service Account failed:', err.message, '- trying OAuth fallback...');
    }
  }

  const hasDriveRefreshToken = !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (hasDriveRefreshToken) {
    return await getDriveClientViaOAuth();
  }

  throw new Error('No Google Drive credentials available');
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

export async function getMaktabadaFolderId(): Promise<string | null> {
  try {
    const drive = await getDriveClient();
    
    const response = await drive.files.list({
      q: `name='${MAKTABADA_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    const folders = response.data.files || [];
    if (folders.length > 0) {
      console.log(`[Google Drive] Found Maktabada folder: ${folders[0].id}`);
      return folders[0].id || null;
    }
    
    console.log('[Google Drive] Maktabada folder not found');
    return null;
  } catch (error) {
    console.error('[Google Drive] Error finding Maktabada folder:', error);
    throw error;
  }
}

export async function listMaktabadaFiles(): Promise<DriveFile[]> {
  try {
    const folderId = await getMaktabadaFolderId();
    
    if (!folderId) {
      console.log('[Google Drive] No Maktabada folder found, returning empty list');
      return [];
    }

    const drive = await getDriveClient();
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink)',
      orderBy: 'name',
      pageSize: 100
    });

    const files = response.data.files || [];
    console.log(`[Google Drive] Found ${files.length} files in Maktabada`);
    
    return files.map((file: drive_v3.Schema$File) => ({
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      size: file.size || undefined,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
      thumbnailLink: file.thumbnailLink || undefined,
      iconLink: file.iconLink || undefined
    }));
  } catch (error) {
    console.error('[Google Drive] Error listing Maktabada files:', error);
    throw error;
  }
}

export async function getFileDownloadUrl(fileId: string): Promise<string | null> {
  try {
    const drive = await getDriveClient();
    
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'webContentLink, webViewLink'
    });

    return file.data.webContentLink || file.data.webViewLink || null;
  } catch (error) {
    console.error('[Google Drive] Error getting file download URL:', error);
    throw error;
  }
}

export async function deleteDriveFile(fileId: string): Promise<boolean> {
  try {
    const drive = await getDriveClient();
    
    await drive.files.delete({
      fileId: fileId
    });
    
    console.log(`[Google Drive] Deleted file: ${fileId}`);
    return true;
  } catch (error) {
    console.error('[Google Drive] Error deleting file:', error);
    throw error;
  }
}

// Extract folder ID from Google Drive URL
function extractFolderIdFromUrl(url: string): string | null {
  // Handle URLs like: https://drive.google.com/drive/folders/1mE_bJNE-9fFJvYU4TYeufNcni5qlBGyI?usp=drive_link
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return folderMatch[1];
  }
  return null;
}

export async function listFilesInFolder(folderUrl: string): Promise<DriveFile[]> {
  try {
    const folderId = extractFolderIdFromUrl(folderUrl);
    
    if (!folderId) {
      console.log('[Google Drive] Could not extract folder ID from URL:', folderUrl);
      return [];
    }

    const drive = await getDriveClient();
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType contains 'audio'`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink)',
      orderBy: 'name',
      pageSize: 200
    });

    const files = response.data.files || [];
    console.log(`[Google Drive] Found ${files.length} audio files in folder`);
    
    return files.map((file: drive_v3.Schema$File) => ({
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      size: file.size || undefined,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
    }));
  } catch (error) {
    console.error('[Google Drive] Error listing files in folder:', error);
    throw error;
  }
}

export async function getDirectDownloadUrl(fileId: string): Promise<string | null> {
  try {
    const accessToken = await getAccessToken();
    // Return a direct streaming URL that uses the access token
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${accessToken}`;
  } catch (error) {
    console.error('[Google Drive] Error getting direct download URL:', error);
    return null;
  }
}

export async function getVideoFileMetadata(fileId: string): Promise<{ name: string; mimeType: string; size: number } | null> {
  try {
    const drive = await getDriveClient();
    const fileInfo = await drive.files.get({
      fileId,
      fields: 'name, mimeType, size'
    });
    return {
      name: fileInfo.data.name || 'video.mp4',
      mimeType: fileInfo.data.mimeType || 'video/mp4',
      size: parseInt(fileInfo.data.size || '0', 10)
    };
  } catch (error) {
    console.error('[Google Drive] Error getting video metadata:', fileId, error);
    return null;
  }
}

async function getCachedVideoMetadata(fileId: string): Promise<{ name: string; mimeType: string; size: number }> {
  const cached = videoMetadataCache.get(fileId);
  if (cached && Date.now() - cached.cachedAt < METADATA_CACHE_TTL) {
    return { name: cached.name, mimeType: cached.mimeType, size: cached.size };
  }

  const drive = await getDriveClient();
  const fileInfo = await drive.files.get({ fileId, fields: 'name, mimeType, size' });
  const metadata = {
    name: fileInfo.data.name || 'video.mp4',
    mimeType: fileInfo.data.mimeType || 'video/mp4',
    size: parseInt(fileInfo.data.size || '0', 10),
    cachedAt: Date.now()
  };
  videoMetadataCache.set(fileId, metadata);
  console.log('[Google Drive] Video file:', metadata.name, 'size:', metadata.size, 'mime:', metadata.mimeType);
  return metadata;
}

export async function streamVideoFile(fileId: string, rangeHeader?: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; size: number; start?: number; end?: number; isPartial: boolean } | null> {
  try {
    const { mimeType, size: fileSize } = await getCachedVideoMetadata(fileId);

    if (rangeHeader && fileSize > 0) {
      const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (rangeMatch) {
        let start: number;
        let end: number;

        if (rangeMatch[1] === "" && rangeMatch[2] !== "") {
          const suffixLength = parseInt(rangeMatch[2], 10);
          start = Math.max(0, fileSize - suffixLength);
          end = fileSize - 1;
        } else {
          start = parseInt(rangeMatch[1], 10);
          end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : Math.min(start + 10 * 1024 * 1024 - 1, fileSize - 1);
        }

        const maxChunk = 10 * 1024 * 1024;
        if (end - start + 1 > maxChunk) {
          end = start + maxChunk - 1;
        }

        if (end >= fileSize) {
          end = fileSize - 1;
        }

        if (start >= fileSize || start > end) {
          return null;
        }

        const accessToken = await getAccessToken();
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Range': `bytes=${start}-${end}`
          }
        });

        if (!response.ok && response.status !== 206) {
          console.error('[Google Drive] Range request failed:', response.status, response.statusText);
          if (response.status === 401 || response.status === 403) {
            cachedReplitToken = null;
          }
          return null;
        }

        const webStream = response.body;
        if (!webStream) return null;
        const { Readable } = await import('stream');
        const nodeStream = Readable.fromWeb(webStream as any);

        return {
          stream: nodeStream,
          mimeType,
          size: fileSize,
          start,
          end,
          isPartial: true
        };
      }
    }

    const accessToken = await getAccessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      console.error('[Google Drive] Full file request failed:', response.status);
      return null;
    }

    const webStream = response.body;
    if (!webStream) return null;
    const { Readable } = await import('stream');
    const nodeStream = Readable.fromWeb(webStream as any);

    return {
      stream: nodeStream,
      mimeType,
      size: fileSize,
      isPartial: false
    };
  } catch (error) {
    console.error('[Google Drive] Error streaming video file:', fileId, error);
    return null;
  }
}

export async function streamAudioFile(fileId: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; size?: string } | null> {
  try {
    const drive = await getDriveClient();
    
    // Get file metadata first
    console.log('[Google Drive] Getting file metadata for:', fileId);
    const fileInfo = await drive.files.get({
      fileId,
      fields: 'name, mimeType, size'
    });
    
    console.log('[Google Drive] File info:', fileInfo.data.name, 'mimeType:', fileInfo.data.mimeType, 'size:', fileInfo.data.size);
    
    // Get the file content as a stream
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    
    return {
      stream: response.data as unknown as NodeJS.ReadableStream,
      mimeType: fileInfo.data.mimeType || 'audio/mpeg',
      size: fileInfo.data.size || undefined
    };
  } catch (error) {
    console.error('[Google Drive] Error streaming audio file:', fileId, error);
    return null;
  }
}

// List files from a subfolder within Maktabada by subfolder name
export async function listMaktabadaSubfolderFiles(subfolderName: string): Promise<DriveFile[]> {
  try {
    const maktabadaFolderId = await getMaktabadaFolderId();
    
    if (!maktabadaFolderId) {
      console.log('[Google Drive] No Maktabada folder found');
      return [];
    }

    const drive = await getDriveClient();
    
    // First find the subfolder within Maktabada
    const subfolderResponse = await drive.files.list({
      q: `name='${subfolderName}' and '${maktabadaFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    const subfolders = subfolderResponse.data.files || [];
    if (subfolders.length === 0) {
      console.log(`[Google Drive] Subfolder '${subfolderName}' not found in Maktabada`);
      return [];
    }

    const subfolderId = subfolders[0].id;
    console.log(`[Google Drive] Found subfolder '${subfolderName}': ${subfolderId}`);
    
    // Now list all files in that subfolder (PDFs and other documents)
    const response = await drive.files.list({
      q: `'${subfolderId}' in parents and trashed=false and (mimeType='application/pdf' or mimeType contains 'document')`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink)',
      orderBy: 'name',
      pageSize: 100
    });

    const files = response.data.files || [];
    console.log(`[Google Drive] Found ${files.length} files in subfolder '${subfolderName}'`);
    
    return files.map((file: drive_v3.Schema$File) => ({
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      size: file.size || undefined,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
      thumbnailLink: file.thumbnailLink || undefined,
      iconLink: file.iconLink || undefined
    }));
  } catch (error) {
    console.error(`[Google Drive] Error listing subfolder '${subfolderName}':`, error);
    throw error;
  }
}
