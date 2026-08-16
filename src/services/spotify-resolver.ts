type SpotifyInputKind = "track" | "playlist" | "album";

export type SpotifyInput = {
  kind: SpotifyInputKind;
  id: string;
  originalUrl: string;
};

export type SpotifyTrackMetadata = {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  isrc: string | null;
  artworkUrl: string | null;
  spotifyUrl: string;
  originalUrl: string;
  source: "spotify";
};

export type SpotifyResolvedInput = {
  kind: SpotifyInputKind;
  name: string;
  tracks: SpotifyTrackMetadata[];
  skippedTracks: number;
};

export type SpotifyResolverOptions = {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  cacheTtlMs: number;
  market?: string;
  fetcher?: typeof fetch;
  now?: () => number;
};

type SpotifyToken = {
  value: string;
  expiresAt: number;
};

type CachedSpotifyInput = {
  value: SpotifyResolvedInput;
  expiresAt: number;
};

type SpotifyArtist = {
  name?: unknown;
};

type SpotifyImage = {
  url?: unknown;
};

type SpotifyAlbum = {
  id?: unknown;
  name?: unknown;
  images?: SpotifyImage[];
  external_urls?: { spotify?: unknown };
};

type SpotifyTrack = {
  id?: unknown;
  name?: unknown;
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
  duration_ms?: unknown;
  external_ids?: { isrc?: unknown };
  external_urls?: { spotify?: unknown };
  is_local?: unknown;
  is_playable?: unknown;
  type?: unknown;
};

type SpotifyPlaylist = {
  name?: unknown;
};

type SpotifyPage<T> = {
  items?: T[];
  next?: unknown;
  total?: unknown;
};

type SpotifyPlaylistItem = {
  item?: SpotifyTrack | null;
  track?: SpotifyTrack | null;
};

const tokenCache = new Map<string, SpotifyToken>();
const metadataCache = new Map<string, CachedSpotifyInput>();
const maxCacheEntries = 500;
const tokenSafetyMs = 60_000;
const maxRateLimitWaitMs = 10_000;

export class SpotifyResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpotifyResolverError";
  }
}

export function parseSpotifyInput(input: string): SpotifyInput | null {
  try {
    const url = new URL(input.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "open.spotify.com") return null;

    const path = url.pathname.split("/").filter(Boolean);
    const kindIndex = path.findIndex((segment) => segment === "track" || segment === "playlist" || segment === "album");
    if (kindIndex < 0) return null;

    const kind = path[kindIndex] as SpotifyInputKind;
    const id = path[kindIndex + 1] ?? "";
    if (!/^[A-Za-z0-9]{22}$/.test(id)) return null;

    return { kind, id, originalUrl: input.trim() };
  } catch {
    return null;
  }
}

