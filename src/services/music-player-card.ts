import { createCanvas, GlobalFonts, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { playerClock, playerText, playerTiming, type MusicPlayerView } from "../utils/music-player.js";

// Local-only artwork and fonts; no remote media requests on the audio path.
let portrait: Promise<Image> | undefined;
let fontReady = false;
const cards = new Map<string, Promise<Buffer>>();

function circle(ctx: SKRSContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}

function fit(ctx: SKRSContext2D, text: string, maxWidth: number) {
  const characters = Array.from(text);
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (characters.length && ctx.measureText(`${characters.join("")}…`).width > maxWidth) characters.pop();
  return `${characters.join("")}…`;
}

function titleLines(ctx: SKRSContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return [text];
  const words = text.split(" ");
  let first = "";
  while (words.length && ctx.measureText(`${first} ${words[0]}`.trim()).width <= width) first = `${first} ${words.shift()}`.trim();
  if (!first) return [fit(ctx, text, width)];
  return [first, fit(ctx, words.join(" "), width)];
}

function crescent(ctx: SKRSContext2D, x: number, y: number, r: number) {
  ctx.save(); ctx.translate(x, y); ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, true);
  ctx.bezierCurveTo(-r * .8, r * .5, -r * .8, -r * .5, 0, -r);
  ctx.fillStyle = "#9861ff"; ctx.fill(); ctx.restore();
}

