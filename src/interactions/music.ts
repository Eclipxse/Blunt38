import { type ButtonInteraction, MessageFlags } from "discord.js";
import {
  ensureSameVoice,
  getMusicPlayer,
  musicControlRows,
  nowPlayingEmbed,
  queueEmbed
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

  const action = interaction.customId.split(":")[1];

  if (action === "queue") {
    await interaction.reply({ embeds: [queueEmbed(player)], flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await ensureSameVoice(interaction, player);

    if (action === "pause") {
      await player.pause();
      await interaction.update({ embeds: [nowPlayingEmbed(player)], components: musicControlRows(player) });
      return;
    }

    if (action === "resume") {
      await player.resume();
      await interaction.update({ embeds: [nowPlayingEmbed(player)], components: musicControlRows(player) });
      return;
    }

    if (action === "skip") {
      await player.skip();
      await interaction.reply({ content: "Skipped.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "stop") {
      await player.destroy("Stopped by button.");
      await interaction.update({ content: "Stopped playback and left voice.", embeds: [], components: [] });
      return;
    }

    if (action === "loop") {
      const mode = nextLoopMode(player.repeatMode);
      player.setRepeatMode(mode);
      await interaction.reply({ content: `Loop mode set to ${mode}.`, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply({ content: "Unknown music control.", flags: MessageFlags.Ephemeral });
  } catch (error) {
    await interaction.reply({
      content: error instanceof Error ? error.message : "Could not control the player.",
      flags: MessageFlags.Ephemeral
    });
  }
}
