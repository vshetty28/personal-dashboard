import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { briefingPayloadSchema, weekendIngestSchema, weekendPayloadSchema, sourceIngestSchema } from "@/lib/digest-types";
import { addDays, keyFromString, keyToString, todayKey, weekendStart, zonedDayBounds } from "@/lib/time";
import type { Prisma } from "@prisma/client";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

// `kind` is optional so existing daily posts (no kind) keep working.
const ingestSchema = z.union([sourceIngestSchema.and(z.object({ date: dateString.optional() })), z.discriminatedUnion("kind", [
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
])]);

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

  if (body.kind !== "weekend") {
    const date = body.date ? keyFromString(body.date) : todayKey();
    const updatedAt = new Date().toISOString();
    const row = await db.$transaction(async (tx) => {
      // Transaction-scoped lock also protects the first upload of a date.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`briefing:${keyToString(date)}`}))::text`;
      const existing = await tx.briefing.findUnique({ where: { date } });
      const base = existing ? briefingPayloadSchema.parse(existing.payload) : briefingPayloadSchema.parse({ topics: {}, emailAttention: [] });
      const sourceUpdatedAt = { ...base.sourceUpdatedAt };
      const sources = body.kind === "briefing" ? ["news", "email"] : [body.kind];
      for (const source of sources) sourceUpdatedAt[source] = updatedAt;
      // Legacy daily posts own news/email, but preserve independently uploaded deals/readings.
      const patch = body.kind === "briefing"
        ? { topics: body.payload.topics, emailAttention: body.payload.emailAttention, headline: body.payload.headline }
        : body.kind === "news" ? { ...body.payload, headline: body.payload.headline } : body.payload;
      const payload = { ...base, ...patch, sourceUpdatedAt } as Prisma.InputJsonObject;
      return tx.briefing.upsert({ where: { date }, create: { date, payload }, update: { payload } });
    });
    return NextResponse.json({ ok: true, kind: body.kind, date: keyToString(row.date), updatedAt });
  }

  const weekOf = weekendStart(body.date ? keyFromString(body.date) : todayKey());
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`weekend:${keyToString(weekOf)}`}))::text`;
    const existing = await tx.weekendBriefing.findUnique({ where: { weekOf } });
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
    const row = await tx.weekendBriefing.upsert({
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
  });
}