export async function resolveSpotifyInput(input: SpotifyInput, options: SpotifyResolverOptions): Promise<SpotifyResolvedInput> {
  const now = options.now ?? Date.now;
  const cacheKey = `${input.kind}:${input.id}:${normalizeMarket(options.market) ?? "global"}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && cached.expiresAt > now()) {
    metadataCache.delete(cacheKey);
    metadataCache.set(cacheKey, cached);
    return cached.value;
  }
  if (cached) metadataCache.delete(cacheKey);

  console.info(`[music:spotify] detected kind=${input.kind}`);
  const value = input.kind === "track"
    ? await resolveTrack(input, options)
    : input.kind === "playlist"
      ? await resolvePlaylist(input, options)
      : await resolveAlbum(input, options);

  const expiresAt = now() + Math.max(60_000, options.cacheTtlMs);
  metadataCache.set(cacheKey, { value, expiresAt });
  pruneMetadataCache();
  return value;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length);
  const workerCount = Math.max(1, Math.min(items.length || 1, Math.floor(concurrency) || 1));
  let nextIndex = 0;

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]!, index);
    }
  }));

  return results;
}

export function spotifySearchQueries(track: SpotifyTrackMetadata) {
  return [...new Set([
    `${track.artist} - ${track.title}`.trim(),
    `${track.title} ${track.artist}`.trim()
  ])];
}

export function resetSpotifyResolverCaches() {
  tokenCache.clear();
  metadataCache.clear();
}

async function resolveTrack(input: SpotifyInput, options: SpotifyResolverOptions): Promise<SpotifyResolvedInput> {
  const payload = await spotifyRequest<SpotifyTrack>(`/tracks/${input.id}`, options);
  const track = toTrackMetadata(payload, input.originalUrl);
  if (!track) throw new SpotifyResolverError("That Spotify track is unavailable in this region or cannot be played.");

  console.info(`[music:spotify] track=${JSON.stringify(`${track.artist} - ${track.title}`)}`);
  return { kind: "track", name: track.title, tracks: [track], skippedTracks: 0 };
}

async function resolvePlaylist(input: SpotifyInput, options: SpotifyResolverOptions): Promise<SpotifyResolvedInput> {
  const playlist = await spotifyRequest<SpotifyPlaylist>(`/playlists/${input.id}`, options);
  const items = await spotifyPagedRequest<SpotifyPlaylistItem>(`/playlists/${input.id}/items`, options);
  const tracks = items
    .map((item) => toTrackMetadata(item.item ?? item.track ?? {}, input.originalUrl))
    .filter((track): track is SpotifyTrackMetadata => Boolean(track));

  const name = stringValue(playlist.name) ?? "Spotify playlist";
  const skippedTracks = Math.max(0, items.length - tracks.length);
  if (!tracks.length) throw new SpotifyResolverError("That Spotify playlist has no playable public tracks.");

  console.info(`[music:spotify] playlist=${JSON.stringify(name)} tracks=${tracks.length} skipped=${skippedTracks}`);
  return { kind: "playlist", name, tracks, skippedTracks };
}

async function resolveAlbum(input: SpotifyInput, options: SpotifyResolverOptions): Promise<SpotifyResolvedInput> {
  const album = await spotifyRequest<SpotifyAlbum>(`/albums/${input.id}`, options);
  const items = await spotifyPagedRequest<SpotifyTrack>(`/albums/${input.id}/tracks`, options);
  const tracks = items
    .map((item) => toTrackMetadata({ ...item, album }, input.originalUrl))
    .filter((track): track is SpotifyTrackMetadata => Boolean(track));

  const name = stringValue(album.name) ?? "Spotify album";
  const skippedTracks = Math.max(0, items.length - tracks.length);
  if (!tracks.length) throw new SpotifyResolverError("That Spotify album has no playable public tracks.");

  console.info(`[music:spotify] album=${JSON.stringify(name)} tracks=${tracks.length} skipped=${skippedTracks}`);
  return { kind: "album", name, tracks, skippedTracks };
}

function toTrackMetadata(track: SpotifyTrack, originalUrl: string): SpotifyTrackMetadata | null {
  if (track.type && track.type !== "track") return null;
  if (track.is_local === true || track.is_playable === false) return null;

  const id = stringValue(track.id);
  const title = stringValue(track.name);
  const artists = (track.artists ?? [])
    .map((artist) => stringValue(artist.name))
    .filter((artist): artist is string => Boolean(artist));
  if (!id || !title || !artists.length) return null;

  const album = stringValue(track.album?.name) ?? "Spotify";
  const durationMs = typeof track.duration_ms === "number" && Number.isFinite(track.duration_ms)
    ? Math.max(0, Math.round(track.duration_ms))
    : 0;
  const spotifyUrl = stringValue(track.external_urls?.spotify) ?? `https://open.spotify.com/track/${id}`;

  return {
    spotifyId: id,
    title,
    artist: artists.join(", "),
    album,
    durationMs,
    isrc: stringValue(track.external_ids?.isrc) ?? null,
    artworkUrl: firstArtworkUrl(track.album?.images),
    spotifyUrl,
    originalUrl,
    source: "spotify"
  };
}

async function spotifyPagedRequest<T>(path: string, options: SpotifyResolverOptions) {
  const items: T[] = [];
  let offset = 0;

  while (true) {
    const page = await spotifyRequest<SpotifyPage<T>>(`${path}?limit=50&offset=${offset}`, options);
    const pageItems = Array.isArray(page.items) ? page.items : [];
    items.push(...pageItems);

    const total = typeof page.total === "number" && Number.isFinite(page.total) ? page.total : undefined;
    const hasNext = typeof page.next === "string" && page.next.length > 0;
    if (!hasNext || !pageItems.length || (total !== undefined && items.length >= total)) {
      break;
    }
    offset += pageItems.length;
  }

  return items;
}

async function spotifyRequest<T>(path: string, options: SpotifyResolverOptions): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  let response = await spotifyRequestWithToken(path, options, fetcher, false);

  if (response.status === 401) {
    const credentials = spotifyCredentials(options);
    tokenCache.delete(spotifyTokenCacheKey(credentials.clientId, options.refreshToken));
    response = await spotifyRequestWithToken(path, options, fetcher, true);
  }

  if (response.status === 429) {
    await waitForRateLimit(response);
    response = await spotifyRequestWithToken(path, options, fetcher, false);
  }

  if (response.status === 401 && path.includes("/playlists/") && !options.refreshToken?.trim()) {
    throw new SpotifyResolverError(
      "Spotify playlist links need one-time user authorization. Run npm run spotify:authorize, then restart the bot."
    );
  }

  return parseSpotifyResponse<T>(response);
}

async function spotifyRequestWithToken(
  path: string,
  options: SpotifyResolverOptions,
  fetcher: typeof fetch,
  forceTokenRefresh: boolean
) {
  const token = await spotifyAccessToken(options, fetcher, forceTokenRefresh);
  return spotifyFetch(fetcher, spotifyApiUrl(path, options.market), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000)
  });
}

