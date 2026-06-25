import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import type { Command } from "../types.js";
import { embed } from "../utils/ui.js";

export const moderateCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("moderate")
    .setDescription("Open a staff action panel for a user.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to moderate.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const rowOne = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`mod:warn:${user.id}`).setEmoji("⚠️").setLabel("Warn").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`mod:timeout:${user.id}`).setEmoji("⏳").setLabel("Timeout").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`mod:kick:${user.id}`).setEmoji("🚪").setLabel("Kick").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`mod:ban:${user.id}`).setEmoji("⛔").setLabel("Ban").setStyle(ButtonStyle.Danger)
    );
    const rowTwo = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`mod:history:${user.id}`).setEmoji("📜").setLabel("History").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [
        embed("Moderation Panel", `Target: ${user}\nChoose an action below. Reasons are collected with modals.`)
      ],
      components: [rowOne, rowTwo],
      flags: MessageFlags.Ephemeral
    });
  }
};
