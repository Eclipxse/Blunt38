import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type StringSelectMenuInteraction,
  type User
} from "discord.js";
import {
  LavalinkManager,
  type Player,
  type RepeatMode,
  type SearchPlatform,
  type Track,
  type UnresolvedTrack
} from "lavalink-client";
import { env } from "../env.js";
import {
  classifyMusicPlaybackEnd,
  clampMusicPage,
  isConfidentMusicMatch,
  musicPageCount,
  progressBar
} from "../utils/music-control.js";
import { palette } from "../utils/ui.js";
import { getGuildConfig } from "./store.js";
import { buildVisualAttachment } from "./visual-message.js";
import {
  resolveYoutubeAudio,
  shouldResolveYoutubeInput,
  type ResolvedYoutubeAudio
} from "./youtube-resolver.js";

let manager: LavalinkManager | null = null;

type MusicPanelTarget = {
  channelId: string;
  messageId: string;
};

type MusicInteraction = ChatInputCommandInteraction | StringSelectMenuInteraction;
type MusicTrack = Track | UnresolvedTrack;

type MusicSearchSession = {
  guildId: string;
  userId: string;
  tracks: MusicTrack[];
  expiresAt: number;
};

type MusicPlaybackFailure = {
  at: number;
  detail: string;
  identifier?: string;
};

type MusicRecoveryState = {
  originalTitle: string;
  originalAuthor?: string;
  attempts: number;
  attemptedIdentifiers: string[];
  attemptedSources: SearchPlatform[];
};

export type MusicFilterPreset = "off" | "balanced" | "bassboost" | "nightcore" | "vaporwave" | "karaoke";

export const musicFilterChoices: Array<{ name: string; value: MusicFilterPreset }> = [
  { name: "Off / Original", value: "off" },
  { name: "Balanced", value: "balanced" },
  { name: "Bass Boost", value: "bassboost" },
  { name: "Nightcore", value: "nightcore" },
  { name: "Vaporwave", value: "vaporwave" },
  { name: "Karaoke", value: "karaoke" }
];

const musicSearchSessions = new Map<string, MusicSearchSession>();
const queuePageSize = 8;
const maxPlaybackRecoveryAttempts = 2;

const lavalinkUnavailableMessage =
  "Lavalink is not ready right now. Start/restart Lavalink, wait until /v4/info responds, then restart the bot so it can attach to a usable node.";
const spotifyUnavailableMessage =
  "Spotify links are not enabled on Lavalink yet. Use a song name or YouTube link for now, or enable the LavaSrc Spotify plugin with Spotify client credentials.";

function isMissingLavalinkNodeError(error: unknown) {
  return error instanceof Error && /no lavalink node/i.test(error.message);
}

function isSpotifySourceError(error: unknown) {
  return error instanceof Error && /spotify/i.test(error.message) && /enabled|source|lavasrc/i.test(error.message);
}

function explainLavalinkError(error: unknown): never {
  if (isMissingLavalinkNodeError(error)) {
    throw new Error(lavalinkUnavailableMessage);
  }

  if (isSpotifySourceError(error)) {
    throw new Error(spotifyUnavailableMessage);
  }

  throw error;
}

