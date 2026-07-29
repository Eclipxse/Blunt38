import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { buildGoodbyeMessage } from "../services/goodbye.js";
import { getGuildConfig, updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";

export const goodbyeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Configure and test goodbye messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set the goodbye channel and message.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel for goodbye messages.")
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Use {user}, {username}, {server}, and {count}.")
            .setMaxLength(500)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("test")
        .setDescription("Send a goodbye preview for yourself.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("clear").setDescription("Disable goodbye messages.")
    ),
  async execute(interaction) {
    if (!interaction.guildId || !interaction.guild) return;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "clear") {
      await updateGuildConfig(interaction.guildId, {
        goodbyeChannelId: undefined,
        goodbyeMessage: undefined
      });
      await interaction.reply({
        content: "Goodbye messages disabled.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === "set") {
      const channel = interaction.options.getChannel("channel", true);
      const message = interaction.options.getString("message") ?? undefined;
      await updateGuildConfig(interaction.guildId, {
        goodbyeChannelId: channel.id,
        goodbyeMessage: message
      });
      await interaction.reply({
        content: `Goodbye messages will be sent in ${channel}.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const config = await getGuildConfig(interaction.guildId);
    if (!config.goodbyeChannelId) {
      await interaction.reply({
        content: "Set a goodbye channel first with `/goodbye set`.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const channel = await interaction.guild.channels
      .fetch(config.goodbyeChannelId)
      .catch(() => null);
    if (!channel?.isTextBased() || channel.isDMBased()) {
      await interaction.reply({
        content: "The saved goodbye channel is invalid.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    await channel.send(
      await buildGoodbyeMessage(
        member,
        config.goodbyeMessage,
        config.accentColor,
        true
      )
    );
    await interaction.reply({
      content: `Sent a goodbye preview in ${channel}.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
