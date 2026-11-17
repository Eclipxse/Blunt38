import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { listBirthdays, removeBirthday, setBirthday, updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";
import { embed, palette } from "../utils/ui.js";

function validDate(month: number, day: number) {
  const date = new Date(Date.UTC(2024, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const birthdayCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("birthday")
    .setDescription("Set birthdays and birthday announcement channels.")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set your birthday.")
        .addIntegerOption((option) =>
          option.setName("month").setDescription("Month number, 1-12.").setRequired(true).setMinValue(1).setMaxValue(12)
        )
        .addIntegerOption((option) =>
          option.setName("day").setDescription("Day number.").setRequired(true).setMinValue(1).setMaxValue(31)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("remove").setDescription("Remove your birthday."))
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List saved birthdays."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("Set the birthday announcement channel.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Birthday channel.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    if (!interaction.guildId) return;
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (subcommand === "channel") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({ content: "You need Manage Server to set the birthday channel." });
        return;
      }

      const channel = interaction.options.getChannel("channel", true);
      await updateGuildConfig(interaction.guildId, { birthdayChannelId: channel.id });
      await interaction.editReply({ content: `Birthday announcements will go to ${channel}.` });
      return;
    }

    if (subcommand === "set") {
      const month = interaction.options.getInteger("month", true);
      const day = interaction.options.getInteger("day", true);
      if (!validDate(month, day)) {
        await interaction.editReply({ content: "That is not a valid calendar date." });
        return;
      }

      await setBirthday(interaction.guildId, interaction.user.id, month, day);
      await interaction.editReply({ content: `Birthday saved as ${month}/${day}.` });
      return;
    }

    if (subcommand === "remove") {
      const removed = await removeBirthday(interaction.guildId, interaction.user.id);
      await interaction.editReply({ content: removed ? "Birthday removed." : "You did not have a birthday saved." });
      return;
    }

    const birthdays = await listBirthdays(interaction.guildId);
    const lines = birthdays
      .sort((a, b) => a.month - b.month || a.day - b.day)
      .slice(0, 25)
      .map((birthday) => `<@${birthday.userId}> - ${birthday.month}/${birthday.day}`);

    await interaction.editReply({
      embeds: [embed("Birthdays", lines.length ? lines.join("\n") : "No birthdays saved yet.", palette.primary)]
    });
  }
};
