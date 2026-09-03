import { NextResponse } from "next/server";
import { getTodaysCalendarEvents } from "@/lib/google";

export async function GET() {
  try {
    const events = await getTodaysCalendarEvents();
    if (events === null) {
      return NextResponse.json({ connected: false, events: [] });
    }
    return NextResponse.json({ connected: true, events });
  } catch (err) {
    console.error("Failed to fetch calendar", err);
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
  }
}
