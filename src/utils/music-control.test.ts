import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMusicPlaybackEnd,
  clampMusicPage,
  isConfidentMusicMatch,
  musicPageCount,
  parseSeekPosition,
  progressBar
} from "./music-control.js";
import {
  isYoutubeUrl,
  parseYtDlpPayload,
  youtubeAudioCacheExpiry
} from "../services/youtube-resolver.js";
import {
  mapWithConcurrency,
  parseSpotifyInput,
  resetSpotifyResolverCaches,
  resolveSpotifyInput
} from "../services/spotify-resolver.js";

test("parseSeekPosition accepts seconds and timestamps", () => {
  assert.equal(parseSeekPosition("90"), 90_000);
  assert.equal(parseSeekPosition("1:30"), 90_000);
  assert.equal(parseSeekPosition("1:02:03"), 3_723_000);
  assert.equal(parseSeekPosition("nah"), null);
});

test("progressBar clamps its marker", () => {
  assert.equal(progressBar(0, 1000, 5), "[o----]");
  assert.equal(progressBar(1000, 1000, 5), "[====o]");
});

test("queue page helpers handle empty and overflowing pages", () => {
  assert.equal(musicPageCount(0), 1);
  assert.equal(musicPageCount(17), 3);
  assert.equal(clampMusicPage(9, 17), 2);
  assert.equal(clampMusicPage(-2, 17), 0);
});

test("playback end classification separates failures from normal endings", () => {
  assert.equal(classifyMusicPlaybackEnd("TrackEndEvent", "finished"), "finished");
  assert.equal(classifyMusicPlaybackEnd("TrackEndEvent", "loadFailed"), "failed");
  assert.equal(classifyMusicPlaybackEnd("TrackExceptionEvent"), "failed");
  assert.equal(classifyMusicPlaybackEnd("TrackStuckEvent"), "failed");
  assert.equal(classifyMusicPlaybackEnd("TrackEndEvent", "stopped"), "silent");
  assert.equal(classifyMusicPlaybackEnd("TrackEndEvent", "cleanup"), "silent");
});

test("music recovery only accepts the requested title and artist", () => {
  assert.equal(
    isConfidentMusicMatch(
      "Coldplay - Yellow (Official Video)",
      "Coldplay",
      "Coldplay - Yellow",
      "Coldplay"
    ),
    true
  );
  assert.equal(
    isConfidentMusicMatch(
      "Coldplay - Yellow (Official Video)",
      "Coldplay",
      "Yellow - acoustic cover",
      "Random Uploads"
    ),
    false
  );
  assert.equal(
    isConfidentMusicMatch(
      "Coldplay - Yellow (Official Video)",
      "Coldplay",
      "Billie Jean",
      "Michael Jackson"
    ),
    false
  );
});

test("YouTube URL detection accepts direct and privacy-enhanced links only", () => {
  assert.equal(isYoutubeUrl("Coldplay Yellow"), false);
  assert.equal(isYoutubeUrl("https://youtu.be/yKNxeF4KMsY"), true);
  assert.equal(isYoutubeUrl("https://music.youtube.com/watch?v=yKNxeF4KMsY"), true);
  assert.equal(isYoutubeUrl("https://www.youtube-nocookie.com/embed/yKNxeF4KMsY"), true);
  assert.equal(isYoutubeUrl("https://open.spotify.com/track/example"), false);
});

test("yt-dlp payload parser preserves exact YouTube metadata", () => {
  const resolved = parseYtDlpPayload(JSON.stringify({
    id: "yKNxeF4KMsY",
    title: "Yellow",
    channel: "Coldplay",
    duration: 266.4,
    webpage_url: "https://www.youtube.com/watch?v=yKNxeF4KMsY",
    thumbnail: "https://i.ytimg.com/vi/yKNxeF4KMsY/hqdefault.jpg",
    url: "https://example.googlevideo.com/audio",
    is_live: false
  }), "Coldplay Yellow");

  assert.equal(resolved.id, "yKNxeF4KMsY");
  assert.equal(resolved.title, "Yellow");
  assert.equal(resolved.author, "Coldplay");
  assert.equal(resolved.durationMs, 266_400);
  assert.equal(resolved.streamUrl, "https://example.googlevideo.com/audio");
});

test("yt-dlp payload parser rejects responses without audio", () => {
  assert.throws(
    () => parseYtDlpPayload('{"id":"missing"}', "missing"),
    /playable audio URL/
  );
});

test("yt-dlp cache never outlives the configured TTL", () => {
  const now = 1_800_000_000_000;
  const streamUrl = `https://example.googlevideo.com/audio?expire=${Math.floor((now + 6 * 60 * 60 * 1000) / 1000)}`;

  assert.equal(youtubeAudioCacheExpiry(streamUrl, now, 2 * 60 * 60 * 1000), now + 2 * 60 * 60 * 1000);
});

