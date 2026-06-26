import { NextRequest, NextResponse } from "next/server";

import {
  canManageGuild,
  exchangeDiscordCode,
  fetchBotGuilds,
  fetchCurrentUser,
  fetchUserGuilds,
  getDiscordAvatarUrl
} from "@/lib/discord";
import { getEnv } from "@/lib/env";
import { consumeOauthState, setSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dashboardRedirect(path = "/") {
  return NextResponse.redirect(`${getEnv().baseUrl}${path}`);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = await consumeOauthState();

  if (!code || !state || !storedState || state !== storedState) {
    return dashboardRedirect("/?auth=failed");
  }

  try {
    const token = await exchangeDiscordCode(code);
    const [user, userGuilds, botGuilds] = await Promise.all([
      fetchCurrentUser(token.access_token),
      fetchUserGuilds(token.access_token),
      fetchBotGuilds()
    ]);

    const botGuildIds = new Set(botGuilds.map((guild) => guild.id));
    const guildIds = userGuilds.filter((guild) => canManageGuild(guild) && botGuildIds.has(guild.id)).map((guild) => guild.id);

    await setSession({
      user: {
        id: user.id,
        username: user.username,
        avatar: getDiscordAvatarUrl(user)
      },
      guildIds,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7
    });

    return dashboardRedirect("/");
  } catch (error) {
    console.error(error);
    return dashboardRedirect("/?auth=failed");
  }
}
