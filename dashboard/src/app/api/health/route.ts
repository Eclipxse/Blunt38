import { NextResponse } from "next/server";

import { getPool } from "@/lib/db";
import { fetchBotUser } from "@/lib/discord";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ServiceResult = {
  status: "online" | "degraded";
  latencyMs: number;
  detail: string;
};

async function inspectService(check: () => Promise<string>): Promise<ServiceResult> {
  const startedAt = performance.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const detail = await Promise.race([
      check(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("Timed out")), 6_000);
      })
    ]);

    return {
      status: "online",
      latencyMs: Math.round(performance.now() - startedAt),
      detail
    };
  } catch (error) {
    return {
      status: "degraded",
      latencyMs: Math.round(performance.now() - startedAt),
      detail: error instanceof Error ? error.message : "Unavailable"
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getEnv();
  const protocol = env.lavalinkSecure ? "https" : "http";
  const lavalinkUrl = `${protocol}://${env.lavalinkHost}:${env.lavalinkPort}/v4/info`;

  const [discord, database, lavalink] = await Promise.all([
    inspectService(async () => {
      const bot = await fetchBotUser();
      return `${bot.username} connected`;
    }),
    inspectService(async () => {
      await getPool().query("select 1");
      return "Supabase reachable";
    }),
    inspectService(async () => {
      const response = await fetch(lavalinkUrl, {
        headers: { Authorization: env.lavalinkPassword },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const info = (await response.json()) as { version?: { semver?: string } };
      return info.version?.semver ? `Lavalink ${info.version.semver}` : "Lavalink connected";
    })
  ]);

  const services = { discord, database, lavalink };
  const healthy = Object.values(services).every((service) => service.status === "online");

  return NextResponse.json({
    status: healthy ? "online" : "degraded",
    checkedAt: new Date().toISOString(),
    dashboardUptimeSeconds: Math.round(process.uptime()),
    services
  });
}