async function draw(view: MusicPlayerView) {
  if (!fontReady) {
    GlobalFonts.registerFromPath(fileURLToPath(new URL("../../dashboard/public/fonts/Inter.ttf", import.meta.url)), "Player Sans");
    fontReady = true;
  }
  const artwork = await (portrait ??= loadImage(fileURLToPath(new URL("../../assets/music/raven-portrait.png", import.meta.url))).catch(error => { portrait = undefined; throw error; }));
  const canvas = createCanvas(1200, 520);
  const ctx = canvas.getContext("2d");
  ctx.beginPath(); ctx.roundRect(0, 0, 1200, 520, 24); ctx.clip();
  const surface = ctx.createLinearGradient(0, 0, 1200, 520);
  surface.addColorStop(0, "#10101d"); surface.addColorStop(.6, "#090911"); surface.addColorStop(1, "#171329");
  ctx.fillStyle = surface; ctx.fillRect(0, 0, 1200, 520);

  // Fade the supplied image into the composition, retaining the original asset.
  const layer = createCanvas(480, 520);
  const art = layer.getContext("2d");
  art.drawImage(artwork, 0, 0, 520, 520);
  art.globalCompositeOperation = "destination-in";
  const fade = art.createLinearGradient(0, 0, 480, 0);
  fade.addColorStop(0, "transparent"); fade.addColorStop(.28, "#000"); fade.addColorStop(1, "#000");
  art.fillStyle = fade; art.fillRect(0, 0, 480, 520);
  ctx.drawImage(layer, 720, 0);
  const shade = ctx.createLinearGradient(0, 310, 0, 520);
  shade.addColorStop(0, "transparent"); shade.addColorStop(1, "#090911d9");
  ctx.fillStyle = shade; ctx.fillRect(720, 310, 480, 210);

  // Decorative vinyl, not an audio-reactive waveform.
  circle(ctx, 159, 218, 133, "#080810");
  const rim = ctx.createLinearGradient(36, 90, 285, 340);
  rim.addColorStop(0, "#423381"); rim.addColorStop(.45, "#9856f5"); rim.addColorStop(.8, "#302347"); rim.addColorStop(1, "#76e9ed");
  ctx.strokeStyle = rim; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(159, 218, 125, 0, Math.PI * 2); ctx.stroke();
  const vinyl = ctx.createLinearGradient(50, 100, 240, 340);
  vinyl.addColorStop(0, "#070710"); vinyl.addColorStop(.23, "#382747"); vinyl.addColorStop(.39, "#080810"); vinyl.addColorStop(.7, "#15121d"); vinyl.addColorStop(.86, "#3c344e"); vinyl.addColorStop(1, "#090910");
  ctx.fillStyle = vinyl; ctx.beginPath(); ctx.arc(159, 218, 119, 0, Math.PI * 2); ctx.fill();
  for (let radius = 44; radius < 118; radius += 4) {
    ctx.strokeStyle = "#d6bbff16"; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.arc(159, 218, radius, 0, Math.PI * 2); ctx.stroke();
  }
  circle(ctx, 159, 218, 40, "#211337"); crescent(ctx, 163, 218, 24); circle(ctx, 159, 218, 4, "#b49aff");

  const status = { loading: "GETTING READY", playing: "NOW PLAYING", paused: "ON PAUSE", idle: "LISTENING ROOM" }[view.state];
  crescent(ctx, 323, 64, 18);
  ctx.fillStyle = "#b98bff"; ctx.font = '500 18px "Player Sans", sans-serif'; ctx.fillText(status, 349, 70);
  ctx.fillStyle = "#f5f2ff"; ctx.font = '600 32px "Player Sans", sans-serif';
  const lines = titleLines(ctx, playerText(view.track?.info.title, "Choose your next track", 200), 458);
  lines.forEach((line, i) => ctx.fillText(line, 310, 132 + i * 39));
  ctx.fillStyle = "#d1c4ed"; ctx.font = '400 25px "Player Sans", sans-serif';
  ctx.fillText(fit(ctx, playerText(view.track?.info.author, "Add a song with /play", 100), 450), 310, 220);
  ctx.font = '400 20px "Player Sans", sans-serif'; ctx.fillStyle = "#b9acd4";
  ctx.fillText(fit(ctx, view.track ? `Requested by ${playerText(view.requester, "Unknown", 40)}` : "Your next session starts here", 450), 310, 263);

  const { duration, position, progress } = playerTiming(view);
  const showProgress = Boolean(view.track && duration > 0 && !view.track.info.isStream);
  const railX = 310, railY = 314, railWidth = 450;
  ctx.fillStyle = "#484060"; ctx.beginPath(); ctx.roundRect(railX, railY, railWidth, 6, 3); ctx.fill();
  if (showProgress && progress > 0) {
    const elapsed = ctx.createLinearGradient(railX, 0, railX + railWidth * progress, 0);
    elapsed.addColorStop(0, "#9448ff"); elapsed.addColorStop(1, "#79eef1");
    ctx.fillStyle = elapsed; ctx.beginPath(); ctx.roundRect(railX, railY, Math.max(6, railWidth * progress), 6, 3); ctx.fill();
  }
  if (showProgress) circle(ctx, railX + railWidth * progress, railY + 3, 7, "#99f5fa");
  ctx.font = '400 18px "Player Sans", sans-serif'; ctx.fillStyle = "#b9acd4";
  ctx.fillText(view.state === "idle" ? "Nothing playing" : view.state === "loading" ? "Connecting…" : view.track?.info.isStream ? "Live stream" : showProgress ? playerClock(position) : "Duration unknown", railX, 353);
  ctx.textAlign = "right"; ctx.fillText(showProgress ? playerClock(duration) : "", railX + railWidth, 353); ctx.textAlign = "left";

  // Real queue data, never a song baked into the artwork.
  ctx.fillStyle = "#12121fee"; ctx.strokeStyle = "#3a3056"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(32, 405, 782, 83, 22); ctx.fill(); ctx.stroke();
  ctx.font = '500 19px "Player Sans", sans-serif'; ctx.fillStyle = "#b98bff"; ctx.fillText("Up next", 56, 454);
  ctx.fillStyle = "#413653"; ctx.fillRect(151, 424, 1, 45);
  ctx.font = '500 21px "Player Sans", sans-serif'; ctx.fillStyle = "#e3daf5";
  ctx.fillText(fit(ctx, playerText(view.nextTrack?.info.title, "The queue is yours", 160), 484), 175, 438);
  ctx.font = '400 17px "Player Sans", sans-serif'; ctx.fillStyle = "#b9acd4";
  ctx.fillText(fit(ctx, playerText(view.nextTrack?.info.author, "Add another song with /play", 100), 484), 175, 467);
  const nextDuration = view.nextTrack?.info.duration;
  ctx.textAlign = "right";
  ctx.fillText(view.nextTrack?.info.isStream ? "LIVE" : typeof nextDuration === "number" && Number.isFinite(nextDuration) && nextDuration > 0 ? playerClock(nextDuration) : "", 786, 453);
  ctx.strokeStyle = "#645090"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(1, 1, 1198, 518, 23); ctx.stroke();
  return canvas.encode("png");
}

export function renderMusicPlayerCard(view: MusicPlayerView) {
  const { duration, position } = playerTiming(view);
  const snapshot = { ...view, position: Math.floor(position / 1000) * 1000 };
  const next = view.nextTrack?.info;
  const key = JSON.stringify([view.track?.info.title, view.track?.info.author, duration, view.track?.info.isStream, Boolean(view.track), snapshot.position, view.state, view.requester, next?.title, next?.author, next?.duration, next?.isStream]);
  const cached = cards.get(key);
  if (cached) return cached;
  const render = draw(snapshot).catch(error => { cards.delete(key); throw error; });
  cards.set(key, render);
  if (cards.size > 16) cards.delete(cards.keys().next().value!);
  return render;
}
