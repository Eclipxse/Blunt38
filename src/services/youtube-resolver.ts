import { spawn } from "node:child_process";

const maxOutputBytes = 12 * 1024 * 1024;

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

export function shouldResolveYoutubeInput(query: string) {
  try {
    const parsed = new URL(query);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com");
  } catch {
    return true;
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

export async function resolveYoutubeAudio(input: {
  query: string;
  executable: string;
  timeoutMs: number;
}) {
  const target = isUrl(input.query) ? input.query : `ytsearch1:${input.query}`;
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

  const output = await runYtDlp(input.executable, args, input.timeoutMs);
  return parseYtDlpPayload(output, input.query);
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
