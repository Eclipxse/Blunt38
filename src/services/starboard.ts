import type {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User
} from "discord.js";
import { buildVisualAttachment } from "./visual-message.js";
import {
  getGuildConfig,
  hasStarboardPost,
  saveStarboardPost
} from "./store.js";

const processing = new Set<string>();

export async function handleStarboardReaction(
  incoming: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (user.bot || incoming.emoji.name !== "⭐") return;

  const reaction = incoming.partial ? await incoming.fetch().catch(() => null) : incoming;
  if (!reaction) return;
  const message = reaction.message.partial
    ? await reaction.message.fetch().catch(() => null)
    : reaction.message;
  if (!message?.guild || !message.author) return;

  const config = await getGuildConfig(message.guild.id);
  if (!config.starboardChannelId || message.channel.id === config.starboardChannelId) return;
  if ((reaction.count ?? 0) < (config.starboardThreshold ?? 3)) return;

  const key = `${message.guild.id}:${message.id}`;
  if (processing.has(key) || await hasStarboardPost(message.guild.id, message.id)) return;
  processing.add(key);

  try {
    const channel = await message.guild.channels.fetch(config.starboardChannelId).catch(() => null);
    if (!channel?.isTextBased() || channel.isDMBased()) return;

    const excerpt = message.content.trim().slice(0, 600) || "Attachment-only message";
    const attachment = await buildVisualAttachment({
      guildId: message.guild.id,
      studioType: "starboard",
      user: message.author,
      variables: {
        user: message.member?.displayName ?? message.author.username,
        mention: `@${message.author.username}`,
        server: message.guild.name,
        message: excerpt,
        channel: "name" in message.channel ? `#${message.channel.name}` : "channel",
        stars: reaction.count ?? 0
      },
      fileName: "starboard"
    }).catch((error) => {
      console.error("Visual starboard render failed:", error);
      return null;
    });

    const sent = await channel.send({
      content: `⭐ **${reaction.count ?? 0}** in ${message.channel}\n${excerpt}\n${message.url}`,
      files: attachment ? [attachment] : []
    });
    await saveStarboardPost({
      guildId: message.guild.id,
      sourceMessageId: message.id,
      sourceChannelId: message.channel.id,
      starboardMessageId: sent.id
    });
  } finally {
    processing.delete(key);
  }
}
