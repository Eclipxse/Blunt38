import { createCanvas, GlobalFonts, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { playerClock, playerText, playerTiming, type MusicPlayerView } from "../utils/music-player.js";

// Artwork is loaded once from disk. Rendering never needs a network request.
let artwork: Promise<[Image, Image]> | undefined;
let fontReady = false;
const cards = new Map<string, Promise<Buffer>>();

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

const previousIcon = ["10001", "10011", "10111", "10011", "10001"];
const nextIcon = ["10001", "11001", "11101", "11001", "10001"];
const playIcon = ["10000", "11100", "11111", "11100", "10000"];
const pauseIcon = ["11011", "11011", "11011", "11011", "11011"];

function transport(ctx: SKRSContext2D, x: number, y: number, icon: string[], primary = false) {
  ctx.fillStyle = primary ? "#a9caff" : "#14294a";
  ctx.fillRect(x, y, 68, 58);
  ctx.strokeStyle = primary ? "#d3e6ff" : "#628bc2";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, 66, 56);
  ctx.fillStyle = primary ? "#0a2247" : "#c6deff";
  const pixel = 6;
  icon.forEach((row, iy) => [...row].forEach((bit, ix) => {
    if (bit === "1") ctx.fillRect(x + 19 + ix * pixel, y + 14 + iy * pixel, pixel, pixel);
  }));
}

async function draw(view: MusicPlayerView) {
  if (!fontReady) {
    GlobalFonts.registerFromPath(fileURLToPath(new URL("../../dashboard/public/fonts/Inter.ttf", import.meta.url)), "Player Sans");
    fontReady = true;
  }
  const [stars, phone] = await (artwork ??= Promise.all([
    loadImage(fileURLToPath(new URL("../../assets/music/blue-player-stars.jpg", import.meta.url))),
    loadImage(fileURLToPath(new URL("../../assets/music/blue-player-phone.jpg", import.meta.url)))
  ]).catch(error => { artwork = undefined; throw error; }));

  const canvas = createCanvas(1200, 520);
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.roundRect(0, 0, 1200, 520, 22);
  ctx.clip();
  const scale = Math.max(1200 / stars.width, 520 / stars.height);
  ctx.drawImage(stars, 0, (520 - stars.height * scale) / 2, stars.width * scale, stars.height * scale);

  const shade = ctx.createLinearGradient(0, 0, 1200, 0);
  shade.addColorStop(0, "#040c1b22");
  shade.addColorStop(.31, "#040c1b3d");
  shade.addColorStop(.43, "#040c1be9");
  shade.addColorStop(1, "#040c1bf0");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 1200, 520);

  // Screen compositing drops the reference's black background while retaining its pixel art.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.imageSmoothingEnabled = false;
  const phoneHeight = 404;
  const phoneWidth = phone.width * phoneHeight / phone.height;
  ctx.drawImage(phone, (433 - phoneWidth) / 2, 55, phoneWidth, phoneHeight);
  ctx.restore();

  const x = 500;
  const width = 628;
  const { duration, position, progress } = playerTiming(view);
  const showProgress = Boolean(view.track && duration > 0 && !view.track.info.isStream);
  const status = { loading: "Connecting…", playing: "Now playing", paused: "Paused", idle: "Nothing playing" }[view.state];
  ctx.font = '600 22px "Player Sans", sans-serif';
  ctx.fillStyle = "#a9caff";
  ctx.fillText(status, x, 66);
  ctx.font = '700 52px "Player Sans", sans-serif';
  ctx.fillStyle = "#f4f8ff";
  const lines = titleLines(ctx, playerText(view.track?.info.title, "Choose your next track", 200), width);
  lines.forEach((line, index) => ctx.fillText(line, x, 129 + index * 58));
  const authorY = lines.length === 1 ? 177 : 229;
  ctx.font = '500 30px "Player Sans", sans-serif';
  ctx.fillStyle = "#d9e9ff";
  ctx.fillText(fit(ctx, playerText(view.track?.info.author, "Add a song with /play", 100), width), x, authorY);
  if (view.track) {
    ctx.font = '400 22px "Player Sans", sans-serif';
    ctx.fillStyle = "#a9c4e8";
    ctx.fillText(fit(ctx, `Requested by ${playerText(view.requester, "Unknown", 40)}`, width), x, authorY + 34);
  }

  ctx.fillStyle = "#375378";
  ctx.fillRect(x, 290, width, 6);
  if (showProgress) {
    ctx.fillStyle = "#a9caff";
    ctx.fillRect(x, 290, width * progress, 6);
    ctx.fillRect(x + Math.min(width - 8, width * progress), 287, 8, 12);
  }
  ctx.font = '500 20px "Player Sans", sans-serif';
  ctx.fillStyle = "#c6dfff";
  ctx.fillText(showProgress ? playerClock(position) : view.track?.info.isStream ? "Live stream" : "", x, 326);
  ctx.textAlign = "right";
  ctx.fillText(showProgress ? playerClock(duration) : "", x + width, 326);
  ctx.textAlign = "left";

  const controlsX = x + (width - 228) / 2;
  transport(ctx, controlsX, 352, previousIcon);
  transport(ctx, controlsX + 80, 352, view.state === "playing" ? pauseIcon : playIcon, true);
  transport(ctx, controlsX + 160, 352, nextIcon);

  ctx.fillStyle = "#40608a";
  ctx.fillRect(x, 439, width, 1);
  ctx.fillStyle = "#a9caff";
  ctx.font = '600 21px "Player Sans", sans-serif';
  ctx.fillText("Up next", x, 476);
  ctx.fillStyle = "#d9e9ff";
  ctx.font = '500 24px "Player Sans", sans-serif';
  const next = view.nextTrack?.info;
  const nextLabel = next?.title && next?.author ? `${next.title} · ${next.author}` : next?.title;
  ctx.fillText(fit(ctx, playerText(nextLabel, "Queue is empty", 160), width - 191), x + 104, 476);
  ctx.textAlign = "right";
  ctx.fillText(next?.isStream ? "LIVE" : next?.duration && next.duration > 0 ? playerClock(next.duration) : "", x + width, 476);

  ctx.strokeStyle = "#7faeea";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 1, 1198, 518, 21);
  ctx.stroke();
  return canvas.encode("jpeg", 88);
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
