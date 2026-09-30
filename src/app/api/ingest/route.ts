import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { briefingPayloadSchema, weekendIngestSchema, weekendPayloadSchema } from "@/lib/digest-types";
import { addDays, keyFromString, keyToString, todayKey, weekendStart, zonedDayBounds } from "@/lib/time";
import type { Prisma } from "@prisma/client";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

// `kind` is optional so existing daily posts (no kind) keep working.
const ingestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("briefing"),
    date: dateString.optional(), // defaults to today in DASHBOARD_TIMEZONE
    payload: briefingPayloadSchema,
  }),
  z.object({
    kind: z.literal("weekend"),
    // Any day of (or the Friday before) the weekend; normalized to that Saturday.
    date: dateString.optional(),
    // ISO timestamp. Defaults to the end of Sunday in DASHBOARD_TIMEZONE.
    visibleUntil: z.string().datetime({ offset: true }).optional(),
    payload: weekendIngestSchema,
  }),
]);

function isAuthorized(req: NextRequest) {
  const key = process.env.INGEST_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const withKind = json && typeof json === "object" && !("kind" in json) ? { ...json, kind: "briefing" } : json;
  const parsed = ingestSchema.safeParse(withKind);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const body = parsed.data;

  if (body.kind === "briefing") {
    const date = body.date ? keyFromString(body.date) : todayKey();
    const payload = body.payload as Prisma.InputJsonObject;
    const row = await db.briefing.upsert({
      where: { date },
      create: { date, payload },
      update: { payload },
    });
    return NextResponse.json({ ok: true, kind: "briefing", date: keyToString(row.date) });
  }

  const weekOf = weekendStart(body.date ? keyFromString(body.date) : todayKey());
  const existing = await db.weekendBriefing.findUnique({ where: { weekOf } });
  const previous = existing ? weekendPayloadSchema.safeParse(existing.payload) : null;
  const base = previous?.success ? previous.data : { promotions: [], readings: [] };
  // Merge by section so the deals and readings automations don't overwrite each other.
  const merged = {
    promotions: body.payload.promotions ?? base.promotions,
    readings: body.payload.readings ?? base.readings,
  };
  const visibleUntil = body.visibleUntil
    ? new Date(body.visibleUntil)
    : (existing?.visibleUntil ?? zonedDayBounds(keyToString(addDays(weekOf, 1))).end);
  const payload = merged as Prisma.InputJsonObject;
  const row = await db.weekendBriefing.upsert({
    where: { weekOf },
    create: { weekOf, visibleUntil, payload },
    update: { visibleUntil, payload },
  });
  return NextResponse.json({
    ok: true,
    kind: "weekend",
    weekOf: keyToString(row.weekOf),
    visibleUntil: row.visibleUntil.toISOString(),
    counts: { promotions: merged.promotions.length, readings: merged.readings.length },
  });
}
