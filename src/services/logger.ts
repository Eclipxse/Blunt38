import type { Guild } from "discord.js";
import { getGuildConfig } from "./store.js";
import { embed, palette } from "../utils/ui.js";

export async function logToGuild(guild: Guild, title: string, description: string) {
  const config = await getGuildConfig(guild.id);
  if (!config.logChannelId) return;

  const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!channel?.isTextBased() || channel.isDMBased()) return;

  await channel.send({ embeds: [embed(title, description, palette.muted)] }).catch(() => null);
}
