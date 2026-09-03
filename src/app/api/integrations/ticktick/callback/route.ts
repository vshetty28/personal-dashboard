import { NextRequest, NextResponse } from "next/server";
import { exchangeTickTickCode } from "@/lib/ticktick";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const tokens = await exchangeTickTickCode(code);

  await db.oAuthCredential.upsert({
    where: { provider: "TICKTICK" },
    create: {
      provider: "TICKTICK",
      accessToken: tokens.access_token,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      scope: "tasks:read tasks:write",
    },
    update: {
      accessToken: tokens.access_token,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
    },
  });

  return NextResponse.redirect(new URL("/", req.url));
}
