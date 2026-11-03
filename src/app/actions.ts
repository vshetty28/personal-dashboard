"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { completeTickTickTask, createTickTickTask } from "@/lib/ticktick";
import { briefingPayloadSchema } from "@/lib/digest-types";
import { isDateString, keyFromString } from "@/lib/time";

// Server Actions are reachable by POST from anywhere, so each one checks the
// session itself rather than relying on the proxy alone.
async function requireSession() {
  if (!(await getSession())) throw new Error("Unauthorized");
}

const markInput = z.object({
  key: z.string().min(1).max(500),
  kind: z.enum(["email", "deal", "read"]),
  date: z.string().refine(isDateString, "expected YYYY-MM-DD"),
  on: z.boolean(),
});

/** Marks an email handled, a deal dismissed or a reading read (or undoes it). */
export async function setMark(input: z.input<typeof markInput>) {
  await requireSession();
  const { key, kind, date, on } = markInput.parse(input);
  if (kind === "email") {
    if (key.startsWith("email:obligation:")) throw new Error("Complete linked email tasks in TickTick");
    const row = await db.briefing.findUnique({ where: { date: keyFromString(date) } });
    const parsed = row ? briefingPayloadSchema.safeParse(row.payload) : null;
    if (row && !parsed?.success) throw new Error("Cannot verify email completion state");
    if (parsed?.success && parsed.data.emailAttention.some((item) =>
      item.obligationId && key === `email:${date}:${item.sender}|${item.subject}`
    )) throw new Error("Complete linked email tasks in TickTick");
  }
  if (on) {
    await db.itemMark.upsert({
      where: { key },
      create: { key, kind, date: keyFromString(date) },
      update: {},
    });
  } else {
    await db.itemMark.deleteMany({ where: { key } });
  }
  refresh();
}

export async function completeTask(projectId: string, taskId: string) {
  await requireSession();
  await completeTickTickTask(z.string().min(1).parse(projectId), z.string().min(1).parse(taskId));
  refresh();
}

export async function addTask(title: string) {
  await requireSession();
  const clean = z.string().trim().min(1).max(300).parse(title);
  await createTickTickTask(clean);
  refresh();
}
