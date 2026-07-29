import type {
  GuildMember,
  MessageCreateOptions,
  PartialGuildMember
} from "discord.js";
import { palette, panelEmbed } from "../utils/ui.js";
import { buildVisualAttachment } from "./visual-message.js";

export function renderGoodbyeText(
  template: string | undefined,
  member: GuildMember | PartialGuildMember
) {
  const fallback = "{user} left **{server}**. **{count}** members remain.";
  return (template || fallback)
    .replaceAll("{user}", member.displayName)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{mention}", `@${member.user.username}`)
    .replaceAll("{server}", member.guild.name)
    .replaceAll(
      "{membercount}",
      member.guild.memberCount.toLocaleString("en-US")
    )
    .replaceAll("{count}", member.guild.memberCount.toLocaleString("en-US"));
}

export async function buildGoodbyeMessage(
  member: GuildMember | PartialGuildMember,
  messageTemplate: string | undefined,
  accentColor: number | undefined,
  test = false
): Promise<MessageCreateOptions> {
  const content = renderGoodbyeText(messageTemplate, member);

  try {
    const attachment = await buildVisualAttachment({
      guildId: member.guild.id,
      studioType: "goodbye",
      user: member.user,
      variables: {
        user: member.displayName,
        username: member.user.username,
        mention: `@${member.user.username}`,
        server: member.guild.name,
        membercount: member.guild.memberCount.toLocaleString("en-US"),
        count: member.guild.memberCount.toLocaleString("en-US")
      },
      fileName: "goodbye"
    });

    if (attachment) {
      return {
        content,
        files: [attachment],
        allowedMentions: { parse: [] }
      };
    }
  } catch (error) {
    console.error("Visual goodbye render failed; using embed fallback:", error);
  }

  return {
    embeds: [
      panelEmbed(
        "Goodbye",
        test ? "DEPARTURE PREVIEW" : "DEPARTURE",
        content,
        accentColor ?? palette.primary,
        test ? "Test message" : "Member left"
      ).addFields({
        name: test ? "Preview Member" : "Members Remaining",
        value: test
          ? member.displayName
          : member.guild.memberCount.toLocaleString("en-US"),
        inline: true
      })
    ],
    allowedMentions: { parse: [] }
  };
}
