import { execFile } from "node:child_process";
import { open, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { promisify } from "node:util";
import dotenv from "dotenv";

const runFile = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));

export function failureCategory(line) {
  if (/confirm.*not a bot|unusual traffic|bot.?check/i.test(line)) return "youtube-anti-bot";
  if (/\b429\b|rate.?limit/i.test(line)) return "source-rate-limit";
  if (/\b403\b|forbidden/i.test(line)) return "source-forbidden";
  if (/all clients failed|page needs to be reloaded/i.test(line)) return "youtube-clients-rejected";
  if (/timed?\s*out|timeout|stuck/i.test(line)) return "timeout-or-stuck";
  if (/ENETUNREACH|Network is unreachable|EHOSTUNREACH/i.test(line)) return "network-unreachable";
  if (/ECONNREFUSED|no lavalink node|Lavalink is not ready/i.test(line)) return "lavalink-unavailable";
  if (/oauth|authentication|sign.?in/i.test(line) && /fail|error|reject|expired/i.test(line)) return "source-authentication";
  return null;
}

// Only allowlisted facts leave this process. Raw log text, process environments,
// command stderr, titles, identifiers and URLs are deliberately never printed.
export function summarizeMusicLogs(raw) {
  const events = [];
  const failures = {};
  for (const line of raw.split(/\r?\n/)) {
    const category = failureCategory(line);
    if (category) failures[category] = (failures[category] ?? 0) + 1;
    const event = line.match(/\[music:(play|track-start|search|ytdlp|track-error|track-stuck|search-error|recovery|recovery-ytdlp-error|event-error|connect-error)\]/)?.[1];
    if (!event) continue;
    const record = { event };
    const timestamp = line.match(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/)?.[0];
    if (timestamp) record.time = timestamp;
    for (const name of ["setup", "connect", "search", "panel", "command", "ready", "lookup", "resolve", "total", "elapsed", "after"]) {
      const value = line.match(new RegExp(`\\b${name}=(\\d{1,8})ms\\b`))?.[1];
      if (value) record[`${name}Ms`] = Number(value);
    }
    const cache = line.match(/\bcache=(hit|miss)\b/)?.[1];
    if (cache) record.cache = cache;
    if (category) record.failure = category;
    events.push(record);
  }
  return { failures, recentEvents: events.slice(-30) };
}

async function command(executable, args) {
  try {
    const { stdout } = await runFile(executable, args, { cwd: root, timeout: 8_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    return stdout;
  } catch {
    return null;
  }
}

async function tail(path) {
  if (typeof path !== "string") return "";
  let file;
  try {
    file = await open(path, "r");
    const size = (await file.stat()).size;
    const start = Math.max(0, size - 256 * 1024);
    const buffer = Buffer.alloc(size - start);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, start);
    const text = buffer.subarray(0, bytesRead).toString("utf8");
    return (start ? text.slice(text.indexOf("\n") + 1) : text).split(/\r?\n/).slice(-200).join("\n");
  } catch {
    return "";
  } finally {
    await file?.close();
  }
}

async function main() {
  if (process.platform !== "linux") {
    console.log("Run this read-only diagnostic on the Linux VPS from /opt/blunt38. No bot is started or restarted.");
    return;
  }
  const diskEnv = dotenv.parse(await readFile(resolve(root, ".env")).catch(() => ""));
  const settings = { ...process.env, ...diskEnv };
  const [revision, pm2Json, service, journal, ipv6, ytVersion] = await Promise.all([
    command("git", ["rev-parse", "--short", "HEAD"]),
    command("pm2", ["jlist"]),
    command("systemctl", ["is-active", "lavalink"]),
    command("journalctl", ["-u", "lavalink", "--since", "10 minutes ago", "-n", "160", "--no-pager", "-o", "short-iso"]),
    command("ip", ["-6", "route", "show", "default"]),
    command(settings.MUSIC_YTDLP_PATH?.trim() || "yt-dlp", ["--ignore-config", "--version"])
  ]);
  let processInfo;
  try { processInfo = JSON.parse(pm2Json ?? "[]").find((item) => item.name === "blunt38-bot"); } catch {}
  const pm = processInfo?.pm2_env;
  const botLogs = await Promise.all([tail(pm?.pm_out_log_path), tail(pm?.pm_err_log_path)]);
  const family = settings.MUSIC_YTDLP_IP_FAMILY ?? "auto";
  const status = pm?.status;
  const report = {
    capturedAt: new Date().toISOString(),
    commit: /^[a-f0-9]{7,40}$/i.test(revision?.trim() ?? "") ? revision.trim() : "unavailable",
    node: process.version,
    botStatus: ["online", "stopped", "errored", "launching", "stopping"].includes(status) ? status : "unavailable",
    restartCount: Number.isSafeInteger(pm?.restart_time) ? pm.restart_time : null,
    lavalinkService: service?.trim() === "active" ? "active" : "not-active-or-unavailable",
    ipv6DefaultRoute: ipv6 === null ? "unavailable" : /\bdefault\b/.test(ipv6),
    ytDlpVersion: /^[0-9]{4}\.[0-9]{2}\.[0-9]{2}(?:[.\w-]*)?$/.test(ytVersion?.trim() ?? "") ? ytVersion.trim() : "unavailable",
    configuredIpFamily: ["auto", "ipv4", "ipv6"].includes(family) ? family : "invalid",
    ytDlpEnabledInConfig: settings.MUSIC_YTDLP_ENABLED === "true",
    botStdout: summarizeMusicLogs(botLogs[0]),
    botStderr: summarizeMusicLogs(botLogs[1]),
    lavalinkLogsAvailable: journal !== null,
    lavalinkLogs: summarizeMusicLogs(journal ?? ""),
    note: "Bot events are the last 200 lines per log, not necessarily recent or in chronological order. Lavalink covers the last 10 minutes. Failure counts are log lines, not unique failed songs. This does not verify audible playback."
  };
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error("Music diagnostics could not finish. No configuration was changed; raw errors were withheld to protect credentials.");
    process.exitCode = 1;
  });
}
