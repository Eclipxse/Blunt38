import { ButtonInteraction, MessageFlags } from "discord.js";
import { pollEmbed, pollRows } from "../commands/poll.js";
import { votePoll } from "../services/store.js";

export async function handlePollButton(interaction: ButtonInteraction) {
  const [, , pollId, optionIndexRaw] = interaction.customId.split(":");
  const optionIndex = Number(optionIndexRaw);

  if (!Number.isInteger(optionIndex)) {
    await interaction.reply({ content: "Invalid poll option.", flags: MessageFlags.Ephemeral });
    return;
  }

  const poll = await votePoll(pollId, interaction.user.id, optionIndex);
  if (!poll) {
    await interaction.reply({ content: "This poll no longer exists.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.update({
    embeds: [pollEmbed(poll)],
    components: pollRows(poll)
  });
}
