import { getEnv } from "@/lib/env";

const apiBase = "https://discord.com/api/v10";

export type DiscordUser = {
  id: string;
  username: string;
  avatar: string | null;
};

export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner?: boolean;
  permissions?: string;
};

export type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
};

export type DiscordRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

async function discordFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      "User-Agent": "Browniezzz Dashboard"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord request failed ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function exchangeDiscordCode(code: string) {
  const env = getEnv();
  const body = new URLSearchParams({
    client_id: env.discordClientId,
    client_secret: env.discordClientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: `${env.baseUrl}/api/auth/callback`
  });

  const response = await fetch(`${apiBase}/oauth2/token`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Browniezzz Dashboard"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed ${response.status}`);
  }

  return response.json() as Promise<DiscordTokenResponse>;
}

export function getDiscordAvatarUrl(user: DiscordUser) {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

export async function fetchCurrentUser(accessToken: string) {
  return discordFetch<DiscordUser>("/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function fetchUserGuilds(accessToken: string) {
  return discordFetch<DiscordGuild[]>("/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function fetchBotGuilds() {
  return discordFetch<DiscordGuild[]>("/users/@me/guilds", {
    headers: { Authorization: `Bot ${getEnv().discordToken}` }
  });
}

export async function fetchGuildChannels(guildId: string) {
  return discordFetch<DiscordChannel[]>(`/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${getEnv().discordToken}` }
  });
}

export async function fetchGuildRoles(guildId: string) {
  return discordFetch<DiscordRole[]>(`/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${getEnv().discordToken}` }
  });
}

export function canManageGuild(guild: DiscordGuild) {
  if (guild.owner) return true;
  const permissions = BigInt(guild.permissions ?? "0");
  const administrator = 0x8n;
  const manageGuild = 0x20n;
  return (permissions & administrator) === administrator || (permissions & manageGuild) === manageGuild;
}

export function iconUrl(guild: DiscordGuild) {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
}
