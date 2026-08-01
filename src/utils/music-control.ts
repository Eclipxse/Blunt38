export function parseSeekPosition(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }

  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }

  const numbers = parts.map(Number);
  const seconds = parts.length === 3
    ? numbers[0]! * 3600 + numbers[1]! * 60 + numbers[2]!
    : numbers[0]! * 60 + numbers[1]!;

  return seconds * 1000;
}

export function progressBar(positionMs: number, durationMs: number, width = 14) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "[live]";

  const safeWidth = Math.max(5, Math.min(30, Math.round(width)));
  const ratio = Math.max(0, Math.min(1, positionMs / durationMs));
  const marker = Math.min(safeWidth - 1, Math.floor(ratio * safeWidth));

  return `[${Array.from({ length: safeWidth }, (_, index) => index === marker ? "o" : index < marker ? "=" : "-").join("")}]`;
}

export function musicPageCount(trackCount: number, pageSize = 8) {
  return Math.max(1, Math.ceil(Math.max(0, trackCount) / pageSize));
}

export function clampMusicPage(page: number, trackCount: number, pageSize = 8) {
  return Math.max(0, Math.min(musicPageCount(trackCount, pageSize) - 1, Math.floor(page)));
}

export type MusicPlaybackEndState = "finished" | "failed" | "silent";

export function classifyMusicPlaybackEnd(eventType: string, reason?: string): MusicPlaybackEndState {
  if (eventType === "TrackExceptionEvent" || eventType === "TrackStuckEvent" || reason === "loadFailed") {
    return "failed";
  }

  if (reason === "stopped" || reason === "replaced" || reason === "cleanup") {
    return "silent";
  }

  return "finished";
}

const ignoredTrackWords = new Set([
  "official",
  "video",
  "music",
  "audio",
  "lyrics",
  "lyric",
  "visualizer",
  "remastered",
  "remaster",
  "youtube",
  "topic",
  "hd",
  "4k"
]);

const alternateVersionWords = new Set([
  "cover",
  "remix",
  "karaoke",
  "instrumental",
  "slowed",
  "reverb",
  "sped",
  "nightcore",
  "live"
]);

export function isConfidentMusicMatch(
  originalTitle: string,
  originalAuthor: string | undefined,
  candidateTitle: string,
  candidateAuthor: string | undefined
) {
  const titleTokens = trackIdentityTokens(originalTitle);
  if (!titleTokens.length) return false;

  const authorTokens = trackIdentityTokens(originalAuthor ?? "");
  const candidateTitleTokens = trackIdentityTokens(candidateTitle);
  const candidateTokens = new Set([
    ...candidateTitleTokens,
    ...trackIdentityTokens(candidateAuthor ?? "")
  ]);

  const titleCoverage = tokenCoverage(titleTokens, candidateTokens);
  const authorCoverage = authorTokens.length ? tokenCoverage(authorTokens, candidateTokens) : 1;
  const changedVersion = candidateTitleTokens.some((token) => {
    return alternateVersionWords.has(token) && !titleTokens.includes(token);
  });

  return titleCoverage >= 0.8 && authorCoverage >= 0.5 && !changedVersion;
}

function trackIdentityTokens(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token && !ignoredTrackWords.has(token));
}

function tokenCoverage(required: string[], candidate: Set<string>) {
  if (!required.length) return 1;
  return required.filter((token) => candidate.has(token)).length / required.length;
}
