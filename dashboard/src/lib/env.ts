type DashboardEnv = {
  discordClientId: string;
  discordClientSecret: string;
  discordToken: string;
  baseUrl: string;
  sessionSecret: string;
  databaseUrl: string;
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
    databaseUrl: requireEnv("DATABASE_URL")
  };
}
