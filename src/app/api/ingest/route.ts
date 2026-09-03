import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { startOfTodayUTC } from "@/lib/date";
import { DigestType, type Prisma } from "@prisma/client";

const ingestSchema = z.object({
  type: z.enum(["EMAIL", "NEWS", "PORTFOLIO"]),
  date: z.string().date().optional(), // YYYY-MM-DD, defaults to today (UTC)
  payload: z.record(z.string(), z.unknown()),
});

function isAuthorized(req: NextRequest) {
  const key = process.env.INGEST_API_KEY;
  if (!key) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${key}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = ingestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { type, date, payload } = parsed.data;
  const targetDate = date ? new Date(`${date}T00:00:00.000Z`) : startOfTodayUTC();
  const jsonPayload = payload as Prisma.InputJsonObject;

  const digest = await db.digest.upsert({
    where: { type_date: { type: type as DigestType, date: targetDate } },
    create: { type: type as DigestType, date: targetDate, payload: jsonPayload },
    update: { payload: jsonPayload },
  });

  return NextResponse.json({ ok: true, id: digest.id });
}
