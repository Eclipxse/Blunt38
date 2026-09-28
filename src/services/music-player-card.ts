import { createCanvas, GlobalFonts, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { playerClock, playerText, playerTiming, type MusicPlayerView } from "../utils/music-player.js";

// Local-only artwork. No cover-art fetch, external font request or audio-path work.
let bunny: Promise<Image> | undefined;
let fontReady = false;
const cards = new Map<string, Promise<Buffer>>();

function ellipse(ctx: SKRSContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}

function fit(ctx: SKRSContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped && ctx.measureText(`${clipped}…`).width > maxWidth) clipped = clipped.slice(0, -1);
  return `${clipped}…`;
}

async function draw(view: MusicPlayerView) {
  if (!fontReady) {
    GlobalFonts.registerFromPath(fileURLToPath(new URL("../../dashboard/public/fonts/Inter.ttf", import.meta.url)), "Player Sans");
    fontReady = true;
  }
  const mascot = await (bunny ??= loadImage(fileURLToPath(new URL("../../assets/music/listening-bunny.png", import.meta.url))).catch((error) => { bunny = undefined; throw error; }));
  const canvas = createCanvas(1200, 420);
  const ctx = canvas.getContext("2d");
  const surface = ctx.createLinearGradient(0, 0, 1200, 420);
  surface.addColorStop(0, "#282831"); surface.addColorStop(1, "#17171e");
  ctx.fillStyle = surface; ctx.beginPath(); ctx.roundRect(0, 0, 1200, 420, 28); ctx.fill();

  // A quiet record, not a simulated waveform or a fake interactive transport.
  ellipse(ctx, 170, 197, 131, 131, "#121216");
  const vinyl = ctx.createLinearGradient(40, 40, 280, 300);
  vinyl.addColorStop(0, "#4b4b54"); vinyl.addColorStop(0.48, "#19191f"); vinyl.addColorStop(0.8, "#33333b"); vinyl.addColorStop(1, "#19191f");
  ctx.fillStyle = vinyl; ctx.beginPath(); ctx.arc(166, 184, 128, 0, Math.PI * 2); ctx.fill();
  for (let radius = 61; radius < 124; radius += 6) {
    ctx.strokeStyle = "rgba(225,225,245,0.09)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(166, 184, radius, 0, Math.PI * 2); ctx.stroke();
  }
  ellipse(ctx, 166, 184, 49, 49, view.state === "paused" ? "#a5a3b0" : "#c4b4f0");
  ellipse(ctx, 166, 184, 7, 7, "#25242f");
  ctx.strokeStyle = "#96929f"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(287, 72); ctx.lineTo(278, 217); ctx.lineTo(247, 246); ctx.stroke();
  ellipse(ctx, 287, 72, 10, 10, "#b6b3c1");

  const status = { loading: "Getting ready", playing: "Now playing", paused: "On pause", idle: "Your listening room" }[view.state];
  ctx.fillStyle = "#c4b4f0"; ctx.font = '500 25px "Player Sans", sans-serif'; ctx.fillText(status, 345, 84);
  ctx.fillStyle = "#f5f3fa"; ctx.font = '600 38px "Player Sans", sans-serif';
  ctx.fillText(fit(ctx, playerText(view.track?.info.title, "Choose your next track", 200), 545), 345, 152);
  ctx.fillStyle = "#c5c1ce"; ctx.font = '400 27px "Player Sans", sans-serif';
  ctx.fillText(fit(ctx, playerText(view.track?.info.author, "Add a song with /play", 100), 545), 345, 198);
  ctx.font = '400 23px "Player Sans", sans-serif'; ctx.fillStyle = "#c5c1ce";
  ctx.fillText(`${Math.round(view.volume)}% volume   ·   ${view.queued} up next`, 345, 250);

  const height = 268;
  const width = height * mascot.width / mascot.height;
  ctx.drawImage(mascot, 924 + (228 - width) / 2, 30, width, height);

  const { duration, position, progress } = playerTiming(view);
  const showProgress = duration > 0 && !view.track?.info.isStream;
  ctx.fillStyle = "#484550"; ctx.beginPath(); ctx.roundRect(54, 338, 1092, 6, 3); ctx.fill();
  if (showProgress && progress > 0) {
    ctx.fillStyle = "#c4b4f0"; ctx.beginPath(); ctx.roundRect(54, 338, Math.max(6, 1092 * progress), 6, 3); ctx.fill();
  }
  if (showProgress) ellipse(ctx, 54 + 1092 * progress, 341, 6, 6, "#f5f3fa");
  ctx.font = '400 22px "Player Sans", sans-serif'; ctx.fillStyle = "#c5c1ce";
  ctx.fillText(view.state === "loading" ? "Connecting…" : view.track?.info.isStream ? "Live stream" : showProgress ? playerClock(position) : "Duration unknown", 54, 386);
  ctx.textAlign = "right";
  ctx.fillText(showProgress ? playerClock(duration) : "", 1146, 386);
  return canvas.encode("png");
}

export function renderMusicPlayerCard(view: MusicPlayerView) {
  const { duration, position } = playerTiming(view);
  const snapshot = { ...view, position: Math.floor(position / 1000) * 1000 };
  const key = JSON.stringify([view.track?.info.title, view.track?.info.author, duration, view.track?.info.isStream, snapshot.position, view.state, view.volume, view.queued]);
  const cached = cards.get(key);
  if (cached) return cached;
  const render = draw(snapshot).catch((error) => { cards.delete(key); throw error; });
  cards.set(key, render);
  if (cards.size > 16) cards.delete(cards.keys().next().value!);
  return render;
}