export function initMusic(client: Client<true>) {
  manager = new LavalinkManager({
    nodes: [
      {
        id: "main",
        host: env.lavalinkHost,
        port: env.lavalinkPort,
        authorization: env.lavalinkPassword,
        secure: env.lavalinkSecure
      }
    ],
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    client: {
      id: client.user.id,
      username: client.user.username
    },
    autoSkip: true,
    playerOptions: {
      defaultSearchPlatform: env.musicSearchSource as SearchPlatform,
      volumeDecrementer: 1,
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false
      },
      minAutoPlayMs: 4_000,
      onEmptyQueue: {
        autoPlayFunction: async (player, lastTrack) => {
          if (!player.getData<boolean>("musicAutoplayEnabled")) return;

          try {
            const requester = lastTrack.requester ?? client.user;
            const result = await player.search(
              {
                query: `${lastTrack.info.author ?? "music"} mix`,
                source: env.musicSearchSource as SearchPlatform
              },
              requester
            );
            const recentIds = new Set([
              lastTrack.info.identifier,
              ...player.queue.previous.slice(0, 8).map((track) => track.info.identifier)
            ]);
            const recommendation = result.tracks.find((track) => {
              return !track.info.identifier || !recentIds.has(track.info.identifier);
            });
            if (!recommendation) return;

            player.queue.add(recommendation);
            console.info(
              `[music:autoplay] guild=${player.guildId} picked=${recommendation.info.identifier}`
            );
          } catch (error) {
            console.error(`[music:autoplay-error] guild=${player.guildId}`, error);
          }
        },
        destroyAfterMs: 60_000
      }
    },
    queueOptions: {
      maxPreviousTracks: 10
    }
  });

  manager.nodeManager.on("connect", (node) => {
    console.log(`Lavalink node "${node.id}" connected.`);
  });

  manager.nodeManager.on("error", (node, error) => {
    console.error(`Lavalink node "${node.id}" error:`, error.message);
  });

  manager.on("trackStart", async (player, track) => {
    applyYoutubeResolverMetadata(track);

    const lastFailure = player.getData<MusicPlaybackFailure>("musicLastPlaybackFailure");
    if (lastFailure && lastFailure.identifier !== track?.info.identifier) {
      player.deleteData("musicLastPlaybackFailure");
    }

    const recovery = player.getData<MusicRecoveryState>("musicRecoveryState");
    if (
      recovery
      && track?.info.identifier
      && !recovery.attemptedIdentifiers.includes(track.info.identifier)
    ) {
      player.deleteData("musicRecoveryState");
    }

    const requestedAt = player.getData<number>("musicRequestStartedAt");
    if (Number.isFinite(requestedAt)) {
      console.info(
        `[music:track-start] guild=${player.guildId} node=${player.node.id} ready=${Math.round(performance.now() - requestedAt)}ms`
      );
      player.deleteData("musicRequestStartedAt");
    }

    const channel = player.textChannelId ? await client.channels.fetch(player.textChannelId).catch(() => null) : null;
    if (!channel?.isTextBased() || channel.isDMBased() || !track) return;
    const guild = client.guilds.cache.get(player.guildId);
    const requester = track.requester as User | undefined;
    const visual =
      guild && requester && typeof requester.displayAvatarURL === "function"
        ? await buildVisualAttachment({
            guildId: player.guildId,
            studioType: "music",
            user: requester,
            variables: {
              user: requester.username,
              mention: `@${requester.username}`,
              server: guild.name,
              track: track.info.title,
              artist: track.info.author ?? "Unknown",
              duration: formatTrackDuration(track)
            },
            fileName: "now-playing"
          }).catch((error) => {
            console.error("Visual music render failed:", error);
            return null;
          })
        : null;
    const panelPayload = visual
      ? {
          content: `${trackLabel(track)}\nRequested by **${getRequesterName(track)}**`,
          embeds: [],
          files: [visual],
          components: musicControlRows(player)
        }
      : {
          content: undefined,
          embeds: [nowPlayingEmbed(player, track)],
          components: musicControlRows(player)
        };

    const panelTarget = player.getData<MusicPanelTarget>("musicPanelTarget");
    if (panelTarget?.channelId === channel.id && "messages" in channel) {
      const panelMessage = await channel.messages.fetch(panelTarget.messageId).catch(() => null);
      if (panelMessage) {
        await panelMessage.edit(panelPayload).catch(() => null);
        return;
      }
    }

    const sent = await channel.send(panelPayload).catch(() => null);
    if (sent) player.setData("musicPanelTarget", { channelId: sent.channelId, messageId: sent.id });
  });

  manager.on("trackError", (player, track, payload) => {
    const detail = playbackFailureDetail(payload);
    recordPlaybackFailure(player, track, detail);
    console.error(
      `[music:track-error] guild=${player.guildId} node=${player.node.id} track=${track?.info.identifier ?? "unknown"} detail=${detail}`
    );
    void recoverPlayback(client, player, track, payload).catch((error) => {
      console.error(`[music:failure-handler-error] guild=${player.guildId}`, error);
    });
  });

  manager.on("trackStuck", (player, track, payload) => {
    const detail = playbackFailureDetail(payload);
    recordPlaybackFailure(player, track, detail);
    console.error(
      `[music:track-stuck] guild=${player.guildId} node=${player.node.id} track=${track?.info.identifier ?? "unknown"} detail=${detail}`
    );
    void recoverPlayback(client, player, track, payload).catch((error) => {
      console.error(`[music:failure-handler-error] guild=${player.guildId}`, error);
    });
  });

  manager.on("queueEnd", async (player, track, payload) => {
    const reason = payload.type === "TrackEndEvent" ? payload.reason : undefined;
    const endState = classifyMusicPlaybackEnd(payload.type, reason);

    if (endState === "silent") {
      if (player.getData<boolean>("musicRecoveryInFlight")) return;
      clearPlaybackRecovery(player);
      return;
    }

    if (endState === "failed") {
      await recoverPlayback(client, player, track, payload);
      return;
    }

    clearPlaybackRecovery(player);
    await updateMusicPanel(client, player, musicEmbed("Queue Finished", "No more tracks in the queue."));
  });

  void manager.init({
    id: client.user.id,
    username: client.user.username
  });

  return manager;
}

