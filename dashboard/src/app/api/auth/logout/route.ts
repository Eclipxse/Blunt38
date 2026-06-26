import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { clearSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  await clearSession();
  return NextResponse.redirect(getEnv().baseUrl);
}
