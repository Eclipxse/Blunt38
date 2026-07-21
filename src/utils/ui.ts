import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type APIEmbedField
} from "discord.js";
import { env } from "../env.js";

export const palette = {
  primary: 0x6d3fa0,
  electric: 0xc26cff,
  violet: 0x8f63c7,
  success: 0x22c55e,
  warning: 0xf59e0b,
  danger: 0xef4444,
  muted: 0x21162d
};

export function embed(title: string, description?: string, color = palette.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${env.brandName} Premium Suite` })
    .setTitle(`${title}`)
    .setDescription(description ?? null)
    .setFooter({ text: `${env.brandName} // powered control system` })
    .setTimestamp();
}

export function panelEmbed(title: string, kicker: string, description: string, color = palette.primary, status = "Online") {
  const built = embed(title, premiumDescription(description), color).setTitle(`${kicker} | ${title}`);
  if (status) built.addFields({ name: "Status", value: statusValue(status), inline: true });
  return built;
}

export function successEmbed(title: string, description: string) {
  return embed(title, description, palette.success);
}

export function warningEmbed(title: string, description: string) {
  return embed(title, description, palette.warning);
}

export function statusValue(value: string) {
  return `\`${value}\``;
}

export function premiumDescription(description: string) {
  return [`**${description}**`, "", "`Premium interface`"].join("\n");
}

export function progressBar(percent: number, size = 14) {
  const normalized = Math.max(0, Math.min(100, percent));
  const filled = Math.round((normalized / 100) * size);
  return `[${"#".repeat(filled)}${"-".repeat(size - filled)}] ${normalized}%`;
}

export function compactFields(fields: APIEmbedField[]) {
  return fields.filter((field) => field.value && field.value.trim().length > 0);
}

export function backButton(customId = "setup:home") {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setEmoji("↩️")
    .setLabel("Back")
    .setStyle(ButtonStyle.Secondary);
}

export function dangerConfirmRow(confirmId: string, cancelId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(confirmId).setEmoji("✅").setLabel("Confirm").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(cancelId).setEmoji("🌙").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
  );
}

export function mentionChannel(id?: string) {
  return id ? `<#${id}>` : "`Not set`";
}

export function mentionRole(id?: string) {
  return id ? `<@&${id}>` : "`Not set`";
}