export function handleMusicRaw(data: unknown) {
  void manager?.sendRawData(data as never).catch(() => null);
}

export function getMusicManager() {
  return manager;
}

export function getMusicPlayer(guildId: string) {
  return manager?.getPlayer(guildId);
}

export function musicIsReady() {
  return Boolean(manager?.useable);
}

export async function createOrGetMusicPlayer(interaction: MusicInteraction) {
  if (!interaction.guild || !interaction.guildId) {
    throw new Error("Music commands only work in servers.");
  }

  if (!musicIsReady() || !manager) {
    throw new Error("Lavalink is offline. Start Lavalink on the VPS, then restart or wait for the bot to reconnect.");
  }

  const member = interaction.guild.members.cache.get(interaction.user.id)
    ?? await interaction.guild.members.fetch(interaction.user.id);
  const voiceChannelId = member.voice.channelId;
  if (!voiceChannelId) {
    throw new Error("Join a voice channel first.");
  }

  const me = interaction.guild.members.me ?? await interaction.guild.members.fetchMe().catch(() => null);
  if (me?.voice.channelId && me.voice.channelId !== voiceChannelId) {
    throw new Error("I am already playing in another voice channel.");
  }

  const existingPlayer = manager.getPlayer(interaction.guildId);
  const config = existingPlayer
    ? null
    : await getGuildConfig(interaction.guildId).catch((error) => {
        console.error(`[music:config-error] guild=${interaction.guildId}`, error);
        return null;
      });
  const defaultVolume = Math.max(1, Math.min(100, config?.musicDefaultVolume ?? env.musicDefaultVolume));

  const player = manager.createPlayer({
    guildId: interaction.guildId,
    voiceChannelId,
    textChannelId: interaction.channelId,
    selfDeaf: true,
    selfMute: false,
    volume: defaultVolume
  });

  if (!existingPlayer) {
    if (config?.musicDjRoleId) player.setData("musicDjRoleId", config.musicDjRoleId);
    player.setData("musicAutoplayEnabled", config?.musicAutoplayEnabled ?? false);
    player.setData("musicFilterPreset", "off");
  }

  return {
    player,
    shouldConnect: me?.voice.channelId !== voiceChannelId
  };
}

export async function playQuery(interaction: ChatInputCommandInteraction, query: string) {
  const startedAt = performance.now();
  const { player, shouldConnect } = await createOrGetMusicPlayer(interaction);
  const useYtDlp = env.musicYtDlpEnabled && shouldResolveYoutubeInput(query);
  const searchQuery = isUrl(query)
    ? query
    : { query, source: env.musicSearchSource as SearchPlatform };

  const searchStartedAt = performance.now();
  let searchMs = 0;
  let connectMs = 0;

  const searchPromise = (useYtDlp
    ? searchYoutubeWithYtDlp(player, query, interaction.user)
    : player.search(searchQuery, interaction.user))
    .then((result) => {
      searchMs = performance.now() - searchStartedAt;
      return result;
    })
    .catch((error: unknown) => {
      console.error(
        `[music:search-error] guild=${interaction.guildId} node=${player.node.id} after=${Math.round(performance.now() - searchStartedAt)}ms`,
        error
      );
      explainLavalinkError(error);
    });

  const connectPromise = shouldConnect
    ? player.connect()
      .then(() => {
        connectMs = performance.now() - searchStartedAt;
      })
      .catch((error: unknown) => {
        console.error(
          `[music:connect-error] guild=${interaction.guildId} node=${player.node.id} after=${Math.round(performance.now() - searchStartedAt)}ms`,
          error
        );
        explainLavalinkError(error);
      })
    : Promise.resolve();

  const [result] = await Promise.all([searchPromise, connectPromise]);

  if (!result.tracks.length) {
    throw new Error("No tracks found.");
  }

  const tracks = result.loadType === "playlist" ? result.tracks : [result.tracks[0]!];
  player.queue.add(tracks);

  const startsPlayback = !player.playing && !player.paused;

  if (startsPlayback) {
    const first = tracks[0];
    const loadingMessage = await interaction.editReply({
      embeds: [musicEmbed("Loading Track", `${trackLabel(first)}\nGetting the deck ready...`)],
      components: musicControlRows(player)
    });

    player.setData("musicPanelTarget", {
      channelId: loadingMessage.channelId,
      messageId: loadingMessage.id
    });
    player.setData("musicRequestStartedAt", startedAt);
    await player.play().catch((error: unknown) => {
      explainLavalinkError(error);
    });
  }

  console.info(
    `[music:play] guild=${interaction.guildId} node=${player.node.id} source=${useYtDlp ? "yt-dlp" : isUrl(query) ? "url" : env.musicSearchSource} `
    + `connect=${Math.round(connectMs)}ms search=${Math.round(searchMs)}ms command=${Math.round(performance.now() - startedAt)}ms`
  );

  return { player, result, added: tracks, startsPlayback };
}

