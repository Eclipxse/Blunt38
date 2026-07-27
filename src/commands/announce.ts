import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { buildVisualAttachment } from "../services/visual-message.js";
import type { Command } from "../types.js";
import { panelEmbed, palette } from "../utils/ui.js";

export const announceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Publish a designed server announcement.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Announcement channel.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Announcement title.")
        .setMaxLength(100)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Announcement body.")
        .setMaxLength(1_800)
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.guild || !interaction.guildId) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const selected = interaction.options.getChannel("channel", true);
    const channel = await interaction.guild.channels.fetch(selected.id).catch(() => null);
    if (!channel?.isTextBased() || channel.isDMBased()) {
      await interaction.editReply("Pick a server text or announcement channel.");
      return;
    }

    const title = interaction.options.getString("title", true);
    const message = interaction.options.getString("message", true);
    const attachment = await buildVisualAttachment({
      guildId: interaction.guildId,
      studioType: "announcement",
      user: interaction.user,
      variables: {
        user: interaction.user.username,
        title,
        message,
        server: interaction.guild.name,
        channel: "name" in channel ? `#${channel.name}` : "announcement"
      },
      fileName: "announcement"
    }).catch((error) => {
      console.error("Visual announcement render failed:", error);
      return null;
    });

    await channel.send(
      attachment
        ? {
            content: `# ${title}\n${message}`,
            files: [attachment]
          }
        : {
            embeds: [
              panelEmbed(title, "SERVER BROADCAST", message, palette.primary, interaction.guild.name)
            ]
          }
    );
    await interaction.editReply(`Announcement published in ${channel}.`);
  }
};
