import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { getEnv } from "@/lib/env";
import { setOauthState } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnv();
  const state = crypto.randomBytes(24).toString("base64url");
  await setOauthState(state);

  const params = new URLSearchParams({
    client_id: env.discordClientId,
    redirect_uri: `${env.baseUrl}/api/auth/callback`,
    response_type: "code",
    scope: "identify guilds",
    state,
    prompt: "none"
  });

  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
}
