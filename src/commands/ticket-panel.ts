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
import { panelEmbed, palette } from "../utils/ui.js";

export const ticketPanelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Post a ticket panel with buttons and category UI.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Where to post the ticket panel.")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Panel title.")
        .setMaxLength(80)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Panel description.")
        .setMaxLength(500)
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

    const title = interaction.options.getString("title") ?? "Support Tickets";
    const description =
      interaction.options.getString("description") ??
      "Need help? Open a ticket and the staff team will handle it privately.";

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ticket:open").setEmoji("💌").setLabel("Open Ticket").setStyle(ButtonStyle.Primary)
    );

    await target.send({
      embeds: [
        panelEmbed(title, "SUPPORT PORTAL", description, palette.electric).addFields(
          { name: "Flow", value: "`Open` -> `Choose Type` -> `Submit Details`", inline: false },
          { name: "Staff Tools", value: "`Claim` `Lock` `Transcript` `Close`", inline: false }
        )
      ],
      components: [row]
    });

    await interaction.reply({ content: `Ticket panel posted in ${target}.`, flags: MessageFlags.Ephemeral });
  }
};
