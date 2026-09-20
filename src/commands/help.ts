import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { helpPayload } from "../utils/help-menu.js";

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Browse commands and get started."),
  async execute(interaction) {
    await interaction.reply({ ...helpPayload(), flags: MessageFlags.Ephemeral });
  }
};