export async function createMusicSearch(interaction: ChatInputCommandInteraction, query: string) {
  const { player } = await createOrGetMusicPlayer(interaction);
  const result = await player.search(
    { query, source: env.musicSearchSource as SearchPlatform },
    interaction.user
  ).catch((error: unknown) => explainLavalinkError(error));
  const tracks = result.tracks.slice(0, 5);
  if (!tracks.length) throw new Error("No tracks found.");

  const sessionId = randomUUID().replaceAll("-", "").slice(0, 16);
  musicSearchSessions.set(sessionId, {
    guildId: interaction.guildId!,
    userId: interaction.user.id,
    tracks,
    expiresAt: Date.now() + 5 * 60_000
  });

  return { sessionId, tracks };
}

export function musicSearchRow(sessionId: string, tracks: MusicTrack[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`music:search:${sessionId}`)
      .setPlaceholder("Pick the exact track")
      .addOptions(
        tracks.map((track, index) => ({
          label: truncate(track.info.title, 100),
          description: truncate(`${track.info.author ?? "Unknown"} - ${formatTrackDuration(track)}`, 100),
          value: String(index)
        }))
      )
  );
}

export function consumeMusicSearchSession(sessionId: string, userId: string, guildId: string) {
  const now = Date.now();
  for (const [id, session] of musicSearchSessions) {
    if (session.expiresAt <= now) musicSearchSessions.delete(id);
  }

  const session = musicSearchSessions.get(sessionId);
  if (!session || session.expiresAt <= now) throw new Error("That search expired. Run `/music search` again.");
  if (session.userId !== userId) throw new Error("That track picker belongs to someone else.");
  if (session.guildId !== guildId) throw new Error("That track picker belongs to another server.");

  musicSearchSessions.delete(sessionId);
  return session;
}

export async function queueSearchResult(interaction: StringSelectMenuInteraction, track: MusicTrack) {
  const startedAt = performance.now();
  const { player, shouldConnect } = await createOrGetMusicPlayer(interaction);
  if (shouldConnect) await player.connect().catch((error: unknown) => explainLavalinkError(error));

  player.queue.add(track);
  const startsPlayback = !player.playing && !player.paused;
  if (startsPlayback) {
    player.setData("musicRequestStartedAt", startedAt);
    await player.play().catch((error: unknown) => explainLavalinkError(error));
  }

  return { player, startsPlayback };
}

export async function applyMusicFilter(player: Player, preset: MusicFilterPreset) {
  await player.filterManager.resetFilters();

  if (preset === "balanced") await player.filterManager.setEQPreset("BetterMusic");
  if (preset === "bassboost") await player.filterManager.setEQPreset("BassboostMedium");
  if (preset === "nightcore") await player.filterManager.toggleNightcore(1.15, 1.15, 1);
  if (preset === "vaporwave") await player.filterManager.toggleVaporwave(0.9, 0.85, 1);
  if (preset === "karaoke") await player.filterManager.toggleKaraoke();

  player.setData("musicFilterPreset", preset);
}

export function isMusicFilterPreset(value: string): value is MusicFilterPreset {
  return musicFilterChoices.some((choice) => choice.value === value);
}

