// Development-only visual fixture. Uses the shipping renderer and embed/button data.
// This is not a live Discord capture; no bot token or Discord connection is used.
import { mkdir, writeFile } from "node:fs/promises";
import { renderMusicPlayerCard } from "../dist/services/music-player-card.js";
import { buildPlayerEmbed, buildPlayerRows } from "../dist/utils/music-player.js";

const out = new URL("../.artifacts/music-player/", import.meta.url);
await mkdir(out, { recursive: true });
const escape = (s) => String(s).replace(/[&<>\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const states = ["playing", "paused", "loading", "idle"];
let panels = "";
for (const state of states) {
  const view = { state, track: state === "idle" ? null : { info: { title: "Akon - Lonely (Official Music Video)", author: "Akon", duration: 235000 } }, position: 42000, volume: 80, queued: state === "idle" ? 0 : 3, requester: "Raven" };
  const started = performance.now();
  const image = await renderMusicPlayerCard(view);
  await writeFile(new URL(`${state}.png`, out), image);
  const embed = buildPlayerEmbed(view, "blunt38", 0xa855f7).toJSON();
  const rows = buildPlayerRows(state, view.queued).map(row => row.toJSON());
  panels += `<section id="${state}"><article><header>${escape(embed.author.name)}</header><h2>${escape(embed.title)}</h2><p>${escape(embed.description).replaceAll("\n", "<br>")}</p><img src="${state}.png" alt="Music player illustration with a bunny wearing headphones"><small>${escape(embed.footer.text)}</small></article>${rows.map(row => `<div class="controls">${row.components.map(b => `<button ${b.disabled ? "disabled" : ""} class="${b.style === 1 ? "primary" : ""}">${escape(b.label)}</button>`).join("")}</div>`).join("")}</section>`;
  console.log(`${state}: ${Math.round(performance.now() - started)}ms; ${Math.round(image.length / 1024)}KB`);
}
await writeFile(new URL("index.html", out), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Music player — local visual fixture</title><style>*{box-sizing:border-box}body{margin:0;background:#313338;color:#f2f3f5;font:15px/1.5 system-ui,sans-serif;padding:24px}h1{font-size:18px;font-weight:500;margin:0 0 24px}section{max-width:600px;margin:0 0 40px}article{border-left:4px solid #a855f7;border-radius:4px;background:#2b2d31;padding:16px}header{font-weight:600;font-size:13px;color:#dbdee1}h2{font-size:17px;line-height:1.4;color:#9cbfff;margin:10px 0 6px}p{font-size:14px;white-space:normal;margin:0 0 14px;color:#dbdee1}img{width:100%;height:auto;display:block;border-radius:8px}small{font-size:11px;display:block;margin-top:12px;color:#b5bac1}.controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}button{background:#4e5058;color:#fff;border:0;border-radius:4px;padding:9px 14px;font:500 13px system-ui;min-height:36px}.primary{background:#5865f2}button:disabled{opacity:.5}@media(max-width:420px){body{padding:12px}article{padding:12px}button{padding:8px 12px}}</style><h1>Local fixture · sample track · not a live Discord capture</h1>${panels}</html>`);
console.log(`Preview: ${new URL("index.html", out).pathname}`);
