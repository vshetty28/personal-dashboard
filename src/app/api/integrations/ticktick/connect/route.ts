import { NextResponse } from "next/server";
import { getTickTickAuthUrl } from "@/lib/ticktick";

export async function GET() {
  return NextResponse.redirect(getTickTickAuthUrl());
}
