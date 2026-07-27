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
import { buildVisualAttachment } from "../services/visual-message.js";

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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const title = interaction.options.getString("title") ?? "Support Tickets";
    const description =
      interaction.options.getString("description") ??
      "Need help? Open a ticket and the staff team will handle it privately.";

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ticket:open").setEmoji("💌").setLabel("Open Ticket").setStyle(ButtonStyle.Primary)
    );

    const visual = interaction.guild
      ? await buildVisualAttachment({
          guildId: interaction.guild.id,
          studioType: "ticket",
          user: interaction.user,
          variables: {
            user: interaction.member && "displayName" in interaction.member
              ? interaction.member.displayName
              : interaction.user.username,
            mention: `@${interaction.user.username}`,
            server: interaction.guild.name,
            ticket: "NEW",
            staff: "Support Team"
          },
          fileName: "ticket-panel"
        }).catch((error) => {
          console.error("Visual ticket render failed:", error);
          return null;
        })
      : null;

    await target.send(
      visual
        ? {
            content: `**${title}**\n${description}`,
            files: [visual],
            components: [row]
          }
        : {
            embeds: [
              panelEmbed(title, "SUPPORT PORTAL", description, palette.electric).addFields(
                { name: "Flow", value: "`Open` -> `Choose Type` -> `Submit Details`", inline: false },
                { name: "Staff Tools", value: "`Claim` `Lock` `Transcript` `Close`", inline: false }
              )
            ],
            components: [row]
          }
    );

    await interaction.editReply({ content: `Ticket panel posted in ${target}.` });
  }
};
