import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, escapeMarkdown } from "discord.js";
import type { QueueTrack } from "./music-queue.js";

export type MusicPlayerState = "loading" | "playing" | "paused" | "idle";
export type MusicPlayerView = {
  track?: QueueTrack | null;
  nextTrack?: QueueTrack | null;
  state: MusicPlayerState;
  position: number;
  volume: number;
  queued: number;
  requester: string;
  voiceChannelId?: string | null;
};

export function playerText(value: unknown, fallback: string, limit = 120) {
  const text = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim() : "";
  return (text || fallback).replace(/@/g, "＠").slice(0, limit);
}

export function playerUrl(value?: string | null) {
  try {
    if (!value || value.length > 500) return undefined;
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && url.href.length <= 500 ? url.href : undefined;
  } catch { return undefined; }
}

export function playerTiming(view: MusicPlayerView) {
  const raw = view.track?.info.duration;
  const duration = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 0;
  const position = view.state === "loading" ? 0 : Math.min(duration || Infinity, Number.isFinite(view.position) ? Math.max(0, view.position) : 0);
  return { duration, position, progress: duration ? position / duration : 0 };
}

export function playerClock(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(seconds / 3600);
  return hours ? `${hours}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function buildPlayerEmbed(view: MusicPlayerView, brand: string, color: number) {
  const status = { loading: "Getting ready", playing: "Now playing", paused: "Paused", idle: "Nothing playing" }[view.state];
  const embed = new EmbedBuilder().setColor(color)
    .setAuthor({ name: `${playerText(brand, "Music", 60)} · ${status}` })
    .setTitle(playerText(view.track?.info.title, "Your listening room", 160));
  const uri = playerUrl(view.track?.info.uri);
  if (uri) embed.setURL(uri);
  const { duration, position } = playerTiming(view);
  const timing = view.track?.info.isStream ? "Live stream" : duration ? `${playerClock(position)} / ${playerClock(duration)}` : "Duration unknown";
  const voice = view.voiceChannelId && /^\d+$/.test(view.voiceChannelId) ? ` · <#${view.voiceChannelId}>` : "";
  embed.setDescription([
    escapeMarkdown(playerText(view.track?.info.author, "Unknown artist", 90)),
    view.state === "loading" ? "Connecting your track…" : view.state === "idle" ? "Add a song with `/play`." : `\`${timing}\` · ${Math.round(view.volume)}% volume`,
    `Requested by ${escapeMarkdown(playerText(view.requester, "Unknown", 40))}${voice}`
  ].join("\n"));
  embed.setFooter({ text: `${view.queued} up next · ${view.state === "loading" ? "Playback starts when ready" : "Position at last update · Refresh for latest"}` });
  const next = view.nextTrack;
  if (next) {
    embed.addFields({ name: "Up next", value: `${escapeMarkdown(playerText(next.info.title, "Unknown track", 120))}\n${escapeMarkdown(playerText(next.info.author, "Unknown artist", 70))}` });
  }
  return embed;
}

export function resolvePlayerState(hasTrack: boolean, paused: boolean, playing: boolean, awaitingStart: boolean): MusicPlayerState {
  if (paused && hasTrack) return "paused";
  if (awaitingStart) return "loading";
  return hasTrack && playing ? "playing" : "idle";
}

export function playerQueueSnapshot<T>(tracks: readonly T[], track: T | null | undefined, awaitingStart: boolean) {
  // A pending starting track may still occupy the queue's first slot. Compare
  // object identity so an intentional repeat of the same song stays up next.
  const offset = awaitingStart && track != null && tracks[0] === track ? 1 : 0;
  return { nextTrack: tracks[offset], queued: Math.max(0, tracks.length - offset) };
}

export async function currentPanelResult<T>(build: () => Promise<T>, isCurrent: () => boolean): Promise<T | null> {
  if (!isCurrent()) return null;
  const result = await build();
  return isCurrent() ? result : null;
}

export function buildPlayerRows(state: MusicPlayerState, queued = 0, refresh = true) {
  const unavailable = state === "loading" || state === "idle";
  const button = (id: string, label: string, disabled = false, primary = false) => new ButtonBuilder()
    .setCustomId(`music:${id}`).setLabel(label).setStyle(primary ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled);
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("previous", "Previous", unavailable),
      button(state === "paused" ? "resume" : "pause", state === "paused" ? "Resume" : "Pause", unavailable, true),
      button("skip", "Skip", unavailable)
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("queue:0", `Queue · ${queued}`), ...(refresh ? [button("refresh", "Refresh")] : []), button("controls", "More"), button("stop", "Stop").setStyle(ButtonStyle.Danger)
    )
  ];
}

export function isPlayerPanel(author?: string | null, title?: string | null) {
  return Boolean(author && / · (Getting ready|Now playing|Paused|Nothing playing)$/.test(author)) || title === "Now playing" || title === "Loading Track";
}
