import { createHash } from "node:crypto";
import { AttachmentBuilder, EmbedBuilder, type GuildMember, type MessageCreateOptions } from "discord.js";
import { getActiveVisualTemplate } from "./visual-templates.js";
import { renderBaddieverseWelcomeCard, renderWelcomeCard } from "./welcome-card.js";

export function welcomeMessageNonce(member: Pick<GuildMember, "guild" | "id" | "joinedTimestamp">): string {
  // Each delivery of the same join gets the same nonce, including across bot processes.
  return createHash("sha256")
    .update(`welcome:${member.guild.id}:${member.id}:${member.joinedTimestamp ?? "unknown"}`)
    .digest("base64url")
    .slice(0, 24);
}

export function renderWelcomeText(
  template: string | undefined,
  member: GuildMember
) {
  const fallback = [
    "Hey {user}, you’re part of the party now! 🎮",
    "Take a peek at the rules, say hi in chat, and find your next duo. 💜"
  ].join("\n\n");
  return (template || fallback)
    .replaceAll("{user}", `${member}`)
    .replaceAll("{mention}", `${member}`)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{membercount}", member.guild.memberCount.toLocaleString("en-US"))
    .replaceAll("{count}", member.guild.memberCount.toLocaleString("en-US"))
    .replaceAll("{created}", member.user.createdAt.toLocaleDateString("en-US"));
}

export async function buildWelcomeMessage(
  member: GuildMember,
  messageTemplate: string | undefined,
  accentColor: number | undefined,
  test = false
): Promise<MessageCreateOptions> {
  try {
    const document = await getActiveVisualTemplate(member.guild.id, "welcome");
    if (document) {
      const image = await renderWelcomeCard(document, { member });
      return {
        content: `Welcome ${member} to **${member.guild.name}**.`,
        files: [new AttachmentBuilder(image, { name: "welcome.png" })]
      };
    }
  } catch (error) {
    console.error("Visual welcome render failed; using embed fallback:", error);
  }

  if (member.guild.name.toLowerCase() === "baddieverse") {
    try {
      const image = await renderBaddieverseWelcomeCard(member, test);
      return {
        content: messageTemplate
          ? renderWelcomeText(messageTemplate, member)
          : `Welcome ${member} to **${member.guild.name}**! ♡`,
        files: [new AttachmentBuilder(image, {
          name: "baddieverse-welcome.png",
          description: "Welcome to Baddieverse! Say hi, read the rules, and find your duo."
        })],
        allowedMentions: { users: test ? [] : [member.id] }
      };
    } catch (error) {
      console.error("Baddieverse welcome render failed; using embed fallback:", error);
    }
  }

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(accentColor ?? 0xe5a8f1)
        .setTitle(`✦ Welcome to ${member.guild.name}!`)
        .setDescription(renderWelcomeText(messageTemplate, member))
        .setThumbnail(member.displayAvatarURL({ size: 128 }))
        .setFooter({
          text: test
            ? "♡  Welcome preview"
            : `♡  ${member.guild.memberCount.toLocaleString("en-US")} members in the party`
        })
    ]
  };
}
