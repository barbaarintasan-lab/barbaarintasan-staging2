// Google Drive Integration for Maktabada (Library)
import { google } from 'googleapis';

const MAKTABADA_FOLDER_NAME = "Barbaarintasan Maktabada";

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.error('[Google Drive] X_REPLIT_TOKEN not found');
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  console.log('[Google Drive] Fetching connection settings...');
  
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
    console.error('[Google Drive] Not connected or no access token');
    throw new Error('Google Drive not connected');
  }
  
  return accessToken;
}

async function getDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
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
    
    return files.map(file => ({
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
    
    return files.map(file => ({
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
    
    return files.map(file => ({
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
