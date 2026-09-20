import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import {
  applyMusicFilter,
  cancelMusicRecovery,
  cancelSpotifyQueueWarmup,
  createMusicSearch,
  ensureMusicController,
  formatTrackDuration,
  getMusicPlayer,
  isMusicFilterPreset,
  musicFilterChoices,
  musicControlRows,
  musicEmbed,
  musicQueueRows,
  musicSearchRow,
  normalizeLoopMode,
  nowPlayingEmbed,
  playQuery,
  queueEmbed,
  setPlayerMusicSettings,
  startMusicPlayback,
  trackLabel
} from "../services/music.js";
import { getGuildConfig, updateGuildConfig } from "../services/store.js";
import { parseSeekPosition } from "../utils/music-control.js";
import { createMusicCommands } from "./music-command-data.js";

export const musicCommands = createMusicCommands(executeMusicAction, musicFilterChoices);

// Keep nested /music requests working while Discord clients refresh the command menu.
export async function executeMusicAction(interaction: ChatInputCommandInteraction, subcommand: string) {
  if (subcommand === "play") {
    await interaction.deferReply();

    try {
      const query = interaction.options.getString("query", true);
      const { player, result, added, startsPlayback, spotifySummary, spotifyQueueWarmup } = await playQuery(interaction, query);
      if (startsPlayback) {
        if (spotifySummary && spotifySummary.total > 1) {
          const pending = spotifySummary.total - spotifySummary.resolved - spotifySummary.skipped;
          await interaction.followUp({
            embeds: [musicEmbed(
              "Spotify Queue Warming",
              [
                `**${spotifySummary.name}**`,
                "Playing the first verified match now.",
                `Resolving **${Math.max(0, pending)}** remaining track(s) in the background.`
              ].join("\n")
            )]
          });

          void spotifyQueueWarmup?.then(async (warmup) => {
            if (warmup.cancelled) return;
            await interaction.followUp({
              embeds: [musicEmbed(
                "Spotify Queue Ready",
                [
                  `**${spotifySummary.name}**`,
                  `Added **${warmup.added + spotifySummary.resolved}/${spotifySummary.total}** tracks in order.`,
                  warmup.skipped ? `**${warmup.skipped}** track(s) could not be resolved.` : "Every public track found a playable match."
                ].join("\n")
              )]
            }).catch(() => null);
          });
        }
        return;
      }

      const first = added[0];
      const description = spotifySummary
        ? [
            `**${spotifySummary.name}**`,
            "Queued the first verified track now.",
            spotifySummary.total > spotifySummary.resolved
              ? "The rest of the queue is warming in the background."
              : "Every public track found a playable match."
          ].join("\n")
        : result.loadType === "playlist"
        ? `Queued **${added.length}** tracks from **${result.playlist?.name ?? "playlist"}**.`
        : `Queued ${trackLabel(first)}\nDuration: \`${formatTrackDuration(first)}\``;

      await interaction.editReply({
        embeds: [musicEmbed("Added To Queue", description)],
        components: musicControlRows(player)
      });
    } catch (error) {
      await interaction.editReply(error instanceof Error ? error.message : "Could not play that track.");
    }

    return;
  }

  if (subcommand === "search") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const query = interaction.options.getString("query", true);
      const { sessionId, tracks } = await createMusicSearch(interaction, query);
      const results = tracks.map((track, index) => {
        return `\`${index + 1}.\` **${track.info.title}**\n${track.info.author ?? "Unknown"} - \`${formatTrackDuration(track)}\``;
      });
      await interaction.editReply({
        embeds: [musicEmbed("Pick The Right Track", results.join("\n\n"))],
        components: [musicSearchRow(sessionId, tracks)]
      });
    } catch (error) {
      await interaction.editReply(error instanceof Error ? error.message : "Could not search for music.");
    }
    return;
  }

  if (subcommand === "settings") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: "You need Manage Server to change music settings.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const role = interaction.options.getRole("dj_role");
      const clearDjRole = interaction.options.getBoolean("clear_dj_role") ?? false;
      const defaultVolume = interaction.options.getInteger("default_volume");
      const autoplayDefault = interaction.options.getBoolean("autoplay_default");

      if (role && clearDjRole) throw new Error("Choose a DJ role or clear it, not both.");

      const current = await getGuildConfig(interaction.guildId!);
      const hasChanges = Boolean(role)
        || clearDjRole
        || defaultVolume !== null
        || autoplayDefault !== null;
      const config = hasChanges
        ? await updateGuildConfig(interaction.guildId!, {
            musicDjRoleId: clearDjRole ? undefined : role?.id ?? current.musicDjRoleId,
            musicDefaultVolume: defaultVolume ?? current.musicDefaultVolume ?? 80,
            musicAutoplayEnabled: autoplayDefault ?? current.musicAutoplayEnabled ?? false
          })
        : current;

      const player = getMusicPlayer(interaction.guildId!);
      if (player) {
        setPlayerMusicSettings(player, {
          djRoleId: clearDjRole ? null : role?.id,
          autoplayEnabled: autoplayDefault ?? undefined
        });
        if (defaultVolume !== null) await player.setVolume(defaultVolume);
      }

      await interaction.editReply({
        embeds: [musicEmbed(
          hasChanges ? "Music Settings Saved" : "Music Settings",
          [
            `DJ role: ${config.musicDjRoleId ? `<@&${config.musicDjRoleId}>` : "Everyone in the voice channel"}`,
            `Default volume: \`${config.musicDefaultVolume ?? 80}%\``,
            `Autoplay default: \`${config.musicAutoplayEnabled ? "on" : "off"}\``
          ].join("\n")
        )]
      });
    } catch (error) {
      await interaction.editReply(error instanceof Error ? error.message : "Could not save music settings.");
    }
    return;
  }

  const player = interaction.guildId ? getMusicPlayer(interaction.guildId) : undefined;
  if (!player) {
    await interaction.reply({ content: "Nothing is playing in this server.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === "queue") {
    await interaction.reply({ embeds: [queueEmbed(player)], components: musicQueueRows(player) });
    return;
  }

  if (subcommand === "nowplaying") {
    await interaction.reply({ embeds: [nowPlayingEmbed(player)], components: musicControlRows(player) });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await ensureMusicController(interaction, player);

    if (subcommand === "pause") {
      await player.pause();
      await interaction.editReply({ content: "Paused." });
      return;
    }

    if (subcommand === "previous") {
      const previous = await player.queue.shiftPrevious();
      if (!previous) throw new Error("There is no previous track yet.");
      cancelMusicRecovery(player);
      await startMusicPlayback(player, { clientTrack: previous });
      await interaction.editReply({ content: `Playing **${previous.info.title}** again.` });
      return;
    }

    if (subcommand === "replay") {
      if (!player.queue.current) throw new Error("There is no current track to replay.");
      await player.seek(0);
      await interaction.editReply({ content: "Restarted the current track." });
      return;
    }

    if (subcommand === "resume") {
      await player.resume();
      await interaction.editReply({ content: "Resumed." });
      return;
    }

    if (subcommand === "skip") {
      cancelMusicRecovery(player);
      await player.skip();
      await interaction.editReply({ content: "Skipped." });
      return;
    }

    if (subcommand === "stop") {
      cancelMusicRecovery(player);
      cancelSpotifyQueueWarmup(player);
      await player.destroy("Stopped by command.");
      await interaction.editReply({ content: "Stopped playback and left voice." });
      return;
    }

    if (subcommand === "volume") {
      const percent = interaction.options.getInteger("percent", true);
      await player.setVolume(percent);
      await interaction.editReply({ content: `Volume set to ${percent}%.` });
      return;
    }

    if (subcommand === "loop") {
      const mode = normalizeLoopMode(interaction.options.getString("mode", true));
      await player.setRepeatMode(mode);
      await interaction.editReply({ content: `Loop mode set to ${mode}.` });
      return;
    }

    if (subcommand === "shuffle") {
      await player.queue.shuffle();
      await interaction.editReply({ content: "Queue shuffled." });
      return;
    }

    if (subcommand === "clear") {
      cancelSpotifyQueueWarmup(player);
      const count = player.queue.tracks.length;
      if (count) await player.queue.splice(0, count);
      await interaction.editReply({
        content: count ? `Cleared **${count}** upcoming track(s).` : "The upcoming queue is already empty."
      });
      return;
    }

    if (subcommand === "seek") {
      const current = player.queue.current;
      if (!current) throw new Error("There is no current track to seek through.");
      if (current.info.isStream) throw new Error("Live streams cannot be seeked.");

      const rawPosition = interaction.options.getString("position", true);
      const position = parseSeekPosition(rawPosition);
      if (position === null) throw new Error("Use seconds or a timestamp such as `1:30`.");
      const duration = current.info.duration ?? 0;
      if (duration > 0 && position >= duration) throw new Error("That timestamp is past the end of the track.");

      await player.seek(position);
      await interaction.editReply({ content: `Jumped to \`${rawPosition}\`.` });
      return;
    }

    if (subcommand === "autoplay") {
      const enabled = interaction.options.getBoolean("enabled", true);
      setPlayerMusicSettings(player, { autoplayEnabled: enabled });
      await interaction.editReply({
        content: `Autoplay is now **${enabled ? "on" : "off"}** for this session.`
      });
      return;
    }

    if (subcommand === "filters") {
      const value = interaction.options.getString("preset", true);
      if (!isMusicFilterPreset(value)) throw new Error("That sound filter is not available.");
      await applyMusicFilter(player, value);
      await interaction.editReply({ content: `Sound filter set to **${value}**.` });
      return;
    }

    if (subcommand === "move") {
      const from = interaction.options.getInteger("from", true);
      const to = interaction.options.getInteger("to", true);
      const track = player.queue.tracks[from - 1];
      if (!track) throw new Error("The starting queue position does not exist.");
      if (to > player.queue.tracks.length) throw new Error("The destination is outside the current queue.");

      await player.queue.splice(from - 1, 1);
      await player.queue.splice(to - 1, 0, track);
      await interaction.editReply({
        content: `Moved **${track.info.title}** from position ${from} to ${to}.`
      });
      return;
    }

    if (subcommand === "remove") {
      const position = interaction.options.getInteger("position", true);
      const removed = player.queue.tracks[position - 1];
      if (!removed) {
        await interaction.editReply({ content: "That queue position does not exist." });
        return;
      }

      await player.queue.splice(position - 1, 1);
      await interaction.editReply({
        content: `Removed **${removed.info.title}** from the queue.`
      });
    }
  } catch (error) {
    await interaction.editReply({
      content: error instanceof Error ? error.message : "Could not control the player."
    });
  }
}
