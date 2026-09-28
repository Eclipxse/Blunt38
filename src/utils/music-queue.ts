import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, escapeMarkdown } from "discord.js";
import { clampMusicPage, musicPageCount } from "./music-control.js";

export const MUSIC_QUEUE_PAGE_SIZE = 6;

export type QueueTrack = {
  info: {
    title?: string;
    author?: string;
    uri?: string;
    artworkUrl?: string | null;
    duration?: number;
    isStream?: boolean;
  };
  requester?: unknown;
};

export type QueueView = {
  current?: QueueTrack | null;
  tracks: readonly QueueTrack[];
  paused: boolean;
  position: number;
};

function plainText(value: unknown, fallback: string, limit: number) {
  const text = typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim()
    : "";
  const clean = (text || fallback).replace(/@/g, "＠");
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
}

function safeUrl(value?: string | null) {
  if (!value || value.length > 500) return undefined;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    const normalized = url.href.replace(/[()]/g, (character) => character === "(" ? "%28" : "%29");
    return normalized.length <= 500 ? normalized : undefined;
  } catch {
    return undefined;
  }
}

function durationMs(track?: QueueTrack | null) {
  const value = track?.info.duration;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function clock(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(seconds / 3600);
  return hours
    ? `${hours}:${Math.floor(seconds / 60 % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`
    : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function durationLabel(track: QueueTrack) {
  return track.info.isStream ? "Live" : durationMs(track) ? clock(durationMs(track)) : "Duration unknown";
}

function requesterName(track: QueueTrack) {
  const requester = track.requester;
  if (!requester || typeof requester !== "object") return "Unknown";
  const member = requester as Record<string, unknown>;
  const user = member.user && typeof member.user === "object" ? member.user as Record<string, unknown> : member;
  return plainText(member.displayName || user.globalName || user.username || user.tag, "Unknown", 40);
}

export function queuePage(requestedPage: number, count: number) {
  return clampMusicPage(Number.isFinite(requestedPage) ? requestedPage : 0, count, MUSIC_QUEUE_PAGE_SIZE);
}

export function isQueuePanel(title?: string | null) {
  return title === "Queue" || Boolean(title?.startsWith("Music Queue"));
}

export function buildQueueEmbed(view: QueueView, requestedPage: number, brandName: string, color: number) {
  const count = view.tracks.length;
  const page = queuePage(requestedPage, count);
  const pages = musicPageCount(count, MUSIC_QUEUE_PAGE_SIZE);
  const start = page * MUSIC_QUEUE_PAGE_SIZE;
  const upcoming = view.tracks.slice(start, start + MUSIC_QUEUE_PAGE_SIZE);
  const knownDuration = view.tracks.reduce((total, track) => total + (track.info.isStream ? 0 : durationMs(track)), 0);
  const live = view.tracks.some((track) => track.info.isStream);
  const unknown = view.tracks.some((track) => !track.info.isStream && !durationMs(track));
  const time = [knownDuration ? `${clock(knownDuration)} queued` : "", live ? "Live streams" : "", unknown ? "Some durations unknown" : ""]
    .filter(Boolean).join(" · ");
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${plainText(brandName, "Music", 60)} · Music` })
    .setTitle("Queue")
    .setDescription(count ? `**${count} ${count === 1 ? "track" : "tracks"} up next**${time ? `\n${time}` : ""}` : "Your next track starts here.");

  if (view.current) {
    const track = view.current;
    const title = escapeMarkdown(plainText(track.info.title, "Unknown track", 100));
    const uri = safeUrl(track.info.uri);
    const linkedTitle = uri ? `[${title}](${uri})` : title;
    const position = Number.isFinite(view.position) ? Math.max(0, view.position) : 0;
    const timing = track.info.isStream ? "Live" : durationMs(track)
      ? `${clock(Math.min(position, durationMs(track)))} / ${durationLabel(track)}` : durationLabel(track);
    embed.addFields({
      name: view.paused ? "Paused" : "Playing now",
      value: `**${linkedTitle}**\n${escapeMarkdown(plainText(track.info.author, "Unknown artist", 60))} · \`${timing}\`\nRequested by ${escapeMarkdown(requesterName(track))}`
    });
    const artwork = safeUrl(track.info.artworkUrl);
    if (artwork) embed.setThumbnail(artwork);
  } else {
    embed.addFields({ name: "Playing now", value: "Nothing is playing." });
  }

  for (const [index, track] of upcoming.entries()) {
    const number = start + index + 1;
    embed.addFields({
      name: `${number.toString().padStart(2, "0")} · ${escapeMarkdown(plainText(track.info.title, "Unknown track", 90))}`,
      value: `${escapeMarkdown(plainText(track.info.author, "Unknown artist", 60))} · \`${durationLabel(track)}\`\nAdded by ${escapeMarkdown(requesterName(track))}`,
      inline: false
    });
  }
  if (!count) embed.addFields({ name: "Up next", value: "The queue is clear. Add a song with `/play` or choose a result with `/search`." });
  return embed.setFooter({ text: `Page ${page + 1} of ${pages}${count ? ` · Tracks ${start + 1}–${start + upcoming.length} of ${count}` : ""} · Refreshed` })
    .setTimestamp();
}

export function buildQueueRows(view: QueueView, requestedPage: number) {
  const page = queuePage(requestedPage, view.tracks.length);
  const pages = musicPageCount(view.tracks.length, MUSIC_QUEUE_PAGE_SIZE);
  const button = (id: string, label: string, disabled = false, style = ButtonStyle.Secondary) =>
    new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled);
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button(`music:queue:${page - 1}`, "Back", page === 0),
      button("music:queue-page", `${page + 1} / ${pages}`, true),
      button(`music:queue:${page + 1}`, "Next", page === pages - 1),
      button(`music:queue:${page}`, "Refresh")
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button(`music:${view.paused ? "resume" : "pause"}:${page}`, view.paused ? "Resume" : "Pause", !view.current),
      button(`music:skip:${page}`, "Skip", !view.current),
      button("music:controls", "More controls"),
      button("music:stop", "Stop"),
      button("music:clear", "Clear queue", !view.tracks.length, ButtonStyle.Danger)
    )
  ];
}
