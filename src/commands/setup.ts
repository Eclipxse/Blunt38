import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { setupHomePayload } from "../interactions/setup.js";

export const setupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure server features and preferences.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.guildId) return;
    await interaction.reply(await setupHomePayload(interaction.guildId));
  }
};
