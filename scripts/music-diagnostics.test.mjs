import assert from "node:assert/strict";
import test from "node:test";
import { summarizeMusicLogs } from "./music-diagnostics.mjs";

test("diagnostics export only timing and failure categories, never raw logs or secrets", () => {
  const logs = [
    "2026-09-05T12:00:00Z [music:play] guild=123 source=url setup=40ms search=200ms command=300ms title=private-title",
    "[music:ytdlp] cache=hit total=20ms video=private-video-id",
    "[music:recovery-ytdlp-error] Sign in to confirm you're not a bot https://private.example/?sig=signed-secret password=private-password",
    "refreshToken: private-oauth-token",
    "Authorization: Bot private-discord-token",
    "[music:track-error] All clients failed to load the item. at dev.lavalink.client.Loader",
    "[music:event-error] error=unknown-private-data"
  ].join("\n");
  const summary = summarizeMusicLogs(logs);
  const output = JSON.stringify(summary);
  assert.doesNotMatch(output, /private-|signed-secret|Authorization|dev\.lavalink|https:/);
  assert.equal(summary.recentEvents[0].searchMs, 200);
  assert.equal(summary.recentEvents[1].cache, "hit");
  assert.equal(summary.failures["youtube-anti-bot"], 1);
  assert.equal(summary.failures["youtube-clients-rejected"], 1);
});

test("diagnostics bound returned events and identify routing and timeout failures", () => {
  const summary = summarizeMusicLogs(Array.from({ length: 100 }, () => "[music:search-error] timeout after=6000ms").join("\n")
    + "\nNetwork is unreachable\nHTTP 429\nECONNREFUSED");
  assert.equal(summary.recentEvents.length, 30);
  assert.equal(summary.failures["timeout-or-stuck"], 100);
  assert.equal(summary.failures["network-unreachable"], 1);
  assert.equal(summary.failures["source-rate-limit"], 1);
  assert.equal(summary.failures["lavalink-unavailable"], 1);
});
