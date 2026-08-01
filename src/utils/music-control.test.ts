import assert from "node:assert/strict";
import test from "node:test";
import {
  clampMusicPage,
  musicPageCount,
  parseSeekPosition,
  progressBar
} from "./music-control.js";

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
