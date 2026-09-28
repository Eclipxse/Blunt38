import assert from "node:assert/strict";
import test from "node:test";
import type { APIButtonComponentWithCustomId } from "discord.js";
import { buildQueueEmbed, buildQueueRows, isQueuePanel, queuePage, type QueueTrack, type QueueView } from "./music-queue.js";

const song = (number: number, overrides: Partial<QueueTrack["info"]> = {}): QueueTrack => ({
  info: { title: `Song ${number}`, author: `Artist ${number}`, duration: 180_000, uri: `https://example.com/song/${number}`, ...overrides },
  requester: { username: `Listener ${number}` }
});
const view = (count = 14): QueueView => ({
  current: song(0, { artworkUrl: "https://example.com/cover.png" }),
  tracks: Array.from({ length: count }, (_, index) => song(index + 1)),
  paused: false,
  position: 65_000
});
const buttons = (state: QueueView, page = 0) => buildQueueRows(state, page)
  .flatMap((row) => row.components.map((button) => button.toJSON()))
  .filter((button): button is APIButtonComponentWithCustomId => "custom_id" in button);

test("queue separates current track from six numbered upcoming entries with attribution", () => {
  const embed = buildQueueEmbed(view(), 0, "blunt38", 0xc26cff).toJSON();
  assert.equal(embed.title, "Queue");
  assert.match(embed.description!, /14 tracks up next/);
  assert.match(embed.description!, /42:00 queued/);
  assert.equal(embed.thumbnail?.url, "https://example.com/cover.png");
  assert.equal(embed.fields?.length, 7);
  assert.equal(embed.fields[0].name, "Playing now");
  assert.match(embed.fields[0].value, /\[Song 0\]\(https:\/\/example.com\/song\/0\)/);
  assert.match(embed.fields[0].value, /1:05 \/ 3:00/);
  assert.match(embed.fields[0].value, /Requested by Listener 0/);
  assert.equal(embed.fields[1].name, "01 · Song 1");
  assert.match(embed.fields[1].value, /Artist 1 · `3:00`\nAdded by Listener 1/);
  assert.equal(embed.fields[6].name, "06 · Song 6");
  assert.match(embed.footer!.text, /Page 1 of 3 · Tracks 1–6 of 14/);
});

test("pagination uses global numbering and handles a queue shrinking underneath a panel", () => {
  const second = buildQueueEmbed(view(), 1, "blunt38", 1).toJSON();
  assert.equal(second.fields![1].name, "07 · Song 7");
  assert.equal(second.fields![6].name, "12 · Song 12");
  const last = buildQueueEmbed(view(), 99, "blunt38", 1).toJSON();
  assert.equal(last.fields!.length, 3);
  assert.equal(last.fields![1].name, "13 · Song 13");
  assert.match(last.footer!.text, /Page 3 of 3/);
  assert.equal(queuePage(99, 2), 0);
  for (const invalid of [NaN, Infinity, -Infinity, -1]) assert.equal(queuePage(invalid, 20), 0);
});

test("queue navigation stays bounded and custom IDs are unique on every page", () => {
  for (const count of [0, 1, 6, 7, 14]) {
    for (const page of [0, 1, 99, NaN]) {
      const controls = buttons(view(count), page);
      const ids = controls.map((button) => "custom_id" in button ? button.custom_id : "");
      assert.equal(ids.length, new Set(ids).size);
      assert.ok(buildQueueRows(view(count), page).every((row) => row.components.length <= 5));
    }
  }
  const first = buttons(view());
  assert.equal(first.find((item) => item.label === "Back")?.disabled, true);
  assert.equal(first.find((item) => item.label === "Next")?.disabled, false);
  assert.equal(first.find((item) => item.label === "Refresh")?.disabled, false);
  assert.equal(buttons(view(), 2).find((item) => item.label === "Next")?.disabled, true);
  assert.equal(buttons(view(0)).find((item) => item.label === "Clear queue")?.disabled, true);
});

