import { google, calendar_v3 } from "googleapis";
import { db } from "@/lib/db";

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getGoogleAuthUrl() {
  return createOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token on every consent, not just the first
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
}

/** Authenticated OAuth2 client for the stored Google credential, or null if not yet connected. */
async function getAuthorizedClient() {
  const cred = await db.oAuthCredential.findUnique({ where: { provider: "GOOGLE" } });
  if (!cred) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: cred.accessToken,
    refresh_token: cred.refreshToken ?? undefined,
    expiry_date: cred.expiresAt?.getTime(),
  });

  // googleapis auto-refreshes expired access tokens; persist the new one when it does.
  client.on("tokens", (tokens) => {
    void db.oAuthCredential.update({
      where: { provider: "GOOGLE" },
      data: {
        accessToken: tokens.access_token ?? cred.accessToken,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : cred.expiresAt,
      },
    });
  });

  return client;
}

/** Which calendars to pull events from — set via GOOGLE_CALENDAR_IDS (comma-separated), defaults to just the primary one. */
function configuredCalendarIds(): string[] {
  const raw = process.env.GOOGLE_CALENDAR_IDS;
  if (!raw) return ["primary"];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export type CalendarEvent = calendar_v3.Schema$Event & { calendarName?: string };

/** Returns today's events across the configured calendars, sorted by start time, or null if not yet connected. */
export async function getTodaysCalendarEvents(): Promise<CalendarEvent[] | null> {
  const client = await getAuthorizedClient();
  if (!client) return null;

  const calendar = google.calendar({ version: "v3", auth: client });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const results = await Promise.all(
    configuredCalendarIds().map(async (calendarId) => {
      const res = await calendar.events.list({
        calendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });
      const calendarName = res.data.summary ?? calendarId;
      return (res.data.items ?? []).map((event) => ({ ...event, calendarName }));
    }),
  );

  return results.flat().sort((a, b) => {
    const aTime = a.start?.dateTime ?? a.start?.date ?? "";
    const bTime = b.start?.dateTime ?? b.start?.date ?? "";
    return aTime.localeCompare(bTime);
  });
}

/** Lists every calendar the account can read (both "My calendars" and "Other calendars"), to find IDs for GOOGLE_CALENDAR_IDS. */
export async function listAvailableGoogleCalendars() {
  const client = await getAuthorizedClient();
  if (!client) return null;

  const calendar = google.calendar({ version: "v3", auth: client });
  const res = await calendar.calendarList.list({ minAccessRole: "reader" });

  return (res.data.items ?? []).map((c) => ({
    id: c.id,
    name: c.summaryOverride ?? c.summary,
    primary: c.primary ?? false,
    accessRole: c.accessRole,
  }));
}
