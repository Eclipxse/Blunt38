import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { getGuildConfig, updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";

export const starboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("starboard")
    .setDescription("Configure reaction-powered community highlights.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set the starboard channel and reaction threshold.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Where starred messages are posted.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("threshold")
            .setDescription("Stars needed before a message is featured.")
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("Show the current starboard setup.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("disable").setDescription("Disable starboard posting.")
    ),
  async execute(interaction) {
    if (!interaction.guildId) return;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "disable") {
      await updateGuildConfig(interaction.guildId, { starboardChannelId: undefined });
      await interaction.reply({ content: "Starboard disabled.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "status") {
      const config = await getGuildConfig(interaction.guildId);
      await interaction.reply({
        content: config.starboardChannelId
          ? `Starboard: <#${config.starboardChannelId}> at **${config.starboardThreshold ?? 3}** stars.`
          : "Starboard is disabled.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    const threshold = interaction.options.getInteger("threshold") ?? 3;
    await updateGuildConfig(interaction.guildId, {
      starboardChannelId: channel.id,
      starboardThreshold: threshold
    });
    await interaction.reply({
      content: `Starboard is live in ${channel} at **${threshold}** stars.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
