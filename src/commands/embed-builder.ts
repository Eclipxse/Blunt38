import {
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";
import type { Command } from "../types.js";

export const embedBuilderCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create a custom embed with a modal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Open the embed builder.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Where to send the embed.")
            .addChannelTypes(ChannelType.GuildText)
        )
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel") ?? interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Pick a normal text channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`embed:create:${channel.id}`)
      .setTitle("Create Embed")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("title")
            .setLabel("Title")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(120)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Description")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(2000)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("color")
            .setLabel("Color hex")
            .setPlaceholder("#5865f2")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(7)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("image")
            .setLabel("Image URL")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(300)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("footer")
            .setLabel("Footer")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(120)
        )
      );

    await interaction.showModal(modal);
  }
};
