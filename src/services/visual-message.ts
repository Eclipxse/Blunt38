import { AttachmentBuilder, type User } from "discord.js";
import { getActiveVisualTemplate, type VisualStudioType } from "./visual-templates.js";
import { renderVisualCard } from "./welcome-card.js";

export async function buildVisualAttachment({
  guildId,
  studioType,
  user,
  variables,
  fileName = studioType
}: {
  guildId: string;
  studioType: VisualStudioType;
  user: User;
  variables: Record<string, string | number | undefined | null>;
  fileName?: string;
}) {
  const document = await getActiveVisualTemplate(guildId, studioType);
  if (!document) return null;

  const image = await renderVisualCard(document, {
    avatarUrl: user.displayAvatarURL({ extension: "png", size: 512, forceStatic: true }),
    variables
  });
  return new AttachmentBuilder(image, { name: `${fileName}.png` });
}
