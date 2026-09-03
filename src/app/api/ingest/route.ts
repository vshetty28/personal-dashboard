import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { startOfTodayUTC } from "@/lib/date";
import type { Prisma } from "@prisma/client";

const newsItemSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string(),
  summary: z.string(),
  whyItMatters: z.string(),
});

const marketsItemSchema = newsItemSchema.extend({
  ticker: z.string(),
});

const emailAttentionItemSchema = z.object({
  sender: z.string(),
  subject: z.string(),
  whyItMatters: z.string(),
  deadline: z.string().optional(),
  nextAction: z.string(),
});

const ingestSchema = z.object({
  date: z.string().date().optional(), // YYYY-MM-DD, defaults to today (UTC)
  payload: z.object({
    topics: z.object({
      aiLlm: z.array(newsItemSchema),
      softwareEngineering: z.array(newsItemSchema),
      spaceDefense: z.array(newsItemSchema),
      markets: z.array(marketsItemSchema),
      healthFitness: z.array(newsItemSchema),
      sports: z.array(newsItemSchema),
    }),
    emailAttention: z.array(emailAttentionItemSchema),
  }),
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

  const { date, payload } = parsed.data;
  const targetDate = date ? new Date(`${date}T00:00:00.000Z`) : startOfTodayUTC();
  const jsonPayload = payload as Prisma.InputJsonObject;

  const briefing = await db.briefing.upsert({
    where: { date: targetDate },
    create: { date: targetDate, payload: jsonPayload },
    update: { payload: jsonPayload },
  });

  return NextResponse.json({ ok: true, date: briefing.date });
}