test("paused controls retain the queue page and the panel exposes the paused state", () => {
  const state = { ...view(), paused: true };
  assert.equal(buildQueueEmbed(state, 1, "blunt38", 1).toJSON().fields![0].name, "Paused");
  const resume = buttons(state, 1).find((item) => item.label === "Resume")!;
  assert.ok("custom_id" in resume);
  assert.equal(resume.custom_id, "music:resume:1");
});

test("empty queue gives an actionable next step without inventing artwork or duration", () => {
  const state = { ...view(0), current: null };
  const embed = buildQueueEmbed(state, 0, "blunt38", 1).toJSON();
  assert.equal(embed.thumbnail, undefined);
  assert.equal(embed.fields![0].value, "Nothing is playing.");
  assert.match(embed.fields![1].value, /\/play/);
  assert.match(embed.fields![1].value, /\/search/);
  assert.equal(buttons(state).find((item) => item.label === "Pause")?.disabled, true);
  assert.equal(buttons(state).find((item) => item.label === "Skip")?.disabled, true);
});

test("live and unresolved tracks do not produce a misleading finite total", () => {
  const state = { ...view(), current: song(0, { isStream: true }), tracks: [song(1), song(2, { isStream: true }), song(3, { duration: undefined })] };
  const embed = buildQueueEmbed(state, 0, "blunt38", 1).toJSON();
  assert.match(embed.description!, /3:00 queued · Live streams · Some durations unknown/);
  assert.match(embed.fields![0].value, /`Live`/);
  assert.match(embed.fields![3].value, /Duration unknown/);
});

test("requesters support guild nicknames, user display names and missing metadata", () => {
  const state = view(3);
  state.tracks[0].requester = { displayName: "Server name", user: { username: "Account" } };
  state.tracks[1].requester = { globalName: "Display name", username: "Account" };
  state.tracks[2].requester = undefined;
  const fields = buildQueueEmbed(state, 0, "blunt38", 1).toJSON().fields!;
  assert.match(fields[1].value, /Added by Server name/);
  assert.match(fields[2].value, /Added by Display name/);
  assert.match(fields[3].value, /Added by Unknown/);
});

test("hostile and oversized metadata stays within Discord embed limits", () => {
  const hostile = song(1, {
    title: "[**@everyone**]\n".repeat(500), author: "_*@here".repeat(500),
    uri: "javascript:alert(1)", artworkUrl: "https://username:password@example.com/art"
  });
  hostile.requester = { username: "@everyone\n".repeat(200) };
  const embed = buildQueueEmbed({ current: hostile, tracks: Array(6).fill(hostile), paused: false, position: NaN }, 0, "b".repeat(500), 1).toJSON();
  assert.equal(embed.thumbnail, undefined);
  const all = JSON.stringify(embed);
  assert.doesNotMatch(all, /javascript:|@everyone|@here|password/);
  assert.ok(embed.fields!.every((field) => field.name.length <= 256 && field.value.length <= 1024));
  const length = (embed.title?.length ?? 0) + (embed.description?.length ?? 0) + (embed.author?.name.length ?? 0)
    + (embed.footer?.text.length ?? 0) + embed.fields!.reduce((total, field) => total + field.name.length + field.value.length, 0);
  assert.ok(length < 6000);
});

test("queue recognition accepts current and existing legacy panels, not ordinary players", () => {
  assert.equal(isQueuePanel("Queue"), true);
  assert.equal(isQueuePanel("Music Queue - Page 2/4"), true);
  assert.equal(isQueuePanel("Now playing"), false);
  assert.equal(isQueuePanel(undefined), false);
});

test("encoded URLs cannot overflow a current-track field", () => {
  const state = { ...view(), current: song(0, { uri: `https://example.com/${"曲".repeat(250)}` }) };
  const embed = buildQueueEmbed(state, 0, "blunt38", 1).toJSON();
  assert.ok(embed.fields![0].value.length < 1024);
  assert.doesNotMatch(embed.fields![0].value, /https:/);
});
