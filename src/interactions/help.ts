import type { ButtonInteraction } from "discord.js";
import { helpPayload } from "../utils/help-menu.js";

export async function handleHelpButton(interaction: ButtonInteraction) {
  await interaction.update(helpPayload(interaction.customId.split(":")[1]));
}
