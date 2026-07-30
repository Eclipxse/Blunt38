import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildTextBasedChannel
} from "discord.js";
import type { Command } from "../types.js";
import { palette, panelEmbed, warningEmbed } from "../utils/ui.js";

const requiredBotPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageMessages
];

export const purgeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete a chosen number of recent messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of recent messages to delete (1-100).")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild || !interaction.channel?.isTextBased()) {
      await interaction.reply({
        embeds: [warningEmbed("Server Only", "Use `/purge` inside a server text channel.")],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        embeds: [warningEmbed("Permission Denied", "You need **Manage Messages** to use `/purge`.")],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const channel = interaction.channel as GuildTextBasedChannel;
    const botMember = interaction.guild.members.me;
    const botPermissions = botMember ? channel.permissionsFor(botMember) : null;

    if (!botPermissions?.has(requiredBotPermissions)) {
      await interaction.reply({
        embeds: [
          warningEmbed(
            "Missing Bot Permissions",
            "Give blunt38 **View Channel**, **Read Message History**, and **Manage Messages** in this channel."
          )
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const deleted = await channel.bulkDelete(amount, true);
      const skipped = amount - deleted.size;
      const description = skipped > 0
        ? `Removed \`${deleted.size}\` recent messages. \`${skipped}\` could not be removed because the channel had fewer messages or they were older than 14 days.`
        : `Removed \`${deleted.size}\` recent messages from ${channel}.`;

      await interaction.editReply({
        embeds: [
          panelEmbed(
            "Channel Cleaned",
            "CLEAN SWEEP",
            description,
            deleted.size > 0 ? palette.success : palette.warning,
            `${deleted.size}/${amount} removed`
          ).addFields(
            { name: "Requested", value: `\`${amount}\``, inline: true },
            { name: "Deleted", value: `\`${deleted.size}\``, inline: true },
            { name: "Moderator", value: `${interaction.user}`, inline: true }
          )
        ]
      });
    } catch (error) {
      console.error("Purge command failed:", error);
      await interaction.editReply({
        embeds: [
          warningEmbed(
            "Purge Failed",
            "Discord rejected the cleanup. Check blunt38's channel permissions and try again."
          )
        ]
      });
    }
  }
};
