import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import {
  applyMusicFilter,
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
  trackLabel
} from "../services/music.js";
import { getGuildConfig, updateGuildConfig } from "../services/store.js";
import { parseSeekPosition } from "../utils/music-control.js";

export const musicCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Play and control music in voice channels.")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("play")
        .setDescription("Play a song, playlist, or supported link.")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Song name, YouTube link, Spotify link, SoundCloud link, etc.")
            .setRequired(true)
            .setMaxLength(500)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setDescription("Search and choose the exact track from a menu.")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Song title, artist, or search phrase.")
            .setRequired(true)
            .setMaxLength(200)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("pause").setDescription("Pause the current track."))
    .addSubcommand((subcommand) => subcommand.setName("resume").setDescription("Resume the current track."))
    .addSubcommand((subcommand) => subcommand.setName("previous").setDescription("Play the previous track."))
    .addSubcommand((subcommand) => subcommand.setName("replay").setDescription("Restart the current track."))
    .addSubcommand((subcommand) => subcommand.setName("skip").setDescription("Skip the current track."))
    .addSubcommand((subcommand) => subcommand.setName("stop").setDescription("Stop playback and leave voice."))
    .addSubcommand((subcommand) => subcommand.setName("queue").setDescription("Show the music queue."))
    .addSubcommand((subcommand) => subcommand.setName("nowplaying").setDescription("Show the current track."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("volume")
        .setDescription("Set player volume.")
        .addIntegerOption((option) =>
          option
            .setName("percent")
            .setDescription("Volume from 1 to 100.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("loop")
        .setDescription("Set loop mode.")
        .addStringOption((option) =>
          option
            .setName("mode")
            .setDescription("Loop mode.")
            .setRequired(true)
            .addChoices(
              { name: "Off", value: "off" },
              { name: "Track", value: "track" },
              { name: "Queue", value: "queue" }
            )
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("shuffle").setDescription("Shuffle the upcoming queue."))
    .addSubcommand((subcommand) => subcommand.setName("clear").setDescription("Clear every upcoming track."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("seek")
        .setDescription("Jump to a timestamp in the current track.")
        .addStringOption((option) =>
          option
            .setName("position")
            .setDescription("Seconds or a timestamp such as 1:30.")
            .setRequired(true)
            .setMaxLength(12)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("autoplay")
        .setDescription("Toggle related-song autoplay for this voice session.")
        .addBooleanOption((option) =>
          option.setName("enabled").setDescription("Whether autoplay should stay on.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("filters")
        .setDescription("Apply a polished sound preset.")
        .addStringOption((option) =>
          option
            .setName("preset")
            .setDescription("Sound profile.")
            .setRequired(true)
            .addChoices(...musicFilterChoices)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("move")
        .setDescription("Move an upcoming track to another queue position.")
        .addIntegerOption((option) =>
          option.setName("from").setDescription("Current queue position.").setRequired(true).setMinValue(1)
        )
        .addIntegerOption((option) =>
          option.setName("to").setDescription("New queue position.").setRequired(true).setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a track from the queue.")
        .addIntegerOption((option) =>
          option
            .setName("position")
            .setDescription("Queue position, starting at 1.")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("settings")
        .setDescription("View or change this server's DJ role and playback defaults.")
        .addRoleOption((option) =>
          option.setName("dj_role").setDescription("Role allowed to control active music sessions.")
        )
        .addBooleanOption((option) =>
          option.setName("clear_dj_role").setDescription("Remove the DJ-role requirement.")
        )
        .addIntegerOption((option) =>
          option
            .setName("default_volume")
            .setDescription("Starting volume for new players.")
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addBooleanOption((option) =>
          option.setName("autoplay_default").setDescription("Default autoplay state for new players.")
        )
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "play") {
      await interaction.deferReply();

      try {
        const query = interaction.options.getString("query", true);
        const { player, result, added, startsPlayback, spotifySummary } = await playQuery(interaction, query);
        if (startsPlayback) {
          if (spotifySummary && spotifySummary.total > 1) {
            const unresolved = spotifySummary.total - spotifySummary.resolved;
            await interaction.followUp({
              embeds: [musicEmbed(
                "Spotify Queue Added",
                [
                  `**${spotifySummary.name}**`,
                  `Added **${spotifySummary.resolved}/${spotifySummary.total}** tracks in order.`,
                  unresolved ? `**${unresolved}** track(s) could not be resolved.` : "Every public track found a playable match."
                ].join("\n")
              )]
            });
          }
          return;
        }

        const first = added[0];
        const description = spotifySummary
          ? [
              `**${spotifySummary.name}**`,
              `Added **${spotifySummary.resolved}/${spotifySummary.total}** tracks in order.`,
              spotifySummary.total > spotifySummary.resolved
                ? `**${spotifySummary.total - spotifySummary.resolved}** track(s) could not be resolved.`
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

    try {
      await ensureMusicController(interaction, player);

      if (subcommand === "pause") {
        await player.pause();
        await interaction.reply({ content: "Paused.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "previous") {
        const previous = await player.queue.shiftPrevious();
        if (!previous) throw new Error("There is no previous track yet.");
        await player.play({ clientTrack: previous });
        await interaction.reply({ content: `Playing **${previous.info.title}** again.`, flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "replay") {
        if (!player.queue.current) throw new Error("There is no current track to replay.");
        await player.seek(0);
        await interaction.reply({ content: "Restarted the current track.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "resume") {
        await player.resume();
        await interaction.reply({ content: "Resumed.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "skip") {
        await player.skip();
        await interaction.reply({ content: "Skipped.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "stop") {
        await player.destroy("Stopped by command.");
        await interaction.reply({ content: "Stopped playback and left voice.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "volume") {
        const percent = interaction.options.getInteger("percent", true);
        await player.setVolume(percent);
        await interaction.reply({ content: `Volume set to ${percent}%.`, flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "loop") {
        const mode = normalizeLoopMode(interaction.options.getString("mode", true));
        await player.setRepeatMode(mode);
        await interaction.reply({ content: `Loop mode set to ${mode}.`, flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "shuffle") {
        await player.queue.shuffle();
        await interaction.reply({ content: "Queue shuffled.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "clear") {
        const count = player.queue.tracks.length;
        if (count) await player.queue.splice(0, count);
        await interaction.reply({
          content: count ? `Cleared **${count}** upcoming track(s).` : "The upcoming queue is already empty.",
          flags: MessageFlags.Ephemeral
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
        await interaction.reply({ content: `Jumped to \`${rawPosition}\`.`, flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "autoplay") {
        const enabled = interaction.options.getBoolean("enabled", true);
        setPlayerMusicSettings(player, { autoplayEnabled: enabled });
        await interaction.reply({
          content: `Autoplay is now **${enabled ? "on" : "off"}** for this session.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (subcommand === "filters") {
        const value = interaction.options.getString("preset", true);
        if (!isMusicFilterPreset(value)) throw new Error("That sound filter is not available.");
        await applyMusicFilter(player, value);
        await interaction.reply({ content: `Sound filter set to **${value}**.`, flags: MessageFlags.Ephemeral });
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
        await interaction.reply({
          content: `Moved **${track.info.title}** from position ${from} to ${to}.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (subcommand === "remove") {
        const position = interaction.options.getInteger("position", true);
        const removed = player.queue.tracks[position - 1];
        if (!removed) {
          await interaction.reply({ content: "That queue position does not exist.", flags: MessageFlags.Ephemeral });
          return;
        }

        await player.queue.splice(position - 1, 1);
        await interaction.reply({
          content: `Removed **${removed.info.title}** from the queue.`,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      await interaction.reply({
        content: error instanceof Error ? error.message : "Could not control the player.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