export async function ensureMusicController(
  interaction: { guildId: string | null; guild?: { members: { fetch(userId: string): Promise<GuildMember> } } | null; user: { id: string } },
  player: Player
) {
  const member = await ensureSameVoice(interaction, player);
  const djRoleId = player.getData<string>("musicDjRoleId");
  if (!djRoleId) return member;

  const bypass = member.permissions.has(PermissionFlagsBits.ManageGuild)
    || member.permissions.has(PermissionFlagsBits.MoveMembers)
    || member.roles.cache.has(djRoleId);
  if (!bypass) throw new Error(`You need the <@&${djRoleId}> role to control this player.`);
  return member;
}

export function setPlayerMusicSettings(player: Player, input: {
  djRoleId?: string | null;
  autoplayEnabled?: boolean;
}) {
  if (input.djRoleId === null) player.deleteData("musicDjRoleId");
  if (typeof input.djRoleId === "string") player.setData("musicDjRoleId", input.djRoleId);
  if (typeof input.autoplayEnabled === "boolean") {
    player.setData("musicAutoplayEnabled", input.autoplayEnabled);
  }
}

export function getRequesterName(track?: Track | UnresolvedTrack | null) {
  const requester = track?.requester as GuildMember | { username?: string; tag?: string } | undefined;
  if (!requester) return "Unknown";
  if ("displayName" in requester) return requester.displayName;
  return requester.username ?? requester.tag ?? "Unknown";
}

export function trackLabel(track?: Track | UnresolvedTrack | null) {
  if (!track) return "Nothing playing";
  const info = track.info;
  const title = info.uri ? `[${info.title}](${info.uri})` : info.title;
  return `${title}\nby **${info.author ?? "Unknown"}**`;
}

export function formatTrackDuration(track?: Track | UnresolvedTrack | null) {
  if (!track) return "0:00";
  if (track.info.isStream) return "Live";
  return formatMs(track.info.duration ?? 0);
}

export function formatMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function musicEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(palette.electric)
    .setAuthor({ name: `${env.brandName} Music Deck` })
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

export function nowPlayingEmbed(player: Player, track = player.queue.current) {
  const duration = track?.info.duration ?? 0;
  const position = Math.max(0, player.position ?? 0);
  const progress = track?.info.isStream
    ? "`LIVE`"
    : `\`${formatMs(position)}\` ${progressBar(position, duration)} \`${formatMs(duration)}\``;
  const filter = player.getData<MusicFilterPreset>("musicFilterPreset") ?? "off";
  const autoplay = player.getData<boolean>("musicAutoplayEnabled") ?? false;
  const built = musicEmbed("Now Playing", trackLabel(track))
    .addFields(
      { name: "Progress", value: progress, inline: false },
      { name: "Volume", value: `\`${player.volume}%\``, inline: true },
      { name: "Loop", value: `\`${player.repeatMode}\``, inline: true },
      { name: "Filter", value: `\`${filter}\``, inline: true },
      { name: "Autoplay", value: autoplay ? "`on`" : "`off`", inline: true },
      { name: "Requested By", value: getRequesterName(track), inline: true },
      { name: "Queue", value: `\`${player.queue.tracks.length} track(s)\``, inline: true }
    );

  const artwork = track?.info.artworkUrl;
  if (artwork) built.setThumbnail(artwork);
  return built;
}

export function queueEmbed(player: Player, requestedPage = 0) {
  const page = clampMusicPage(requestedPage, player.queue.tracks.length, queuePageSize);
  const pages = musicPageCount(player.queue.tracks.length, queuePageSize);
  const start = page * queuePageSize;
  const current = player.queue.current ? `**Now:** ${player.queue.current.info.title}` : "**Now:** Nothing playing";
  const upcoming = player.queue.tracks.slice(start, start + queuePageSize).map((track, index) => {
    return `\`${start + index + 1}.\` ${track.info.title} - ${formatTrackDuration(track)}`;
  });
  const totalDuration = player.queue.tracks.reduce((sum, track) => {
    return track.info.isStream ? sum : sum + (track.info.duration ?? 0);
  }, 0);

  return musicEmbed(
    `Music Queue - Page ${page + 1}/${pages}`,
    [current, "", upcoming.length ? upcoming.join("\n") : "No upcoming tracks."].join("\n")
  ).addFields(
    { name: "Upcoming", value: `\`${player.queue.tracks.length}\``, inline: true },
    { name: "Queue Time", value: `\`${formatMs(totalDuration)}\``, inline: true }
  );
}

