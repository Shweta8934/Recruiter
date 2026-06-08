import { google } from 'googleapis';

/**
 * Helper to initialize the Google Calendar API client using a Service Account.
 */
export function isCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

function getCalendarClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Calendar Service Account credentials are not configured.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  return google.calendar({ version: 'v3', auth });
}

interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: Date;
  durationMinutes: number;
  attendeeEmails: string[];
}

/**
 * Creates a Google Calendar event with a Google Meet link and adds attendees.
 * Requires Domain-wide Delegation if impersonating, OR just uses the Service Account's own calendar.
 */
export async function createCalendarEvent({
  summary,
  description,
  startTime,
  durationMinutes,
  attendeeEmails,
}: CreateEventParams) {
  if (!isCalendarConfigured()) {
    return { eventId: null, meetLink: null, eventLink: null, skipped: true };
  }

  try {
    const calendar = getCalendarClient();

    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const event = {
      summary,
      description: description || 'Interview scheduled via AI Recruitment Platform.',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: attendeeEmails.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      sendUpdates: 'all', // Sends email invites to attendees
      requestBody: event,
    });

    return {
      eventId: response.data.id,
      meetLink: response.data.hangoutLink,
      eventLink: response.data.htmlLink,
    };
  } catch (error: any) {
    console.error('Failed to create calendar event:', error);
    throw error;
  }
}

export async function updateCalendarEvent(eventId: string, params: Partial<CreateEventParams>) {
  if (!isCalendarConfigured()) return null;

  try {
    const calendar = getCalendarClient();
    
    const existing = await calendar.events.get({ calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary', eventId });
    const event = existing.data;

    if (params.summary) event.summary = params.summary;
    if (params.description) event.description = params.description;
    
    if (params.startTime && params.durationMinutes) {
      const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60000);
      event.start = { dateTime: params.startTime.toISOString(), timeZone: 'UTC' };
      event.end = { dateTime: endTime.toISOString(), timeZone: 'UTC' };
    }
    
    if (params.attendeeEmails) {
      event.attendees = params.attendeeEmails.map((email) => ({ email }));
    }

    const response = await calendar.events.update({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId,
      sendUpdates: 'all',
      requestBody: event,
    });

    return {
      eventId: response.data.id,
      meetLink: response.data.hangoutLink,
      eventLink: response.data.htmlLink,
    };
  } catch (error: any) {
    console.error('Failed to update calendar event:', error);
    throw error;
  }
}

export async function deleteCalendarEvent(eventId: string) {
  if (!isCalendarConfigured()) return false;

  try {
    const calendar = getCalendarClient();
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId,
      sendUpdates: 'all',
    });
    return true;
  } catch (error: any) {
    console.error('Failed to delete calendar event:', error);
    throw error;
  }
}
