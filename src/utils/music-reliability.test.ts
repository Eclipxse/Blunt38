import assert from "node:assert/strict";
import test from "node:test";
import { raceMusicSources, MusicSearchDeadlineError } from "./fast-music-search.js";
import { friendlyPlaybackFailure, MusicRecoveryJobs } from "./music-recovery.js";
import { getCachedYoutubeAudio, invalidateCachedYoutubeAudio, resolveYoutubeAudio, youtubeVideoId } from "../services/youtube-resolver.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("a ready yt-dlp fallback wins without waiting for the Lavalink deadline", async () => {
  const primary = deferred<string>();
  let slowWarnings = 0;
  const result = await raceMusicSources([
    { sourceLabel: "Lavalink", run: () => primary.promise },
    { sourceLabel: "yt-dlp", run: async () => "exact-video" }
  ], Boolean, 100, 100, () => slowWarnings++);
  assert.equal(result.sourceLabel, "yt-dlp");
  assert.equal(slowWarnings, 0);
  // The losing branch is still observed: a late error is not unhandled.
  primary.reject(new Error("late Lavalink failure"));
  await new Promise((resolve) => setImmediate(resolve));
});

test("a primary failure does not reject a pending successful fallback", async () => {
  const result = await raceMusicSources([
    { sourceLabel: "primary", run: async () => { throw new Error("primary rejected"); } },
    { sourceLabel: "fallback", run: async () => "video" }
  ], Boolean, 100, 100);
  assert.equal(result.value, "video");
});

test("wrong-video candidates cannot win the exact-link race", async () => {
  const result = await raceMusicSources([
    { sourceLabel: "wrong", run: async () => "different-id" },
    { sourceLabel: "right", run: async () => "expected-id" }
  ], (id) => id === "expected-id", 100, 100);
  assert.equal(result.sourceLabel, "right");
});

test("slow fallback keeps its recovery budget without starting duplicate work", async () => {
  let calls = 0;
  const fallback = deferred<string>();
  const result = await raceMusicSources([
    { sourceLabel: "fallback", run: () => { calls++; return fallback.promise; } }
  ], Boolean, 1, 100, () => fallback.resolve("ready"));
  assert.equal(result.value, "ready");
  assert.equal(calls, 1);
});

test("hung sources are bounded and all-source failures expose the useful cause", async () => {
  await assert.rejects(raceMusicSources([
    { sourceLabel: "hung", run: () => new Promise<string>(() => {}) }
  ], Boolean, 1, 1), MusicSearchDeadlineError);
  await assert.rejects(raceMusicSources([
    { sourceLabel: "broken", run: async () => { throw new Error("Sign in to confirm you are not a bot"); } }
  ], Boolean, 100, 100), /confirm you are not a bot/);
});

test("duplicate track errors share one recovery job", () => {
  const jobs = new MusicRecoveryJobs();
  const player = {};
  const job = jobs.begin(player, "track-a")!;
  assert.equal(jobs.begin(player, "track-a"), null);
  assert.equal(jobs.isCurrent(player, job), true);
});

test("stopping during recovery prevents the delayed result from starting playback", async () => {
  const jobs = new MusicRecoveryJobs();
  const player = {};
  const job = jobs.begin(player, "track-a")!;
  const source = deferred<string>();
  const plays: string[] = [];
  const recovering = source.promise.then((track) => {
    if (jobs.isCurrent(player, job)) plays.push(track);
  });
  jobs.cancel(player);
  source.resolve("old-song");
  await recovering;
  assert.deepEqual(plays, []);
});

test("old recovery cleanup cannot cancel replay or a newer track's recovery", () => {
  const jobs = new MusicRecoveryJobs();
  const player = {};
  const oldJob = jobs.begin(player, "same-song")!;
  jobs.cancel(player);
  const replayJob = jobs.begin(player, "same-song")!;
  jobs.finish(player, oldJob);
  assert.equal(jobs.isCurrent(player, replayJob), true);
  const nextJob = jobs.begin(player, "next-song")!;
  jobs.finish(player, replayJob);
  assert.equal(jobs.isCurrent(player, nextJob), true);
  jobs.finish(player, nextJob);
  assert.equal(jobs.has(player), false);
});

test("recovery jobs are isolated between guild players", () => {
  const jobs = new MusicRecoveryJobs();
  const a = {};
  const b = {};
  jobs.begin(a, "same-song");
  const other = jobs.begin(b, "same-song")!;
  jobs.cancel(a);
  assert.equal(jobs.isCurrent(b, other), true);
});

