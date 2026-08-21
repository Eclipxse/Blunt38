import { spawn } from "node:child_process";

const maxOutputBytes = 12 * 1024 * 1024;
const maxCacheEntries = 1_000;
const streamExpirySafetyMs = 5 * 60 * 1000;

type CachedYoutubeAudio = {
  value: ResolvedYoutubeAudio;
  expiresAt: number;
};

const audioCache = new Map<string, CachedYoutubeAudio>();
const pendingResolutions = new Map<string, Promise<ResolvedYoutubeAudio>>();

type YtDlpPayload = {
  id?: unknown;
  title?: unknown;
  channel?: unknown;
  uploader?: unknown;
  duration?: unknown;
  webpage_url?: unknown;
  original_url?: unknown;
  thumbnail?: unknown;
  url?: unknown;
  is_live?: unknown;
  requested_downloads?: Array<{ url?: unknown }>;
};

export type ResolvedYoutubeAudio = {
  id: string;
  title: string;
  author: string;
  durationMs: number;
  webpageUrl: string;
  artworkUrl: string | null;
  streamUrl: string;
  isLive: boolean;
};

export function shouldPreferYoutubeResolver(query: string) {
  try {
    const parsed = new URL(query);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

export function parseYtDlpPayload(output: string, fallbackQuery: string): ResolvedYoutubeAudio {
  const line = output.trim().split(/\r?\n/).filter(Boolean).at(-1);
  if (!line) throw new Error("yt-dlp returned no track information.");

  let payload: YtDlpPayload;
  try {
    payload = JSON.parse(line) as YtDlpPayload;
  } catch {
    throw new Error("yt-dlp returned invalid track information.");
  }

  const directUrl = stringValue(payload.url)
    ?? stringValue(payload.requested_downloads?.[0]?.url);
  if (!directUrl) throw new Error("yt-dlp found the video but did not return a playable audio URL.");

  const id = stringValue(payload.id) ?? "youtube";
  const title = stringValue(payload.title) ?? fallbackQuery;
  const author = stringValue(payload.channel) ?? stringValue(payload.uploader) ?? "YouTube";
  const duration = typeof payload.duration === "number" && Number.isFinite(payload.duration)
    ? Math.max(0, payload.duration)
    : 0;

  return {
    id,
    title,
    author,
    durationMs: Math.round(duration * 1000),
    webpageUrl: stringValue(payload.webpage_url) ?? stringValue(payload.original_url) ?? fallbackQuery,
    artworkUrl: stringValue(payload.thumbnail) ?? null,
    streamUrl: directUrl,
    isLive: payload.is_live === true
  };
}

export function getCachedYoutubeAudio(query: string, now = Date.now()) {
  const key = youtubeCacheKey(query);
  const cached = audioCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= now) {
    audioCache.delete(key);
    return null;
  }

  // Refresh insertion order so frequently used tracks survive bounded pruning.
  audioCache.delete(key);
  audioCache.set(key, cached);
  return cached.value;
}

export function youtubeAudioCacheExpiry(
  streamUrl: string,
  now: number,
  fallbackTtlMs: number
) {
  const fallbackExpiry = now + Math.max(0, fallbackTtlMs);

  try {
    const expireSeconds = Number.parseInt(new URL(streamUrl).searchParams.get("expire") ?? "", 10);
    if (!Number.isFinite(expireSeconds)) return fallbackExpiry;
    return Math.max(now, Math.min(fallbackExpiry, expireSeconds * 1000 - streamExpirySafetyMs));
  } catch {
    return fallbackExpiry;
  }
}

export async function resolveYoutubeAudio(input: {
  query: string;
  target?: string;
  executable: string;
  timeoutMs: number;
  cacheTtlMs: number;
}) {
  const target = input.target ?? (isUrl(input.query) ? input.query : `ytsearch1:${input.query}`);
  const lookupKeys = uniqueCacheKeys(input.query, target);

  for (const key of lookupKeys) {
    const cached = getCachedYoutubeAudioByKey(key);
    if (cached) return cached;
  }

  for (const key of lookupKeys) {
    const pending = pendingResolutions.get(key);
    if (pending) return pending;
  }

  const args = [
    "--ignore-config",
    "--force-ipv4",
    "--no-playlist",
    "--no-warnings",
    "--no-progress",
    "--socket-timeout", "10",
    "--retries", "1",
    "--extractor-retries", "1",
    "--js-runtimes", "node",
    "--format", "bestaudio[acodec=opus]/bestaudio/best",
    "--dump-json",
    "--skip-download",
    target
  ];

  const resolution = Promise.resolve().then(async () => {
    const output = await runYtDlp(input.executable, args, input.timeoutMs);
    const resolved = parseYtDlpPayload(output, input.query);
    const expiresAt = youtubeAudioCacheExpiry(resolved.streamUrl, Date.now(), input.cacheTtlMs);
    const cacheKeys = uniqueCacheKeys(
      input.query,
      target,
      resolved.id,
      resolved.webpageUrl
    );

    if (expiresAt > Date.now()) {
      for (const key of cacheKeys) audioCache.set(key, { value: resolved, expiresAt });
      pruneCache();
    }

    return resolved;
  });

  for (const key of lookupKeys) pendingResolutions.set(key, resolution);

  try {
    return await resolution;
  } finally {
    for (const key of lookupKeys) {
      if (pendingResolutions.get(key) === resolution) pendingResolutions.delete(key);
    }
  }
}

function getCachedYoutubeAudioByKey(key: string, now = Date.now()) {
  const cached = audioCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    audioCache.delete(key);
    return null;
  }

  audioCache.delete(key);
  audioCache.set(key, cached);
  return cached.value;
}

function uniqueCacheKeys(...values: string[]) {
  return [...new Set(values.map(youtubeCacheKey))];
}

function youtubeCacheKey(value: string) {
  const trimmed = value.trim();
  const videoId = youtubeVideoId(trimmed);
  if (videoId) return `video:${videoId}`;
  return `query:${trimmed.replace(/\s+/g, " ").toLowerCase()}`;
}

function youtubeVideoId(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0];
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      return parsed.searchParams.get("v")
        ?? (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/live/")
          ? parsed.pathname.split("/").filter(Boolean)[1]
          : null);
    }
  } catch {
    return null;
  }
  return null;
}

function pruneCache() {
  while (audioCache.size > maxCacheEntries) {
    const oldest = audioCache.keys().next().value;
    if (typeof oldest !== "string") return;
    audioCache.delete(oldest);
  }
}

function runYtDlp(executable: string, args: string[], timeoutMs: number) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let settled = false;

    const finish = (error?: Error, value?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value ?? "");
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error(`yt-dlp timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.once("error", (error) => {
      const detail = (error as NodeJS.ErrnoException).code === "ENOENT"
        ? `yt-dlp executable was not found at "${executable}".`
        : error.message;
      finish(new Error(detail));
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxOutputBytes) {
        child.kill("SIGKILL");
        finish(new Error("yt-dlp returned too much data."));
        return;
      }
      stdout.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (Buffer.concat(stderr).length < 64 * 1024) stderr.push(chunk);
    });

    child.once("close", (code) => {
      if (settled) return;
      if (code !== 0) {
        const detail = Buffer.concat(stderr).toString("utf8").trim().split(/\r?\n/).at(-1);
        finish(new Error(detail || `yt-dlp exited with code ${code ?? "unknown"}.`));
        return;
      }
      finish(undefined, Buffer.concat(stdout).toString("utf8"));
    });
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
