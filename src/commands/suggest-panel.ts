import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import type { Command } from "../types.js";
import { embed } from "../utils/ui.js";

export const suggestPanelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("suggest-panel")
    .setDescription("Post a suggestion panel with modal input.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Where to post the suggestion panel.")
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction) {
    const selected = interaction.options.getChannel("channel");
    const target = selected
      ? await interaction.guild?.channels.fetch(selected.id)
      : interaction.channel;

    if (!target || target.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Pick a normal text channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("suggest:open").setEmoji("💡").setLabel("Share Idea").setStyle(ButtonStyle.Primary)
    );

    await target.send({
      embeds: [embed("Suggestions", "Send an idea to the team using the button below.")],
      components: [row]
    });

    await interaction.reply({ content: `Suggestion panel posted in ${target}.`, flags: MessageFlags.Ephemeral });
  }
};
