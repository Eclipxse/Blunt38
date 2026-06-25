import { ButtonInteraction, MessageFlags } from "discord.js";
import { enterGiveaway } from "../services/store.js";
import { giveawayEmbed, giveawayRows } from "../services/giveaways.js";

export async function handleGiveawayButton(interaction: ButtonInteraction) {
  const id = interaction.customId.split(":")[2];
  const result = await enterGiveaway(id, interaction.user.id);

  if (!result) {
    await interaction.reply({ content: "This giveaway is no longer active.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.update({
    embeds: [giveawayEmbed(result.giveaway)],
    components: giveawayRows(result.giveaway)
  });

  await interaction.followUp({
    content: result.entered ? "You entered the giveaway." : "You were already entered.",
    flags: MessageFlags.Ephemeral
  });
}