test("yt-dlp cache expires before the signed stream URL", () => {
  const now = 1_800_000_000_000;
  const signedExpiry = now + 60 * 60 * 1000;
  const streamUrl = `https://example.googlevideo.com/audio?expire=${Math.floor(signedExpiry / 1000)}`;

  assert.equal(youtubeAudioCacheExpiry(streamUrl, now, 2 * 60 * 60 * 1000), signedExpiry - 5 * 60 * 1000);
  assert.equal(youtubeAudioCacheExpiry("https://audio.example/stream", now, 30_000), now + 30_000);
});

test("Spotify URL detection accepts tracks, albums, playlists, and locale URLs", () => {
  assert.deepEqual(parseSpotifyInput("https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=test"), {
    kind: "track",
    id: "3n3Ppam7vgaVa1iaRUc9Lp",
    originalUrl: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=test"
  });
  assert.equal(parseSpotifyInput("https://open.spotify.com/intl-de/album/4aawyAB9vmqN3uQ7FjRGTy" )?.kind, "album");
  assert.equal(parseSpotifyInput("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")?.kind, "playlist");
  assert.equal(parseSpotifyInput("https://example.com/track/3n3Ppam7vgaVa1iaRUc9Lp"), null);
  assert.equal(parseSpotifyInput("https://open.spotify.com/track/not-a-spotify-id"), null);
});

