# Gates: repeat YouTube link recovery regression

Scope: Make a recovered YouTube link replay safely after stop and surface the real source failure instead of `All promises were rejected`.

- [x] G1: Automated tests reproduce nested `AggregateError` failures and prove the user receives the most useful underlying source error.
  CHECK: npm test
  EXPECT: /# pass [2-9][0-9]/
  EVIDENCE: Nested AggregateError regression test passed; full suite reported 26 passed and 0 failed.

- [x] G2: Automated tests prove recovery results can be cached with a safety-bounded TTL and cloned for the current requester on replay.
  CHECK: npm test
  EXPECT: /# fail 0/
  EVIDENCE: Recovery TTL boundary and requester-safe cache clone tests passed in the 26-test suite.

- [x] G3: Direct-link resolution caches successful yt-dlp recovery only within the resolver's safe audio expiry and never stores a playlist or already-expired stream.
  EVIDENCE: resolveYoutubeAudio attaches the five-minute-safety expiry; musicSearchResultCacheTtl caps TTL; resolveStandardPlayback requires non-playlist and TTL greater than zero before storing.

- [x] G4: The strict TypeScript check and production build pass.
  CHECK: npm run check
  EXPECT: /discord-premium-bot@0\.1\.0 check/
  EVIDENCE: npm run check exited 0; npm test invoked the production tsc build and exited 0.

- [x] G5: The regression patch passes the full test suite after implementation.
  CHECK: npm test
  EXPECT: /# fail 0/
  EVIDENCE: npm test reported 26 tests, 26 passed, 0 failed.

- [x] G6: The final diff has no whitespace errors or credential material and includes a safe VPS deploy-and-measure command.
  EVIDENCE: git diff --cached --check exited 0; STAGED_SECRET_SCAN_OK; final command uses ff-only pull, tests before restart, and redacted timing-log filters.
