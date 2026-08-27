# Gates: ultra-fast music resolution

Scope: Make first-track resolution bounded and cacheable while preserving exact YouTube links, recovery behavior, and current Discord playback semantics.

- [x] G1: Automated tests prove the fastest successful source wins, empty/error sources are ignored, deadlines are bounded, and cached results are reusable without leaking requester state.
  CHECK: npm test
  EXPECT: /# pass [1-9][0-9]*/
  EVIDENCE: npm test completed with 24 tests, 24 passed, 0 failed.

- [x] G2: The TypeScript compiler accepts the implementation without emitting files.
  CHECK: npm run check
  EXPECT: /discord-premium-bot@0\.1\.0 check/
  EVIDENCE: > discord-premium-bot@0.1.0 check | > tsc --noEmit

- [x] G3: The production bot build completes successfully.
  CHECK: npm run build
  EXPECT: /discord-premium-bot@0\.1\.0 build/
  EVIDENCE: > discord-premium-bot@0.1.0 build | > tsc

- [x] G4: Text queries race only the two primary YouTube sources, use a strict configurable deadline, and fall back to SoundCloud only after the fast path misses.
  EVIDENCE: resolveTextPlayback starts primaryYoutubeSearchSources concurrently, applies MUSIC_FAST_SEARCH_TIMEOUT_MS, then races the still-running primary promise with SoundCloud.

- [x] G5: Direct YouTube URLs preserve exact-video matching, use bounded Lavalink resolution, and retain the existing yt-dlp recovery fallback.
  EVIDENCE: resolveDirectUrlPlayback races the URL and raw direct-video ID, accepts only the expected identifier, bounds both phases, and includes searchYoutubeWithYtDlp only in recovery.

- [x] G6: Successful non-playlist results are stored in a bounded TTL/LRU memory cache and returned with the current requester rather than the cached requester.
  EVIDENCE: TtlLruCache enforces expiry and max size; cloneCachedMusicSearchResult strips the stored requester and the requester-isolation test passes.

- [x] G7: Logs expose cache hit/miss, winning source, and search elapsed time without printing bot tokens, OAuth refresh tokens, or signed stream URLs.
  EVIDENCE: music:search emits cache, winner, and elapsed fields; safeMusicErrorMessage replaces every HTTP(S) URL with [redacted-url] before logging.

- [x] G8: The final diff has no whitespace errors or credential material, and deployment instructions include a rollback-safe pull/build/restart/health-check sequence.
  EVIDENCE: git diff --check exited 0; staged secret scan exited 0; final Termius sequence records the previous commit, uses ff-only pull, verifies before restart, and includes a detached-commit rollback.
