import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { getLevelRecord, listTopLevels, updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";
import { embed, palette } from "../utils/ui.js";
import { xpForNextLevel } from "../utils/levels.js";

export const levelingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("leveling")
    .setDescription("Configure the leveling system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) => subcommand.setName("enable").setDescription("Enable XP leveling."))
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable XP leveling."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("Set the level-up announcement channel.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Level-up channel.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    if (!interaction.guildId) return;

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "enable") {
      await updateGuildConfig(interaction.guildId, { levelingEnabled: true });
      await interaction.reply({ content: "Leveling enabled.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "disable") {
      await updateGuildConfig(interaction.guildId, { levelingEnabled: false });
      await interaction.reply({ content: "Leveling disabled.", flags: MessageFlags.Ephemeral });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    await updateGuildConfig(interaction.guildId, { levelUpChannelId: channel.id, levelingEnabled: true });
    await interaction.reply({ content: `Level-up messages will go to ${channel}.`, flags: MessageFlags.Ephemeral });
  }
};

export const rankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show a member's rank.")
    .setDMPermission(false)
    .addUserOption((option) => option.setName("user").setDescription("Member to check.")),
  async execute(interaction) {
    if (!interaction.guildId) return;

    const user = interaction.options.getUser("user") ?? interaction.user;
    const record = await getLevelRecord(interaction.guildId, user.id);
    const xp = record?.xp ?? 0;
    const level = record?.level ?? 0;

    await interaction.reply({
      embeds: [
        embed("Rank", `${user} is level **${level}** with **${xp} XP**.`, palette.primary)
          .addFields({ name: "Next Level", value: `${xpForNextLevel(level)} XP`, inline: true })
      ]
    });
  }
};

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the XP leaderboard.")
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.guildId) return;

    const top = await listTopLevels(interaction.guildId, 10);
    const lines = top.map((record, index) => {
      return `**${index + 1}.** <@${record.userId}> - level **${record.level}**, ${record.xp} XP`;
    });

    await interaction.reply({
      embeds: [embed("Leaderboard", lines.length ? lines.join("\n") : "No XP yet.", palette.primary)]
    });
  }
};
