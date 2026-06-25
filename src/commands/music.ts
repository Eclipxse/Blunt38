import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import {
  ensureSameVoice,
  formatTrackDuration,
  getMusicPlayer,
  musicControlRows,
  musicEmbed,
  normalizeLoopMode,
  nowPlayingEmbed,
  playQuery,
  queueEmbed,
  trackLabel
} from "../services/music.js";

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
    .addSubcommand((subcommand) => subcommand.setName("pause").setDescription("Pause the current track."))
    .addSubcommand((subcommand) => subcommand.setName("resume").setDescription("Resume the current track."))
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
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "play") {
      await interaction.deferReply();

      try {
        const query = interaction.options.getString("query", true);
        const { player, result, added } = await playQuery(interaction, query);
        const first = added[0];
        const description = result.loadType === "playlist"
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

    const player = interaction.guildId ? getMusicPlayer(interaction.guildId) : undefined;
    if (!player) {
      await interaction.reply({ content: "Nothing is playing in this server.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "queue") {
      await interaction.reply({ embeds: [queueEmbed(player)], components: musicControlRows(player) });
      return;
    }

    if (subcommand === "nowplaying") {
      await interaction.reply({ embeds: [nowPlayingEmbed(player)], components: musicControlRows(player) });
      return;
    }

    try {
      await ensureSameVoice(interaction, player);

      if (subcommand === "pause") {
        await player.pause();
        await interaction.reply({ content: "Paused.", flags: MessageFlags.Ephemeral });
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
        player.setRepeatMode(mode);
        await interaction.reply({ content: `Loop mode set to ${mode}.`, flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "shuffle") {
        player.queue.shuffle();
        await interaction.reply({ content: "Queue shuffled.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "remove") {
        const position = interaction.options.getInteger("position", true);
        const removed = player.queue.tracks[position - 1];
        if (!removed) {
          await interaction.reply({ content: "That queue position does not exist.", flags: MessageFlags.Ephemeral });
          return;
        }

        player.queue.splice(position - 1, 1);
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