async function spotifyAccessToken(options: SpotifyResolverOptions, fetcher: typeof fetch, forceRefresh: boolean) {
  const credentials = spotifyCredentials(options);
  const now = options.now ?? Date.now;
  const refreshToken = options.refreshToken?.trim();
  const cacheKey = spotifyTokenCacheKey(credentials.clientId, refreshToken);
  const cached = tokenCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > now()) return cached.value;

  const authorization = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const tokenBody = refreshToken
    ? new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
    : new URLSearchParams({ grant_type: "client_credentials" });
  let response = await spotifyFetch(fetcher, "https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenBody,
    signal: AbortSignal.timeout(15_000)
  });

  if (response.status === 429) {
    await waitForRateLimit(response);
    response = await spotifyFetch(fetcher, "https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: tokenBody,
      signal: AbortSignal.timeout(15_000)
    });
  }

  if (!response.ok) {
    if (refreshToken) {
      throw new SpotifyResolverError(
        "Spotify user authorization expired or was revoked. Run npm run spotify:authorize again."
      );
    }
    throw new SpotifyResolverError("Spotify authentication failed. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.");
  }

  const payload = await response.json().catch(() => null) as { access_token?: unknown; expires_in?: unknown } | null;
  const value = stringValue(payload?.access_token);
  const expiresInSeconds = typeof payload?.expires_in === "number" && Number.isFinite(payload.expires_in)
    ? payload.expires_in
    : 0;
  if (!value || expiresInSeconds <= 0) throw new SpotifyResolverError("Spotify returned an invalid access token response.");

  tokenCache.set(cacheKey, {
    value,
    expiresAt: now() + Math.max(1_000, expiresInSeconds * 1_000 - tokenSafetyMs)
  });
  return value;
}

async function parseSpotifyResponse<T>(response: Response): Promise<T> {
  if (response.status === 429) throw rateLimitError(response);
  if (response.status === 404) throw new SpotifyResolverError("That Spotify item is unavailable, private, or deleted.");
  if (response.status === 401) throw new SpotifyResolverError("Spotify rejected the access token. Check the configured Spotify credentials.");
  if (response.status >= 500) throw new SpotifyResolverError("Spotify is unavailable right now. Try again shortly.");
  if (!response.ok) throw new SpotifyResolverError(`Spotify request failed (HTTP ${response.status}).`);

  return response.json() as Promise<T>;
}

function spotifyCredentials(options: SpotifyResolverOptions) {
  const clientId = options.clientId?.trim();
  const clientSecret = options.clientSecret?.trim();
  if (!clientId || !clientSecret) {
    throw new SpotifyResolverError("Spotify is not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env, then restart the bot.");
  }
  return { clientId, clientSecret };
}

function spotifyTokenCacheKey(clientId: string, refreshToken?: string) {
  return `${clientId}:${refreshToken?.trim() ? "user" : "app"}`;
}

function spotifyApiUrl(path: string, market?: string) {
  const url = new URL(`https://api.spotify.com/v1${path}`);
  const normalizedMarket = normalizeMarket(market);
  if (normalizedMarket) url.searchParams.set("market", normalizedMarket);
  return url;
}

function normalizeMarket(value?: string) {
  const market = value?.trim().toUpperCase();
  return market && /^[A-Z]{2}$/.test(market) ? market : undefined;
}

function firstArtworkUrl(images?: SpotifyImage[]) {
  for (const image of images ?? []) {
    const value = stringValue(image.url);
    if (value) return value;
  }
  return null;
}

function rateLimitError(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  return new SpotifyResolverError(
    retryAfter ? `Spotify is rate limiting requests. Try again in about ${retryAfter} seconds.` : "Spotify is rate limiting requests. Try again shortly."
  );
}

async function spotifyFetch(fetcher: typeof fetch, input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetcher(input, init);
  } catch (error) {
    console.warn("[music:spotify-network-error]", error instanceof Error ? error.message : error);
    throw new SpotifyResolverError("Spotify could not be reached. Check the bot's network connection and try again.");
  }
}

async function waitForRateLimit(response: Response) {
  const retryAfterSeconds = Number.parseFloat(response.headers.get("retry-after") ?? "");
  const waitMs = Number.isFinite(retryAfterSeconds)
    ? Math.max(0, Math.min(maxRateLimitWaitMs, Math.ceil(retryAfterSeconds * 1_000)))
    : 1_000;

  console.warn(`[music:spotify-rate-limit] retrying in ${waitMs}ms`);
  await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
}

function pruneMetadataCache() {
  while (metadataCache.size > maxCacheEntries) {
    const oldest = metadataCache.keys().next().value;
    if (typeof oldest !== "string") return;
    metadataCache.delete(oldest);
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