export function musicControlRows(player?: Player) {
  const paused = Boolean(player?.paused);
  const autoplay = player?.getData<boolean>("musicAutoplayEnabled") ?? false;
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(paused ? "music:resume" : "music:pause")
        .setEmoji(paused ? "▶️" : "⏸️")
        .setLabel(paused ? "Resume" : "Pause")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("music:previous").setEmoji("⏮️").setLabel("Previous").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music:skip").setEmoji("⏭️").setLabel("Skip").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music:stop").setEmoji("⏹️").setLabel("Stop").setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("music:loop")
        .setEmoji("🔁")
        .setLabel(`Loop: ${player?.repeatMode ?? "off"}`)
        .setStyle(player?.repeatMode === "off" ? ButtonStyle.Secondary : ButtonStyle.Success)
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("music:replay").setEmoji("↩️").setLabel("Replay").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music:shuffle").setEmoji("🔀").setLabel("Shuffle").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music:autoplay")
        .setEmoji("♾️")
        .setLabel(`Auto: ${autoplay ? "on" : "off"}`)
        .setStyle(autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music:queue:0").setEmoji("📜").setLabel("Queue").setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("music:filter")
        .setPlaceholder(`Sound filter: ${player?.getData<MusicFilterPreset>("musicFilterPreset") ?? "off"}`)
        .addOptions(musicFilterChoices.map((choice) => ({
          label: choice.name,
          value: choice.value,
          description: filterDescription(choice.value)
        })))
    )
  ];
}

export function musicQueueRows(player: Player, requestedPage = 0) {
  const page = clampMusicPage(requestedPage, player.queue.tracks.length, queuePageSize);
  const pages = musicPageCount(player.queue.tracks.length, queuePageSize);
  return [
    ...musicControlRows(player),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`music:queue:${page - 1}`)
        .setEmoji("⬅️")
        .setLabel("Previous page")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`music:queue:${page + 1}`)
        .setEmoji("➡️")
        .setLabel("Next page")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= pages - 1),
      new ButtonBuilder()
        .setCustomId("music:clear")
        .setEmoji("🧹")
        .setLabel("Clear upcoming")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(player.queue.tracks.length === 0)
    )
  ];
}

export async function ensureSameVoice(interaction: { guildId: string | null; guild?: { members: { fetch(userId: string): Promise<GuildMember> } } | null; user: { id: string } }, player: Player) {
  if (!interaction.guild || !interaction.guildId) throw new Error("Music controls only work in servers.");
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.voice.channelId || member.voice.channelId !== player.voiceChannelId) {
    throw new Error("Join my voice channel first.");
  }
  return member;
}

async function updateMusicPanel(client: Client<true>, player: Player, embed: EmbedBuilder) {
  const channel = player.textChannelId
    ? await client.channels.fetch(player.textChannelId).catch(() => null)
    : null;
  if (!channel?.isTextBased() || channel.isDMBased()) return;

  const panelTarget = player.getData<MusicPanelTarget>("musicPanelTarget");
  if (panelTarget?.channelId === channel.id && "messages" in channel) {
    const panelMessage = await channel.messages.fetch(panelTarget.messageId).catch(() => null);
    if (panelMessage) {
      await panelMessage.edit({
        content: null,
        embeds: [embed],
        components: [],
        attachments: []
      }).catch(() => null);
      return;
    }
  }

  const sent = await channel.send({ embeds: [embed] }).catch(() => null);
  if (sent) player.setData("musicPanelTarget", { channelId: sent.channelId, messageId: sent.id });
}

async function recoverPlayback(
  client: Client<true>,
  player: Player,
  failedTrack: MusicTrack | null,
  payload: unknown
) {
  if (player.getData<boolean>("musicRecoveryInFlight")) return;
  player.setData("musicRecoveryInFlight", true);

  try {
    const recovery = await findPlaybackRecovery(player, failedTrack, client.user);
    if (recovery) {
      await updateMusicPanel(
        client,
        player,
        musicEmbed(
          "Trying Another Source",
          `${trackLabel(failedTrack)}\nThe stream froze, so I am retrying through **${recovery.sourceLabel}**.`
        )
      );
      player.setData("musicRequestStartedAt", performance.now());

      try {
        await player.play({
          clientTrack: recovery.track,
          noReplace: false,
          paused: false,
          position: 0
        });
        console.info(
          `[music:recovery] guild=${player.guildId} node=${player.node.id} source=${recovery.source} track=${recovery.track.info.identifier}`
        );
        return;
      } catch (error) {
        const detail = playbackFailureDetail(error);
        recordPlaybackFailure(player, recovery.track, detail);
        console.error(`[music:recovery-error] guild=${player.guildId} detail=${detail}`);
      }
    }

    const failure = player.getData<MusicPlaybackFailure>("musicLastPlaybackFailure");
    const recentFailure = failure && Date.now() - failure.at < 30_000 ? failure : null;
    const detail = friendlyPlaybackFailure(recentFailure?.detail ?? playbackFailureDetail(payload));
    clearPlaybackRecovery(player);
    await updateMusicPanel(
      client,
      player,
      musicEmbed(
        "Playback Failed",
        `${trackLabel(failedTrack)}\n${detail}\n\nTry another result or check the Lavalink logs for the exact source error.`
      )
    );
  } finally {
    player.deleteData("musicRecoveryInFlight");
  }
}

