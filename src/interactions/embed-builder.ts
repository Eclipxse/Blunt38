import { ChannelType, EmbedBuilder, MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { palette } from "../utils/ui.js";

export async function handleEmbedModal(interaction: ModalSubmitInteraction) {
  if (!interaction.guild || !interaction.customId.startsWith("embed:create:")) return;

  const channelId = interaction.customId.split(":")[2];
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "The target channel is no longer valid.", flags: MessageFlags.Ephemeral });
    return;
  }

  const rawColor = interaction.fields.getTextInputValue("color").trim().replace(/^#/, "");
  const color = /^[0-9a-fA-F]{6}$/.test(rawColor) ? Number.parseInt(rawColor, 16) : palette.primary;
  const image = interaction.fields.getTextInputValue("image").trim();
  const footer = interaction.fields.getTextInputValue("footer").trim();

  const built = new EmbedBuilder()
    .setColor(color)
    .setTitle(interaction.fields.getTextInputValue("title").trim())
    .setDescription(interaction.fields.getTextInputValue("description").trim())
    .setTimestamp();

  if (image) built.setImage(image);
  if (footer) built.setFooter({ text: footer });

  await channel.send({ embeds: [built] });
  await interaction.reply({ content: `Embed sent in ${channel}.`, flags: MessageFlags.Ephemeral });
}
