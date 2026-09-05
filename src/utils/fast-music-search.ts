import type { SearchResult, TrackRequester, UnresolvedSearchResult } from "lavalink-client";

export type CacheableMusicSearchResult = SearchResult | UnresolvedSearchResult;

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

  return firstSuccessfulMusicPromise(candidates.map(async (candidate) => {
    const value = await candidate.run();
    if (!accepts(value)) throw new Error(`${candidate.sourceLabel} returned no acceptable tracks.`);
    return { sourceLabel: candidate.sourceLabel, value };
  }));
}

export async function firstSuccessfulMusicPromise<T>(promises: readonly Promise<T>[]): Promise<T> {
  if (!promises.length) throw new Error("No music search promises were provided.");

  try {
    return await Promise.any(promises);
  } catch (error) {
    throw mostUsefulMusicSearchError(error);
  }
}

// Every source participates from the start, including a warmed recovery source.
// A fast fallback must not wait for the primary-only deadline to expire.
export async function raceMusicSources<T>(
  candidates: readonly MusicSearchCandidate<T>[],
  accepts: (value: T) => boolean,
  fastTimeoutMs: number,
  recoveryTimeoutMs: number,
  onSlow: () => void = () => {}
): Promise<MusicSearchWinner<T>> {
  const race = firstAcceptableMusicResult(candidates, accepts);
  try {
    return await withinMusicSearchDeadline(race, fastTimeoutMs);
  } catch (error) {
    if (!(error instanceof MusicSearchDeadlineError)) throw error;
    onSlow();
    return withinMusicSearchDeadline(race, recoveryTimeoutMs);
  }
}

export function mostUsefulMusicSearchError(error: unknown): Error {
  const errors = flattenMusicSearchErrors(error);

  for (let index = errors.length - 1; index >= 0; index -= 1) {
    const candidate = errors[index]!;
    if (!/^All promises were rejected$/i.test(candidate.message)) return candidate;
  }

  return errors.at(-1) ?? new Error("No tracks found from the available music sources.");
}

function flattenMusicSearchErrors(error: unknown): Error[] {
  if (error instanceof AggregateError) return error.errors.flatMap(flattenMusicSearchErrors);
  if (error instanceof Error) return [error];
  return [new Error(String(error))];
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

  delete(key: string) {
    return this.entries.delete(key);
  }

  get size() {
    return this.entries.size;
  }
}

export function boundedRecoveryCacheTtl(expiresAt: unknown, configuredTtlMs: number, now = Date.now()) {
  const numericExpiry = typeof expiresAt === "number" ? expiresAt : Number(expiresAt);
  if (!Number.isFinite(numericExpiry)) return 0;

  const remainingMs = Math.floor(numericExpiry - now);
  if (remainingMs <= 0) return 0;
  return Math.min(Math.max(0, configuredTtlMs), remainingMs);
}

export function musicSearchResultCacheTtl(
  sourceLabel: string,
  streamExpiresAt: unknown,
  configuredTtlMs: number,
  now = Date.now()
) {
  if (sourceLabel !== "yt-dlp fallback") return Math.max(0, configuredTtlMs);
  return boundedRecoveryCacheTtl(streamExpiresAt, configuredTtlMs, now);
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