function recordPlaybackFailure(player: Player, track: MusicTrack | null, detail: string) {
  player.setData("musicLastPlaybackFailure", {
    at: Date.now(),
    detail,
    identifier: track?.info.identifier
  } satisfies MusicPlaybackFailure);
}

async function findPlaybackRecovery(player: Player, failedTrack: MusicTrack | null, requester: User) {
  if (!failedTrack || isYoutubeTrack(failedTrack)) return null;

  const failedIdentifier = musicTrackKey(failedTrack);
  const state = player.getData<MusicRecoveryState>("musicRecoveryState") ?? {
    originalTitle: failedTrack.info.title,
    originalAuthor: failedTrack.info.author,
    attempts: 0,
    attemptedIdentifiers: failedIdentifier ? [failedIdentifier] : [],
    attemptedSources: []
  } satisfies MusicRecoveryState;

  if (state.attempts >= maxPlaybackRecoveryAttempts) return null;

  const query = `${state.originalTitle} ${state.originalAuthor ?? ""}`.trim();
  for (const source of playbackRecoverySources()) {
    if (state.attemptedSources.includes(source)) continue;
    state.attemptedSources.push(source);
    player.setData("musicRecoveryState", state);

    const result = await player.search({ query, source }, failedTrack.requester ?? requester).catch((error) => {
      console.error(
        `[music:recovery-search-error] guild=${player.guildId} source=${source} detail=${playbackFailureDetail(error)}`
      );
      return null;
    });
    const candidate = result?.tracks.find((track) => {
      const key = musicTrackKey(track);
      return Boolean(key)
        && !state.attemptedIdentifiers.includes(key)
        && isConfidentMusicMatch(
          state.originalTitle,
          state.originalAuthor,
          track.info.title,
          track.info.author
        );
    });
    if (!candidate) continue;

    const candidateKey = musicTrackKey(candidate);
    state.attempts += 1;
    if (candidateKey) state.attemptedIdentifiers.push(candidateKey);
    player.setData("musicRecoveryState", state);
    return {
      source,
      sourceLabel: musicSourceLabel(source),
      track: candidate
    };
  }

  return null;
}

function playbackRecoverySources(): SearchPlatform[] {
  const configured = env.musicSearchSource as SearchPlatform;
  const sources: SearchPlatform[] = configured.toString().startsWith("ytm")
    ? ["scsearch", "ytsearch", configured]
    : configured.toString().startsWith("yt")
      ? ["scsearch", "ytmsearch", configured]
      : [configured, "ytmsearch", "scsearch"];
  return [...new Set(sources)];
}

function musicSourceLabel(source: SearchPlatform) {
  if (source === "ytmsearch") return "YouTube Music";
  if (source === "ytsearch") return "YouTube";
  if (source === "scsearch") return "SoundCloud";
  return String(source);
}

function musicTrackKey(track: MusicTrack) {
  return track.info.identifier || track.info.uri || "";
}

async function searchYoutubeWithYtDlp(player: Player, query: string, requester: User) {
  const resolved = await resolveYoutubeAudio({
    query,
    executable: env.musicYtDlpPath,
    timeoutMs: env.musicYtDlpTimeoutMs
  });
  const result = await player.search(resolved.streamUrl, requester);
  const track = result.tracks[0];
  if (!track) throw new Error("yt-dlp resolved the video, but Lavalink could not load its audio stream.");

  track.userData = {
    ...track.userData,
    blunt38Resolver: "yt-dlp",
    blunt38YoutubeId: resolved.id,
    blunt38Title: resolved.title,
    blunt38Author: resolved.author,
    blunt38DurationMs: resolved.durationMs,
    blunt38WebpageUrl: resolved.webpageUrl,
    blunt38ArtworkUrl: resolved.artworkUrl,
    blunt38IsLive: resolved.isLive ? "true" : "false"
  };
  applyResolvedYoutubeInfo(track, resolved);
  return result;
}

