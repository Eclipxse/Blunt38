import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import { resolve } from "node:path";
import dotenv from "dotenv";

const envPath = resolve(process.cwd(), ".env");
dotenv.config({ path: envPath, override: true });

const clientId = requiredEnv("SPOTIFY_CLIENT_ID");
const clientSecret = requiredEnv("SPOTIFY_CLIENT_SECRET");
const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim() || "http://127.0.0.1:8888/callback";
const redirectUrl = new URL(redirectUri);

if (redirectUrl.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(redirectUrl.hostname)) {
  throw new Error("SPOTIFY_REDIRECT_URI must use an HTTP loopback address such as http://127.0.0.1:8888/callback.");
}

const port = Number.parseInt(redirectUrl.port || "80", 10);
if (!Number.isFinite(port) || port < 1 || port > 65535) throw new Error("SPOTIFY_REDIRECT_URI has an invalid port.");

const state = crypto.randomBytes(24).toString("base64url");
const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
authorizeUrl.search = new URLSearchParams({
  client_id: clientId,
  response_type: "code",
  redirect_uri: redirectUri,
  state,
  scope: "playlist-read-private playlist-read-collaborative",
  show_dialog: "true"
}).toString();

let completed = false;
const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", redirectUri);
  if (requestUrl.pathname !== redirectUrl.pathname) {
    sendHtml(response, 404, "Spotify authorization", "This callback path is not configured.");
    return;
  }

  const error = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  if (error) {
    sendHtml(response, 400, "Spotify authorization cancelled", "No changes were made. You can close this tab.");
    finish(1, `Spotify authorization failed: ${error}`);
    return;
  }
  if (!code || returnedState !== state) {
    sendHtml(response, 400, "Spotify authorization failed", "The callback was invalid or expired. You can close this tab.");
    finish(1, "Spotify authorization failed because the callback state was invalid.");
    return;
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      }),
      signal: AbortSignal.timeout(15_000)
    });
    const payload = await tokenResponse.json().catch(() => null);
    const refreshToken = typeof payload?.refresh_token === "string" ? payload.refresh_token.trim() : "";
    if (!tokenResponse.ok || !refreshToken) {
      throw new Error(`Spotify token exchange failed (HTTP ${tokenResponse.status}).`);
    }

    await upsertEnvValue(envPath, "SPOTIFY_REFRESH_TOKEN", refreshToken);
    sendHtml(response, 200, "Spotify connected", "Playlist authorization was saved. You can close this tab.");
    finish(0, "Spotify authorization saved to .env. Restart blunt38 to enable playlist links.");
  } catch (exchangeError) {
    sendHtml(response, 500, "Spotify authorization failed", "The token could not be saved. Check the terminal and try again.");
    finish(1, exchangeError instanceof Error ? exchangeError.message : "Spotify token exchange failed.");
  }
});

server.listen(port, redirectUrl.hostname, () => {
  console.info(`Spotify callback listening on ${redirectUri}`);
  console.info("Open this URL in your browser:");
  console.info(authorizeUrl.toString());
});

server.on("error", (error) => finish(1, error.message));

const timeout = setTimeout(() => {
  finish(1, "Spotify authorization timed out after 10 minutes.");
}, 10 * 60 * 1000);
timeout.unref();

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in ${envPath}.`);
  return value;
}

async function upsertEnvValue(path, key, value) {
  const source = await readFile(path, "utf8");
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const entry = `${key}=${JSON.stringify(value)}`;
  const lines = source.split(/\r?\n/);
  const existingIndex = lines.findIndex((line) => line.trimStart().startsWith(`${key}=`));

  if (existingIndex >= 0) {
    lines[existingIndex] = entry;
  } else {
    const secretIndex = lines.findIndex((line) => line.trimStart().startsWith("SPOTIFY_CLIENT_SECRET="));
    lines.splice(secretIndex >= 0 ? secretIndex + 1 : lines.length, 0, entry);
  }

  await writeFile(path, lines.join(newline), "utf8");
}

function sendHtml(response, status, title, message) {
  response.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  response.end(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><main><h1>${title}</h1><p>${message}</p></main></body></html>`);
}

function finish(exitCode, message) {
  if (completed) return;
  completed = true;
  clearTimeout(timeout);
  console[exitCode === 0 ? "info" : "error"](message);
  server.close(() => {
    process.exitCode = exitCode;
  });
}
