import { type ButtonInteraction, MessageFlags, type StringSelectMenuInteraction } from "discord.js";
import {
  applyMusicFilter,
  cancelMusicRecovery,
  cancelSpotifyQueueWarmup,
  consumeMusicSearchSession,
  ensureMusicController,
  getMusicPlayer,
  isMusicFilterPreset,
  musicControlRows,
  musicControlsEmbed,
  musicExpandedControlRows,
  musicQueueRows,
  queueEmbed,
  queueSearchResult,
  setPlayerMusicSettings,
  startMusicPlayback,
  trackLabel
} from "../services/music.js";

function nextLoopMode(current: string) {
  if (current === "off") return "track";
  if (current === "track") return "queue";
  return "off";
}

export async function handleMusicButton(interaction: ButtonInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: "Music controls only work in servers.", flags: MessageFlags.Ephemeral });
    return;
  }

  const player = getMusicPlayer(interaction.guildId);
  if (!player) {
    await interaction.reply({ content: "Nothing is playing in this server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const [, action, detail] = interaction.customId.split(":");

  if (action === "controls") {
    const payload = {
      embeds: [musicControlsEmbed(player)],
      components: musicExpandedControlRows(player)
    };
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.update(payload);
    } else {
      await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }
    return;
  }

  if (action === "queue") {
    const page = Number(detail ?? 0);
    const payload = { embeds: [queueEmbed(player, page)], components: musicQueueRows(player, page) };
    if (interaction.message.embeds[0]?.title?.startsWith("Music Queue") || interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.update(payload);
    } else {
      await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }
    return;
  }

  await interaction.deferUpdate();
  try {
    await ensureMusicController(interaction, player);

    if (action === "pause") {
      await player.pause();
      await interaction.editReply({ components: musicControlRows(player) });
      return;
    }

    if (action === "resume") {
      await player.resume();
      await interaction.editReply({ components: musicControlRows(player) });
      return;
    }

    if (action === "previous") {
      const previous = await player.queue.shiftPrevious();
      if (!previous) throw new Error("There is no previous track yet.");
      cancelMusicRecovery(player);
      await startMusicPlayback(player, { clientTrack: previous });
      await interaction.followUp({ content: `Playing **${previous.info.title}** again.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "skip") {
      cancelMusicRecovery(player);
      await player.skip();
      await interaction.followUp({ content: "Skipped.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "stop") {
      cancelMusicRecovery(player);
      cancelSpotifyQueueWarmup(player);
      await player.destroy("Stopped by button.");
      await interaction.editReply({ content: "Stopped playback and left voice.", embeds: [], components: [] });
      return;
    }

    if (action === "loop") {
      const mode = nextLoopMode(player.repeatMode);
      await player.setRepeatMode(mode);
      await interaction.editReply({ embeds: [musicControlsEmbed(player)], components: musicExpandedControlRows(player) });
      return;
    }

    if (action === "replay") {
      if (!player.queue.current) throw new Error("There is no current track to replay.");
      await player.seek(0);
      await interaction.followUp({ content: "Restarted the current track.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "shuffle") {
      await player.queue.shuffle();
      await interaction.followUp({ content: "Queue shuffled.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "autoplay") {
      setPlayerMusicSettings(player, {
        autoplayEnabled: !player.getData<boolean>("musicAutoplayEnabled")
      });
      await interaction.editReply({ embeds: [musicControlsEmbed(player)], components: musicExpandedControlRows(player) });
      return;
    }

    if (action === "volume-status") {
      return;
    }

    if (action === "volume-down" || action === "volume-up") {
      const change = action === "volume-down" ? -10 : 10;
      const volume = Math.max(1, Math.min(100, player.volume + change));
      await player.setVolume(volume);
      await interaction.editReply({ embeds: [musicControlsEmbed(player)], components: musicExpandedControlRows(player) });
      return;
    }

    if (action === "clear") {
      cancelSpotifyQueueWarmup(player);
      const count = player.queue.tracks.length;
      if (count) await player.queue.splice(0, count);
      await interaction.editReply({ embeds: [queueEmbed(player)], components: musicQueueRows(player) });
      return;
    }

    await interaction.followUp({ content: "Unknown music control.", flags: MessageFlags.Ephemeral });
  } catch (error) {
    await interaction.followUp({
      content: error instanceof Error ? error.message : "Could not control the player.",
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleMusicSelect(interaction: StringSelectMenuInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: "Music controls only work in servers.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.customId === "music:filter") {
    const player = getMusicPlayer(interaction.guildId);
    if (!player) {
      await interaction.reply({ content: "Nothing is playing in this server.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferUpdate();
    try {
      await ensureMusicController(interaction, player);
      const preset = interaction.values[0] ?? "";
      if (!isMusicFilterPreset(preset)) throw new Error("That sound filter is not available.");
      await applyMusicFilter(player, preset);
      await interaction.editReply({
        embeds: [musicControlsEmbed(player)],
        components: musicExpandedControlRows(player)
      });
      await interaction.followUp({ content: `Sound filter set to **${preset}**.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      const content = error instanceof Error ? error.message : "Could not change the sound filter.";
      if (interaction.deferred) await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
      else await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
    return;
  }

  if (!interaction.customId.startsWith("music:search:")) return;

  try {
    const sessionId = interaction.customId.split(":")[2] ?? "";
    const session = consumeMusicSearchSession(sessionId, interaction.user.id, interaction.guildId);
    const track = session.tracks[Number(interaction.values[0])];
    if (!track) throw new Error("That search result is no longer available.");

    await interaction.deferUpdate();
    const { startsPlayback } = await queueSearchResult(interaction, track);
    await interaction.editReply({
      content: startsPlayback ? `Starting ${trackLabel(track)}` : `Queued ${trackLabel(track)}`,
      embeds: [],
      components: []
    });
  } catch (error) {
    const content = error instanceof Error ? error.message : "Could not queue that result.";
    if (interaction.deferred) await interaction.editReply({ content, embeds: [], components: [] });
    else await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
}
