import { AttachmentBuilder, EmbedBuilder, type GuildMember, type MessageCreateOptions } from "discord.js";
import { getActiveVisualTemplate } from "./visual-templates.js";
import { renderBlushWelcomeCard, renderWelcomeCard } from "./welcome-card.js";

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
      const image = await renderBlushWelcomeCard(member, test);
      return {
        content: messageTemplate
          ? renderWelcomeText(messageTemplate, member)
          : `Welcome ${member} to **${member.guild.name}**! ♡`,
        files: [new AttachmentBuilder(image, {
          name: "baddieverse-welcome.png",
          description: "Welcome to Baddieverse! Peek at the rules, say hi, and find your next duo."
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
