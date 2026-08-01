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
