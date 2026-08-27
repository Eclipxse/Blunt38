export type MusicSearchCandidate<T> = {
  sourceLabel: string;
  run: () => Promise<T>;
};

export type MusicSearchWinner<T> = {
  sourceLabel: string;
  value: T;
};

export class MusicSearchDeadlineError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Music search exceeded the ${timeoutMs}ms deadline.`);
    this.name = "MusicSearchDeadlineError";
  }
}

export function firstAcceptableMusicResult<T>(
  candidates: readonly MusicSearchCandidate<T>[],
  accepts: (value: T) => boolean
): Promise<MusicSearchWinner<T>> {
  if (!candidates.length) return Promise.reject(new Error("No music search candidates were provided."));

  return Promise.any(candidates.map(async (candidate) => {
    const value = await candidate.run();
    if (!accepts(value)) throw new Error(`${candidate.sourceLabel} returned no acceptable tracks.`);
    return { sourceLabel: candidate.sourceLabel, value };
  }));
}

export async function withinMusicSearchDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const boundedTimeoutMs = Math.max(1, Math.round(timeoutMs));
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new MusicSearchDeadlineError(boundedTimeoutMs)), boundedTimeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

type TtlLruEntry<T> = {
  expiresAt: number;
  value: T;
};

export class TtlLruCache<T> {
  private readonly entries = new Map<string, TtlLruEntry<T>>();

  constructor(private readonly maxEntries: number) {}

  get(key: string, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, now = Date.now()) {
    this.entries.delete(key);
    this.entries.set(key, {
      expiresAt: now + Math.max(1, ttlMs),
      value
    });

    while (this.entries.size > Math.max(1, this.maxEntries)) {
      const oldest = this.entries.keys().next().value;
      if (typeof oldest !== "string") break;
      this.entries.delete(oldest);
    }
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}

export function cloneCachedMusicSearchResult(
  result: CacheableMusicSearchResult,
  requester?: TrackRequester
): CacheableMusicSearchResult {
  return {
    ...result,
    pluginInfo: { ...result.pluginInfo },
    playlist: result.playlist ? { ...result.playlist } : null,
    tracks: result.tracks.map((track) => ({
      ...track,
      info: { ...track.info },
      pluginInfo: { ...track.pluginInfo },
      userData: track.userData ? { ...track.userData } : undefined,
      requester
    }))
  } as CacheableMusicSearchResult;
}
import type { SearchResult, TrackRequester, UnresolvedSearchResult } from "lavalink-client";

export type CacheableMusicSearchResult = SearchResult | UnresolvedSearchResult;
