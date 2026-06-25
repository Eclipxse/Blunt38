import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";

export const tempVcCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("tempvc")
    .setDescription("Configure temporary voice channels.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Create a join-to-create voice channel.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Join channel name.")
            .setMaxLength(80)
        )
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("Category for temp voice channels.")
            .addChannelTypes(ChannelType.GuildCategory)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable temp voice creation.")),
  async execute(interaction) {
    if (!interaction.guildId || !interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "disable") {
      await updateGuildConfig(interaction.guildId, {
        tempVoiceJoinChannelId: undefined,
        tempVoiceCategoryId: undefined
      });
      await interaction.reply({ content: "Temp VC disabled.", flags: MessageFlags.Ephemeral });
      return;
    }

    const name = interaction.options.getString("name") ?? "Join to Create";
    const category = interaction.options.getChannel("category");
    const channel = await interaction.guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: category?.id
    });

    await updateGuildConfig(interaction.guildId, {
      tempVoiceJoinChannelId: channel.id,
      tempVoiceCategoryId: category?.id
    });

    await interaction.reply({
      content: `Temp VC enabled. Users join ${channel} to create private voice channels.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
