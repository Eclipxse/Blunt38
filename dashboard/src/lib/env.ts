type DashboardEnv = {
  discordClientId: string;
  discordClientSecret: string;
  discordToken: string;
  baseUrl: string;
  sessionSecret: string;
  databaseUrl: string;
  supabaseUrl: string | null;
  supabaseServiceRoleKey: string | null;
  lavalinkHost: string;
  lavalinkPort: number;
  lavalinkPassword: string;
  lavalinkSecure: boolean;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  const normalized = value.toLowerCase();
  const isPlaceholder =
    normalized.includes("your_") ||
    normalized.includes("replace_with") ||
    normalized.includes("projectref") ||
    normalized.includes("aws-1-region");

  if (isPlaceholder) {
    throw new Error(`Replace the placeholder value for ${name}`);
  }

  return value;
}

export function getEnv(): DashboardEnv {
  const lavalinkPort = Number.parseInt(process.env.LAVALINK_PORT ?? "2333", 10);

  return {
    discordClientId: requireEnv("DISCORD_CLIENT_ID"),
    discordClientSecret: requireEnv("DISCORD_CLIENT_SECRET"),
    discordToken: requireEnv("DISCORD_TOKEN"),
    baseUrl: requireEnv("DASHBOARD_BASE_URL").replace(/\/$/, ""),
    sessionSecret: requireEnv("DASHBOARD_SESSION_SECRET"),
    databaseUrl: requireEnv("DATABASE_URL"),
    supabaseUrl: process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || null,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
    lavalinkHost: process.env.LAVALINK_HOST?.trim() || "127.0.0.1",
    lavalinkPort: Number.isFinite(lavalinkPort) ? lavalinkPort : 2333,
    lavalinkPassword: process.env.LAVALINK_PASSWORD?.trim() || "youshallnotpass",
    lavalinkSecure: process.env.LAVALINK_SECURE === "true"
  };
}
