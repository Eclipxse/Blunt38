import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createGiveaway, updateGiveaway } from "../services/store.js";
import { endGiveaway, giveawayEmbed, giveawayRows } from "../services/giveaways.js";
import type { Command } from "../types.js";
import { parseDuration } from "../utils/format.js";

export const giveawayCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create and manage giveaways.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Start a giveaway.")
        .addStringOption((option) =>
          option
            .setName("prize")
            .setDescription("Prize name.")
            .setRequired(true)
            .setMaxLength(120)
        )
        .addStringOption((option) =>
          option
            .setName("duration")
            .setDescription("Duration like 10m, 1h, 1d.")
            .setRequired(true)
            .setMaxLength(8)
        )
        .addIntegerOption((option) =>
          option
            .setName("winners")
            .setDescription("Number of winners.")
            .setMinValue(1)
            .setMaxValue(10)
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Giveaway channel.")
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("End a giveaway by giveaway id.")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("Giveaway id from the embed footer.")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    if (!interaction.guildId || !interaction.guild) return;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "end") {
      const id = interaction.options.getString("id", true);
      const ended = await endGiveaway(interaction.client, id);
      await interaction.reply({
        content: ended ? "Giveaway ended." : "Could not find or end that giveaway.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const duration = parseDuration(interaction.options.getString("duration", true));
    if (!duration) {
      await interaction.reply({ content: "Use a valid duration like 10m, 1h, or 1d.", flags: MessageFlags.Ephemeral });
      return;
    }

    const selected = interaction.options.getChannel("channel");
    const target = selected ? await interaction.guild.channels.fetch(selected.id) : interaction.channel;
    if (!target || target.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Pick a normal text channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const giveaway = await createGiveaway({
      guildId: interaction.guildId,
      channelId: target.id,
      prize: interaction.options.getString("prize", true),
      winnerCount: interaction.options.getInteger("winners") ?? 1,
      endsAt: new Date(Date.now() + duration).toISOString()
    });

    const message = await target.send({
      embeds: [giveawayEmbed(giveaway)],
      components: giveawayRows(giveaway)
    });

    await updateGiveaway(giveaway.id, { messageId: message.id });
    await interaction.reply({ content: `Giveaway started in ${target}. ID: \`${giveaway.id}\``, flags: MessageFlags.Ephemeral });
  }
};