const input = { executable: "unused-in-tests", timeoutMs: 100, cacheTtlMs: 60_000 };
function payload(id: string) {
  return JSON.stringify({ id, title: "Same song", webpage_url: `https://www.youtube.com/watch?v=${id}`, url: "https://audio.example.test/stream" });
}

test("exact YouTube recovery ignores a different upload cached under its title", async () => {
  await resolveYoutubeAudio({ ...input, query: "cache-identity-regression" }, async () => payload("cachedAAAAA"));
  let calls = 0;
  const result = await resolveYoutubeAudio({ ...input, query: "cache-identity-regression", target: "https://youtu.be/exactBBBBBB" },
    async () => { calls++; return payload("exactBBBBBB"); });
  assert.equal(result.id, "exactBBBBBB");
  assert.equal(calls, 1);
});

test("exact links do not join an in-flight title search for another video", async () => {
  const titleResult = deferred<string>();
  const titleSearch = resolveYoutubeAudio({ ...input, query: "pending-identity-regression" }, () => titleResult.promise);
  const exact = await resolveYoutubeAudio({ ...input, query: "pending-identity-regression", target: "https://youtu.be/exactCCCCCC" }, async () => payload("exactCCCCCC"));
  titleResult.resolve(payload("cachedDDDDD"));
  await titleSearch;
  assert.equal(exact.id, "exactCCCCCC");
});

test("equivalent exact links share one extraction and reject wrong-video output", async () => {
  let calls = 0;
  const run = async () => { calls++; return payload("sharedEEEEE"); };
  const [a, b] = await Promise.all([
    resolveYoutubeAudio({ ...input, query: "https://youtu.be/sharedEEEEE" }, run),
    resolveYoutubeAudio({ ...input, query: "https://www.youtube.com/watch?v=sharedEEEEE" }, run)
  ]);
  assert.equal(a.id, b.id);
  assert.equal(calls, 1);
  await assert.rejects(resolveYoutubeAudio({ ...input, query: "https://youtu.be/wantedFFFFF" }, async () => payload("wrongGGGGGG")), /different video/);
});

test("embedded video links have exact identity but pure playlists do not", () => {
  assert.equal(youtubeVideoId("https://www.youtube-nocookie.com/embed/abcdEFGhijk"), "abcdEFGhijk");
  assert.equal(youtubeVideoId("https://www.youtube.com/embed/abcdEFGhijk"), "abcdEFGhijk");
  assert.equal(youtubeVideoId("https://www.youtube.com/playlist?list=PLexample"), null);
});

test("a failed signed stream is evicted under every alias and extracted fresh", async () => {
  let calls = 0;
  const run = async () => { calls++; return payload("expiredHHHH"); };
  await resolveYoutubeAudio({ ...input, query: "expired-stream-test" }, run);
  assert.ok(getCachedYoutubeAudio("expired-stream-test"));
  assert.ok(getCachedYoutubeAudio("https://youtu.be/expiredHHHH"));
  invalidateCachedYoutubeAudio("https://www.youtube.com/watch?v=expiredHHHH");
  assert.equal(getCachedYoutubeAudio("expired-stream-test"), null);
  assert.equal(getCachedYoutubeAudio("https://youtu.be/expiredHHHH"), null);
  await resolveYoutubeAudio({ ...input, query: "https://youtu.be/expiredHHHH" }, run);
  assert.equal(calls, 2);
});

test("a failed extraction is not left pending and a retry can succeed", async () => {
  const request = { ...input, query: "https://youtu.be/retryIIIIII" };
  await assert.rejects(resolveYoutubeAudio(request, async () => { throw new Error("temporary failure"); }), /temporary failure/);
  const result = await resolveYoutubeAudio(request, async () => payload("retryIIIIII"));
  assert.equal(result.id, "retryIIIIII");
});

test("Discord failure messages distinguish anti-bot, throttling and timeout without raw stacks", () => {
  assert.match(friendlyPlaybackFailure("Sign in to confirm you're not a bot"), /anti-bot/);
  assert.match(friendlyPlaybackFailure("HTTP 429"), /rate-limited/);
  assert.match(friendlyPlaybackFailure("Track was stuck for 10000ms"), /did not respond in time/);
  assert.doesNotMatch(friendlyPlaybackFailure("All clients failed. at dev.lavalink.youtube.Client.load secret-url"), /dev\.lavalink|secret-url/);
  assert.doesNotMatch(friendlyPlaybackFailure("unknown private details"), /private details/);
});
