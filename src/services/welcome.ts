import { AttachmentBuilder, type GuildMember, type MessageCreateOptions } from "discord.js";
import { palette, panelEmbed } from "../utils/ui.js";
import { getActiveVisualTemplate } from "./visual-templates.js";
import { renderWelcomeCard } from "./welcome-card.js";

export function renderWelcomeText(
  template: string | undefined,
  member: GuildMember
) {
  const fallback = "Welcome {user} to **{server}**.";
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

  return {
    embeds: [
      panelEmbed(
        "Welcome",
        "ARRIVAL",
        renderWelcomeText(messageTemplate, member),
        accentColor ?? palette.primary,
        "Joined"
      ).addFields({
        name: test ? "Member" : "Member Count",
        value: test ? `${member}` : `${member.guild.memberCount}`,
        inline: true
      })
    ]
  };
}