test("Spotify track metadata uses cached client credentials and metadata", async () => {
  resetSpotifyResolverCaches();
  let tokenRequests = 0;
  let trackRequests = 0;
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "https://accounts.spotify.com/api/token") {
      tokenRequests += 1;
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 });
    }
    if (url.startsWith("https://api.spotify.com/v1/tracks/3n3Ppam7vgaVa1iaRUc9Lp")) {
      trackRequests += 1;
      return new Response(JSON.stringify({
        id: "3n3Ppam7vgaVa1iaRUc9Lp",
        name: "Mr. Brightside",
        artists: [{ name: "The Killers" }],
        album: { name: "Hot Fuss", images: [{ url: "https://image.example/cover.jpg" }] },
        duration_ms: 222_075,
        external_ids: { isrc: "USIS70400990" },
        external_urls: { spotify: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp" }
      }), { status: 200 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const input = parseSpotifyInput("https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp");
  assert.ok(input);

  const options = { clientId: "client", clientSecret: "secret", cacheTtlMs: 3_600_000, fetcher };
  const first = await resolveSpotifyInput(input, options);
  const second = await resolveSpotifyInput(input, options);

  assert.equal(first.tracks[0]?.title, "Mr. Brightside");
  assert.equal(first.tracks[0]?.artist, "The Killers");
  assert.equal(first.tracks[0]?.isrc, "USIS70400990");
  assert.equal(second.tracks[0]?.album, "Hot Fuss");
  assert.equal(tokenRequests, 1);
  assert.equal(trackRequests, 1);
});

test("Spotify retries one rate-limited metadata request", async () => {
  resetSpotifyResolverCaches();
  let trackRequests = 0;
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "https://accounts.spotify.com/api/token") {
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 });
    }
    if (url.startsWith("https://api.spotify.com/v1/tracks/3n3Ppam7vgaVa1iaRUc9Lp")) {
      trackRequests += 1;
      if (trackRequests === 1) return new Response(null, { status: 429, headers: { "retry-after": "0" } });
      return new Response(JSON.stringify({
        id: "3n3Ppam7vgaVa1iaRUc9Lp",
        name: "Recovered",
        artists: [{ name: "Artist" }],
        duration_ms: 100_000
      }), { status: 200 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const input = parseSpotifyInput("https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp");
  assert.ok(input);

  const resolved = await resolveSpotifyInput(input, {
    clientId: "client",
    clientSecret: "secret",
    cacheTtlMs: 3_600_000,
    fetcher
  });

  assert.equal(resolved.tracks[0]?.title, "Recovered");
  assert.equal(trackRequests, 2);
});

test("Spotify playlists preserve order and skip unavailable entries", async () => {
  resetSpotifyResolverCaches();
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "https://accounts.spotify.com/api/token") {
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 });
    }
    if (url === "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M") {
      return new Response(JSON.stringify({ name: "Daily Mix" }), { status: 200 });
    }
    if (url.includes("/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/items?limit=50&offset=0")) {
      return new Response(JSON.stringify({
        total: 3,
        next: "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/items?limit=50&offset=2",
        items: [
          { item: { id: "3n3Ppam7vgaVa1iaRUc9Lp", name: "First", artists: [{ name: "Artist" }], duration_ms: 120_000 } },
          { item: { id: "4uLU6hMCjMI75M1A2tKUQC", name: "Local", artists: [{ name: "Artist" }], is_local: true } }
        ]
      }), { status: 200 });
    }
    if (url.includes("/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/items?limit=50&offset=2")) {
      return new Response(JSON.stringify({
        total: 3,
        next: null,
        items: [{ item: { id: "0VjIjW4GlUZAMYd2vXMi3b", name: "Second", artists: [{ name: "Artist" }], duration_ms: 180_000 } }]
      }), { status: 200 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const input = parseSpotifyInput("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
  assert.ok(input);

  const resolved = await resolveSpotifyInput(input, {
    clientId: "client",
    clientSecret: "secret",
    cacheTtlMs: 3_600_000,
    fetcher
  });

  assert.deepEqual(resolved.tracks.map((track) => track.title), ["First", "Second"]);
  assert.equal(resolved.skippedTracks, 1);
});

test("Spotify playlist authorization uses the configured refresh token", async () => {
  resetSpotifyResolverCaches();
  const tokenBodies: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://accounts.spotify.com/api/token") {
      tokenBodies.push(String(init?.body));
      return new Response(JSON.stringify({ access_token: "user-token", expires_in: 3600 }), { status: 200 });
    }
    if (url === "https://api.spotify.com/v1/playlists/5lzszfSoySkXHw6Fatyssc") {
      return new Response(JSON.stringify({ name: "Authorized playlist" }), { status: 200 });
    }
    if (url.includes("/v1/playlists/5lzszfSoySkXHw6Fatyssc/items?limit=50&offset=0")) {
      return new Response(JSON.stringify({
        total: 1,
        next: null,
        items: [{ item: { id: "3n3Ppam7vgaVa1iaRUc9Lp", name: "First", artists: [{ name: "Artist" }], duration_ms: 120_000 } }]
      }), { status: 200 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const input = parseSpotifyInput("https://open.spotify.com/playlist/5lzszfSoySkXHw6Fatyssc");
  assert.ok(input);

  const resolved = await resolveSpotifyInput(input, {
    clientId: "client",
    clientSecret: "secret",
    refreshToken: "refresh-token",
    cacheTtlMs: 3_600_000,
    fetcher
  });

  assert.equal(resolved.tracks[0]?.title, "First");
  assert.ok(tokenBodies.some((body) => /grant_type=refresh_token/.test(body)));
  assert.ok(tokenBodies.some((body) => /refresh_token=refresh-token/.test(body)));
});

test("Spotify public playlists fall back to embed metadata when API access is restricted", async () => {
  resetSpotifyResolverCaches();
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "https://accounts.spotify.com/api/token") {
      return new Response(JSON.stringify({ access_token: "app-token", expires_in: 3600 }), { status: 200 });
    }
    if (url === "https://api.spotify.com/v1/playlists/5lzszfSoySkXHw6Fatyssc") {
      return new Response(JSON.stringify({ name: "Needs authorization" }), { status: 200 });
    }
    if (url.includes("/v1/playlists/5lzszfSoySkXHw6Fatyssc/items?limit=50&offset=0")) {
      return new Response(JSON.stringify({ error: { status: 401, message: "Valid user authentication required" } }), { status: 401 });
    }
    if (url === "https://open.spotify.com/embed/playlist/5lzszfSoySkXHw6Fatyssc") {
      return new Response([
        '<script id="__NEXT_DATA__" type="application/json">',
        JSON.stringify({
          props: {
            pageProps: {
              state: {
                data: {
                  entity: {
                    name: "Public embed playlist",
                    trackList: [{
                      uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
                      title: "Embedded track",
                      subtitle: "Artist One,Artist Two",
                      duration: 120_000,
                      isPlayable: true,
                      entityType: "track"
                    }]
                  }
                }
              }
            }
          }
        }),
        "</script>"
      ].join(""), { status: 200, headers: { "content-type": "text/html" } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const input = parseSpotifyInput("https://open.spotify.com/playlist/5lzszfSoySkXHw6Fatyssc");
  assert.ok(input);

  const resolved = await resolveSpotifyInput(input, {
    clientId: "client",
    clientSecret: "secret",
    cacheTtlMs: 3_600_000,
    fetcher
  });

  assert.equal(resolved.name, "Public embed playlist");
  assert.equal(resolved.tracks[0]?.title, "Embedded track");
  assert.equal(resolved.tracks[0]?.artist, "Artist One, Artist Two");
});

test("Spotify playlist work respects the configured concurrency and keeps source order", async () => {
  let active = 0;
  let peak = 0;
  const output = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, value % 2 ? 8 : 2));
    active -= 1;
    return value * 10;
  });

  assert.equal(peak, 2);
  assert.deepEqual(output, [10, 20, 30, 40, 50]);
});

test("Spotify reports missing credentials without attempting an API request", async () => {
  resetSpotifyResolverCaches();
  const input = parseSpotifyInput("https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp");
  assert.ok(input);
  await assert.rejects(
    () => resolveSpotifyInput(input, { cacheTtlMs: 60_000 }),
    /Spotify is not configured/
  );
});
