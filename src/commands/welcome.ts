import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { getGuildConfig, updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";
import { palette, panelEmbed } from "../utils/ui.js";

export function renderWelcome(template: string | undefined, userMention: string, serverName: string) {
  const fallback = "Welcome {user} to **{server}**.";
  return (template || fallback)
    .replaceAll("{user}", userMention)
    .replaceAll("{server}", serverName);
}

export const welcomeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure and test welcome messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set the welcome channel and message.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Welcome channel.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Use {user} and {server}.")
            .setMaxLength(500)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("test").setDescription("Send a test welcome message."))
    .addSubcommand((subcommand) => subcommand.setName("clear").setDescription("Disable welcome messages.")),
  async execute(interaction) {
    if (!interaction.guildId || !interaction.guild) return;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "clear") {
      await updateGuildConfig(interaction.guildId, { welcomeChannelId: undefined, welcomeMessage: undefined });
      await interaction.reply({ content: "Welcome messages disabled.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "set") {
      const channel = interaction.options.getChannel("channel", true);
      const message = interaction.options.getString("message") ?? undefined;
      await updateGuildConfig(interaction.guildId, { welcomeChannelId: channel.id, welcomeMessage: message });
      await interaction.reply({ content: `Welcome channel set to ${channel}.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const config = await getGuildConfig(interaction.guildId);
    if (!config.welcomeChannelId) {
      await interaction.reply({ content: "Set a welcome channel first with `/welcome set`.", flags: MessageFlags.Ephemeral });
      return;
    }

    const channel = await interaction.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (!channel?.isTextBased() || channel.isDMBased()) {
      await interaction.reply({ content: "The saved welcome channel is invalid.", flags: MessageFlags.Ephemeral });
      return;
    }

    await channel.send({
      embeds: [
        panelEmbed(
          "Welcome",
          "ARRIVAL",
          renderWelcome(config.welcomeMessage, `${interaction.user}`, interaction.guild.name),
          config.accentColor ?? palette.primary,
          "Joined"
        ).addFields({ name: "Member", value: `${interaction.user}`, inline: true })
      ]
    });
    await interaction.reply({ content: `Sent a test welcome in ${channel}.`, flags: MessageFlags.Ephemeral });
  }
};
