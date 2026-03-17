// Google Calendar Integration for creating Google Meet links
// Supports both Replit connector (development) and standalone OAuth (Fly.io production)
import { google } from 'googleapis';

async function getCalendarClientViaReplit() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Replit connector not available');
  }

  console.log('[Google Calendar] Fetching token via Replit connector...');
  
  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
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
    throw new Error('Google Calendar not connected via Replit');
  }
  
  console.log('[Google Calendar] Got token via Replit connector');
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

async function getCalendarClientViaOAuth() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Calendar OAuth credentials not configured (GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REFRESH_TOKEN)');
  }

  console.log('[Google Calendar] Using OAuth refresh token...');
  
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);
  
  console.log('[Google Calendar] Got fresh access token via OAuth');
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

async function getGoogleCalendarClient() {
  const isReplit = !!(process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL);
  
  if (isReplit) {
    try {
      return await getCalendarClientViaReplit();
    } catch (err) {
      console.log('[Google Calendar] Replit connector failed, trying OAuth fallback...');
    }
  }
  
  return await getCalendarClientViaOAuth();
}

export async function createGoogleMeetLink(title: string, description: string, startDateTime: string, durationMinutes: number = 60): Promise<{ meetLink: string; eventId: string }> {
  const calendar = await getGoogleCalendarClient();
  
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const event = {
    summary: title,
    description: description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'Africa/Mogadishu',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Africa/Mogadishu',
    },
    conferenceData: {
      createRequest: {
        requestId: `barbaarintasan-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
  });

  const meetLink = response.data.conferenceData?.entryPoints?.find(
    (ep: any) => ep.entryPointType === 'video'
  )?.uri || '';

  return {
    meetLink,
    eventId: response.data.id || '',
  };
}
