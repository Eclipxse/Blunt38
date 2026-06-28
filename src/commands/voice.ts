import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { env } from "../env.js";
import { logToGuild } from "../services/logger.js";
import type { Command } from "../types.js";

function canUseVoiceCommand(userId: string, hasMoveMembers: boolean) {
  if (env.voiceControlUserIds.length) {
    return env.voiceControlUserIds.includes(userId);
  }

  return hasMoveMembers;
}

export const voiceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("voice")
    .setDescription("Moderate voice channel members.")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disconnect")
        .setDescription("Disconnect a member from their current voice channel.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Member to disconnect from voice.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Optional audit log reason.")
            .setMaxLength(400)
        )
    ),
  async execute(interaction) {
    if (!interaction.guild || !interaction.guildId) return;

    const hasMoveMembers = Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.MoveMembers));
    if (!canUseVoiceCommand(interaction.user.id, hasMoveMembers)) {
      await interaction.reply({
        content: env.voiceControlUserIds.length
          ? "You are not in the voice control allowlist."
          : "You need Move Members permission to disconnect users from voice.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason")?.trim() || `Disconnected by ${interaction.user.tag}`;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: "That member is not in this server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply({ content: `${member} is not connected to a voice channel.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const me = interaction.guild.members.me ?? await interaction.guild.members.fetchMe().catch(() => null);
    if (!me || !voiceChannel.permissionsFor(me).has(PermissionFlagsBits.MoveMembers)) {
      await interaction.reply({
        content: "I need Move Members permission in that voice channel.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      await member.voice.disconnect(reason);
    } catch {
      await interaction.reply({
        content: "Could not disconnect that member. Check my voice permissions and channel overrides.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.reply({
      content: `Disconnected ${member} from **${voiceChannel.name}**.`,
      flags: MessageFlags.Ephemeral
    });

    await logToGuild(
      interaction.guild,
      "Voice Disconnect",
      `${interaction.user} disconnected ${member} from **${voiceChannel.name}**.\nReason: ${reason}`
    );
  }
};
