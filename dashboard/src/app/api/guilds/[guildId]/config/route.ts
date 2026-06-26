import { NextRequest, NextResponse } from "next/server";

import { fetchGuildChannels, fetchGuildRoles } from "@/lib/discord";
import { getGuildConfig, updateGuildConfig } from "@/lib/guild-config";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ guildId: string }>;
};

async function authorize(context: RouteContext) {
  const session = await getSession();
  const { guildId } = await context.params;

  if (!session || !session.guildIds.includes(guildId)) {
    return { guildId, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { guildId, error: null };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;

  const [config, channels, roles] = await Promise.all([
    getGuildConfig(auth.guildId),
    fetchGuildChannels(auth.guildId),
    fetchGuildRoles(auth.guildId)
  ]);

  return NextResponse.json({
    config,
    channels: channels
      .filter((channel) => [0, 2, 4, 5, 13, 15].includes(channel.type))
      .sort((left, right) => left.name.localeCompare(right.name)),
    roles: roles
      .filter((role) => role.name !== "@everyone" && !role.managed)
      .sort((left, right) => right.position - left.position)
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;

  const body = await request.json();
  const config = await updateGuildConfig(auth.guildId, body);
  return NextResponse.json({ config });
}
