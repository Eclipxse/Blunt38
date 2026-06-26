import { cookies } from "next/headers";
import crypto from "node:crypto";

import { getEnv } from "@/lib/env";

export type DashboardSession = {
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  guildIds: string[];
  expiresAt: number;
};

const sessionCookie = "browniezzz_dashboard";
const oauthStateCookie = "browniezzz_oauth_state";
const maxAgeSeconds = 60 * 60 * 24 * 7;

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getEnv().sessionSecret).update(payload).digest("base64url");
}

function encodeSession(session: DashboardSession) {
  const payload = base64Url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string): DashboardSession | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DashboardSession;
  if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
  return parsed;
}

export async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(sessionCookie)?.value;
  if (!raw) return null;

  try {
    return decodeSession(raw);
  } catch {
    return null;
  }
}

export async function setSession(session: DashboardSession) {
  const env = getEnv();
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.baseUrl.startsWith("https://"),
    path: "/",
    maxAge: maxAgeSeconds
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookie);
}

export async function setOauthState(state: string) {
  const env = getEnv();
  const cookieStore = await cookies();
  cookieStore.set(oauthStateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.baseUrl.startsWith("https://"),
    path: "/",
    maxAge: 60 * 10
  });
}

export async function consumeOauthState() {
  const cookieStore = await cookies();
  const value = cookieStore.get(oauthStateCookie)?.value ?? null;
  cookieStore.delete(oauthStateCookie);
  return value;
}
