import type { Guild, User } from "discord.js";
import { getGuildConfig } from "./store.js";
import { embed, palette } from "../utils/ui.js";
import { buildVisualAttachment } from "./visual-message.js";

export async function logToGuild(
  guild: Guild,
  title: string,
  description: string,
  options: {
    studioType?: "logging" | "moderation";
    user?: User;
    variables?: Record<string, string | number | undefined | null>;
  } = {}
) {
  const config = await getGuildConfig(guild.id);
  if (!config.logChannelId) return;

  const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!channel?.isTextBased() || channel.isDMBased()) return;

  const user = options.user ?? guild.client.user;
  const attachment = await buildVisualAttachment({
    guildId: guild.id,
    studioType: options.studioType ?? "logging",
    user,
    variables: {
      user: user.username,
      mention: `@${user.username}`,
      server: guild.name,
      action: title.toUpperCase(),
      message: description,
      channel: "name" in channel ? `#${channel.name}` : "server log",
      created: new Date().toLocaleString("en-US"),
      ...options.variables
    },
    fileName: options.studioType === "moderation" ? "moderation-case" : "server-log"
  }).catch((error) => {
    console.error("Visual log render failed:", error);
    return null;
  });

  if (attachment) {
    await channel.send({
      content: `**${title}**\n${description}`,
      files: [attachment]
    }).catch(() => null);
    return;
  }

  await channel.send({ embeds: [embed(title, description, palette.muted)] }).catch(() => null);
}
