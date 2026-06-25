import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";

function emojiId(input: string) {
  return input.match(/\d{15,25}/)?.[0] ?? input;
}

async function fetchBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

export const emojiCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("Manage server emojis.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a custom emoji from an image URL.")
        .addStringOption((option) => option.setName("name").setDescription("Emoji name.").setRequired(true).setMaxLength(32))
        .addStringOption((option) => option.setName("url").setDescription("Image URL.").setRequired(true).setMaxLength(300))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a custom emoji.")
        .addStringOption((option) => option.setName("emoji").setDescription("Emoji mention or ID.").setRequired(true))
    ),
  async execute(interaction) {
    if (!interaction.guild) return;
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "add") {
        const emoji = await interaction.guild.emojis.create({
          name: interaction.options.getString("name", true),
          attachment: interaction.options.getString("url", true),
          reason: `Emoji added by ${interaction.user.tag}`
        });
        await interaction.reply({ content: `Created emoji ${emoji}.`, flags: MessageFlags.Ephemeral });
        return;
      }

      const emoji = await interaction.guild.emojis.fetch(emojiId(interaction.options.getString("emoji", true)));
      await emoji.delete(`Emoji deleted by ${interaction.user.tag}`);
      await interaction.reply({ content: "Emoji deleted.", flags: MessageFlags.Ephemeral });
    } catch {
      await interaction.reply({
        content: "Emoji action failed. Check URL, emoji slots, file type, and my Manage Expressions permission.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export const stickerCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("sticker")
    .setDescription("Manage server stickers.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a sticker from an image URL.")
        .addStringOption((option) => option.setName("name").setDescription("Sticker name.").setRequired(true).setMaxLength(30))
        .addStringOption((option) => option.setName("url").setDescription("Image URL.").setRequired(true).setMaxLength(300))
        .addStringOption((option) => option.setName("tags").setDescription("Related emoji, like 😀.").setRequired(true).setMaxLength(20))
        .addStringOption((option) => option.setName("description").setDescription("Sticker description.").setMaxLength(100))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a sticker by ID.")
        .addStringOption((option) => option.setName("id").setDescription("Sticker ID.").setRequired(true))
    ),
  async execute(interaction) {
    if (!interaction.guild) return;
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "add") {
        const sticker = await interaction.guild.stickers.create({
          name: interaction.options.getString("name", true),
          file: await fetchBuffer(interaction.options.getString("url", true)),
          tags: interaction.options.getString("tags", true),
          description: interaction.options.getString("description") ?? "Server sticker",
          reason: `Sticker added by ${interaction.user.tag}`
        });
        await interaction.reply({ content: `Created sticker **${sticker.name}**.`, flags: MessageFlags.Ephemeral });
        return;
      }

      const sticker = await interaction.guild.stickers.fetch(interaction.options.getString("id", true));
      await sticker.delete(`Sticker deleted by ${interaction.user.tag}`);
      await interaction.reply({ content: "Sticker deleted.", flags: MessageFlags.Ephemeral });
    } catch {
      await interaction.reply({
        content: "Sticker action failed. Check URL, sticker slots, file type, and my Manage Expressions permission.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