function applyYoutubeResolverMetadata(track: MusicTrack | null) {
  if (!track || track.userData?.blunt38Resolver !== "yt-dlp") return;
  const data = track.userData;
  const durationMs = typeof data.blunt38DurationMs === "number" ? data.blunt38DurationMs : 0;
  applyResolvedYoutubeInfo(track, {
    id: String(data.blunt38YoutubeId ?? track.info.identifier ?? "youtube"),
    title: String(data.blunt38Title ?? track.info.title ?? "YouTube"),
    author: String(data.blunt38Author ?? track.info.author ?? "YouTube"),
    durationMs,
    webpageUrl: String(data.blunt38WebpageUrl ?? track.info.uri ?? ""),
    artworkUrl: typeof data.blunt38ArtworkUrl === "string" ? data.blunt38ArtworkUrl : null,
    streamUrl: "",
    isLive: data.blunt38IsLive === "true"
  });
}

function applyResolvedYoutubeInfo(track: MusicTrack, resolved: ResolvedYoutubeAudio) {
  track.info.identifier = resolved.id;
  track.info.title = resolved.title;
  track.info.author = resolved.author;
  track.info.duration = resolved.durationMs;
  track.info.uri = resolved.webpageUrl;
  track.info.artworkUrl = resolved.artworkUrl;
  track.info.sourceName = "youtube";
  track.info.isStream = resolved.isLive;
  track.info.isSeekable = !resolved.isLive;
}

function isYoutubeTrack(track: MusicTrack) {
  if (track.userData?.blunt38Resolver === "yt-dlp") return true;
  try {
    const host = new URL(track.info.uri ?? "").hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com");
  } catch {
    return track.info.sourceName === "youtube" || track.info.sourceName === "youtubemusic";
  }
}

function playbackFailureDetail(payload: unknown) {
  if (payload instanceof Error) return cleanPlaybackDetail(payload.message);
  if (!payload || typeof payload !== "object") return "The audio stream ended before playback began.";

  const event = payload as Record<string, unknown>;
  const exception = event.exception && typeof event.exception === "object"
    ? event.exception as Record<string, unknown>
    : null;
  const details = [
    exception?.message,
    exception?.cause,
    event.error,
    typeof event.thresholdMs === "number" ? `Track was stuck for ${event.thresholdMs}ms` : null,
    event.reason === "loadFailed" ? "Lavalink could not load the selected audio stream" : null
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return cleanPlaybackDetail([...new Set(details)].join(" - ") || "The audio stream ended before playback began.");
}

function cleanPlaybackDetail(detail: string) {
  return truncate(detail.replace(/\s+/g, " ").trim(), 600);
}

function friendlyPlaybackFailure(detail: string) {
  if (/\b403\b|forbidden/i.test(detail)) {
    return "The source rejected the audio stream (HTTP 403). Lavalink's YouTube OAuth or source plugin needs attention.";
  }
  if (/\b429\b|rate.?limit/i.test(detail)) {
    return "The source rate-limited this server (HTTP 429). Wait a little or use a different source.";
  }
  if (/oauth|sign.?in|login|authentication/i.test(detail)) {
    return "The source authentication expired or was rejected. Refresh Lavalink's YouTube OAuth session.";
  }
  if (/age.?restrict|copyright|not available|region/i.test(detail)) {
    return "That upload is restricted or unavailable to this Lavalink server.";
  }
  return `Lavalink reported: ${truncate(detail.replace(/[`*_~]/g, ""), 400)}`;
}

function clearPlaybackRecovery(player: Player) {
  player.deleteData("musicLastPlaybackFailure");
  player.deleteData("musicRecoveryState");
  player.deleteData("musicRequestStartedAt");
}

function filterDescription(preset: MusicFilterPreset) {
  if (preset === "off") return "Original audio with every filter removed";
  if (preset === "balanced") return "A cleaner, fuller everyday EQ";
  if (preset === "bassboost") return "Medium low-end boost without destroying the mix";
  if (preset === "nightcore") return "Faster playback with a higher pitch";
  if (preset === "vaporwave") return "Slower playback with a lower pitch";
  return "Reduce centered vocals when the source allows it";
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function isUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeLoopMode(mode: string): RepeatMode {
  if (mode === "track" || mode === "queue") return mode;
  return "off";
}
