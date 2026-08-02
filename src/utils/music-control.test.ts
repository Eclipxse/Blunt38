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
  parseYtDlpPayload,
  shouldResolveYoutubeInput,
  youtubeAudioCacheExpiry
} from "../services/youtube-resolver.js";

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

test("yt-dlp resolver accepts song names and YouTube URLs only", () => {
  assert.equal(shouldResolveYoutubeInput("Coldplay Yellow"), true);
  assert.equal(shouldResolveYoutubeInput("https://youtu.be/yKNxeF4KMsY"), true);
  assert.equal(shouldResolveYoutubeInput("https://music.youtube.com/watch?v=yKNxeF4KMsY"), true);
  assert.equal(shouldResolveYoutubeInput("https://open.spotify.com/track/example"), false);
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
