import { NextResponse } from "next/server";

import { fetchBotGuilds, iconUrl } from "@/lib/discord";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = new Set(session.guildIds);
  const botGuilds = await fetchBotGuilds();
  const guilds = botGuilds
    .filter((guild) => allowed.has(guild.id))
    .map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: iconUrl(guild)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return NextResponse.json({
    user: session.user,
    guilds
  });
}
