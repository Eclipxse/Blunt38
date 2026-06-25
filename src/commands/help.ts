import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { panelEmbed, palette } from "../utils/ui.js";

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Open the bot command center."),
  async execute(interaction) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("help:core").setEmoji("🎛️").setLabel("Control").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("help:community").setEmoji("💬").setLabel("Community").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("help:staff").setEmoji("🛡️").setLabel("Staff").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [
        panelEmbed(
          "Command Center",
          "NEXUS",
          "Use slash commands for actions and buttons for the premium panels. Pick a section below.",
          palette.electric
        ).addFields(
          { name: "Modules", value: "`Tickets` `Roles` `Levels` `Giveaways`", inline: false },
          { name: "Interface", value: "`Buttons` `Menus` `Modals` `Panels`", inline: false }
        )
      ],
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  }
};
