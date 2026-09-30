import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addDays, keyToString, retentionCutoff, RETENTION_DAYS } from "@/lib/time";

/**
 * Nightly retention sweep (scheduled in vercel.json). Deletes everything older
 * than RETENTION_DAYS so the dashboard never holds more than a month of data.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = retentionCutoff();
  // A weekend is kept while any of its days is still inside the window.
  const weekendCutoff = addDays(cutoff, -1);

  const [briefings, weekends, marks] = await db.$transaction([
    db.briefing.deleteMany({ where: { date: { lt: cutoff } } }),
    db.weekendBriefing.deleteMany({ where: { weekOf: { lt: weekendCutoff } } }),
    db.itemMark.deleteMany({ where: { date: { lt: weekendCutoff } } }),
  ]);

  return NextResponse.json({
    ok: true,
    retentionDays: RETENTION_DAYS,
    cutoff: keyToString(cutoff),
    deleted: { briefings: briefings.count, weekends: weekends.count, marks: marks.count },
  });
}
