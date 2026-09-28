import test from "node:test";
import assert from "node:assert/strict";
import { buildPlayerEmbed, buildPlayerRows, currentPanelResult, isPlayerPanel, playerTiming, playerUrl, resolvePlayerState, type MusicPlayerView } from "./music-player.js";
import { renderMusicPlayerCard } from "../services/music-player-card.js";

const view: MusicPlayerView = {
  track: { info: { title: "Lonely", author: "Akon", duration: 235000, uri: "https://www.youtube.com/watch?v=example" } },
  state: "playing", position: 42000, volume: 80, queued: 3, requester: "Raven", voiceChannelId: "123456789"
};

test("player has accessible track text, truthful snapshot and no overloaded settings footer", () => {
  const embed = buildPlayerEmbed(view, "blunt38", 0xa855f7).toJSON();
  assert.equal(embed.title, "Lonely");
  assert.equal(embed.author?.name, "blunt38 · Now playing");
  assert.match(embed.description!, /0:42 \/ 3:55/);
  assert.match(embed.description!, /Raven/);
  assert.match(embed.footer!.text, /3 up next.*Position at last update/);
  assert.doesNotMatch(embed.footer!.text, /Filter|Autoplay/);
});

test("loading and paused states cannot pretend audio is playing", () => {
  const loading = buildPlayerEmbed({ ...view, state: "loading" }, "blunt38", 1).toJSON();
  assert.match(loading.author!.name, /Getting ready/);
  assert.match(loading.description!, /Connecting/);
  const rows = buildPlayerRows("loading", 3).map(row => row.toJSON());
  assert.ok(rows[0].components.every(button => button.disabled));
  assert.ok(!rows[1].components.at(-1)!.disabled, "stop remains available");
  const paused = buildPlayerRows("paused")[0].toJSON().components[1];
  assert.ok("custom_id" in paused && "label" in paused);
  assert.equal(paused.custom_id, "music:resume");
  assert.equal(paused.label, "Resume");
});

test("every transport is labeled and buttons remain within Discord limits", () => {
  for (const state of ["loading", "playing", "paused", "idle"] as const) {
    const rows = buildPlayerRows(state, 18).map(row => row.toJSON());
    const buttons = rows.flatMap(row => row.components);
    assert.ok(rows.every(row => row.components.length <= 5));
    assert.ok(buttons.every(button => "label" in button && button.label && button.label.length <= 80));
    const ids = buttons.map(button => { assert.ok("custom_id" in button); return button.custom_id; });
    assert.equal(new Set(ids).size, buttons.length);
    assert.deepEqual(ids, ["music:previous", state === "paused" ? "music:resume" : "music:pause", "music:skip", "music:queue:0", "music:refresh", "music:controls", "music:stop"]);
  }
});

test("timing clamps positions and treats unknown duration and live streams honestly", () => {
  assert.equal(playerTiming({ ...view, position: -12 }).position, 0);
  assert.equal(playerTiming({ ...view, position: Infinity }).position, 0);
  assert.equal(playerTiming({ ...view, position: 999999 }).progress, 1);
  assert.equal(playerTiming({ ...view, state: "loading" }).position, 0);
  const live = buildPlayerEmbed({ ...view, track: { info: { isStream: true } } }, "b", 1).toJSON();
  assert.match(live.description!, /Live stream/);
  const unknown = buildPlayerEmbed({ ...view, track: { info: {} } }, "b", 1).toJSON();
  assert.match(unknown.description!, /Duration unknown/);
});

test("unsafe URLs and hostile metadata cannot break the player embed", () => {
  assert.equal(playerUrl("javascript:alert(1)"), undefined);
  assert.equal(playerUrl("https://secret:token@example.com"), undefined);
  const embed = buildPlayerEmbed({ ...view, requester: "@everyone **admin**", track: { info: { title: "x".repeat(2000), author: "@everyone".repeat(200), uri: "file:///secret" } } }, "b", 1).toJSON();
  assert.ok(embed.title!.length <= 160);
  assert.ok(embed.description!.length < 1024);
  assert.ok(!embed.url);
  assert.doesNotMatch(JSON.stringify(embed), /@everyone/);
});

test("player recognition excludes queue and advanced control panels", () => {
  assert.ok(isPlayerPanel("blunt38 · Paused", "Lonely"));
  assert.ok(isPlayerPanel(undefined, "Loading Track"));
  assert.ok(!isPlayerPanel("blunt38 · Music", "Queue"));
  assert.ok(!isPlayerPanel(undefined, "Music controls"));
});

test("local card renders PNG at a bounded size and reuses matching snapshots", async () => {
  const first = renderMusicPlayerCard(view);
  assert.equal(first, renderMusicPlayerCard(view));
  const image = await first;
  assert.equal(image.toString("hex", 0, 8), "89504e470d0a1a0a");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 420);
  assert.ok(image.length < 1_000_000);
  const paused = await renderMusicPlayerCard({ ...view, state: "paused" });
  assert.notDeepEqual(image, paused);
});

test("refresh cannot infer playback before trackStart and custom panels omit it", () => {
  assert.equal(resolvePlayerState(true, false, true, true), "loading");
  assert.equal(resolvePlayerState(true, false, true, false), "playing");
  assert.equal(resolvePlayerState(true, true, true, false), "paused");
  assert.equal(resolvePlayerState(false, false, false, false), "idle");
  const buttons = buildPlayerRows("playing", 3, false).flatMap(row => row.toJSON().components);
  assert.ok(!buttons.some(button => "custom_id" in button && button.custom_id === "music:refresh"));
});

test("a render completing after stop or a new track cannot overwrite the player", async () => {
  let current = true;
  let finish!: (value: string) => void;
  const pending = currentPanelResult(() => new Promise<string>(resolve => { finish = resolve; }), () => current);
  current = false;
  finish("stale card");
  assert.equal(await pending, null);
  assert.equal(await currentPanelResult(async () => "fresh card", () => true), "fresh card");
  let ran = false;
  assert.equal(await currentPanelResult(async () => { ran = true; return "card"; }, () => false), null);
  assert.equal(ran, false);
});
