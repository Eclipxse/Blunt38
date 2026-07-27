type DashboardEnv = {
  discordClientId: string;
  discordClientSecret: string;
  discordToken: string;
  baseUrl: string;
  sessionSecret: string;
  databaseUrl: string;
  supabaseUrl: string | null;
  supabaseServiceRoleKey: string | null;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getEnv(): DashboardEnv {
  return {
    discordClientId: requireEnv("DISCORD_CLIENT_ID"),
    discordClientSecret: requireEnv("DISCORD_CLIENT_SECRET"),
    discordToken: requireEnv("DISCORD_TOKEN"),
    baseUrl: requireEnv("DASHBOARD_BASE_URL").replace(/\/$/, ""),
    sessionSecret: requireEnv("DASHBOARD_SESSION_SECRET"),
    databaseUrl: requireEnv("DATABASE_URL"),
    supabaseUrl: process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || null,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
  };
}
