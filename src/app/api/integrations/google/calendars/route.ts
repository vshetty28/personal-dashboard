import { NextResponse } from "next/server";
import { listAvailableGoogleCalendars } from "@/lib/google";

// Visit this while logged in to find calendar IDs for GOOGLE_CALENDAR_IDS —
// covers both "My calendars" and "Other calendars", since the API doesn't
// distinguish them beyond the accessRole field.
export async function GET() {
  try {
    const calendars = await listAvailableGoogleCalendars();
    if (calendars === null) {
      return NextResponse.json({ connected: false, calendars: [] });
    }
    return NextResponse.json({ connected: true, calendars });
  } catch (err) {
    console.error("Failed to list calendars", err);
    return NextResponse.json({ error: "Failed to list calendars" }, { status: 500 });
  }
}
