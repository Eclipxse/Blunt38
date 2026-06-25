import { ButtonInteraction, MessageFlags } from "discord.js";
import { embed, palette } from "../utils/ui.js";

const choices = ["rock", "paper", "scissors"] as const;

function outcome(player: string, bot: string) {
  if (player === bot) return "Draw.";
  if (
    (player === "rock" && bot === "scissors") ||
    (player === "paper" && bot === "rock") ||
    (player === "scissors" && bot === "paper")
  ) {
    return "You win.";
  }

  return "I win.";
}

export async function handleGameButton(interaction: ButtonInteraction) {
  const player = interaction.customId.split(":")[2];
  if (!choices.includes(player as (typeof choices)[number])) {
    await interaction.reply({ content: "Invalid move.", flags: MessageFlags.Ephemeral });
    return;
  }

  const bot = choices[Math.floor(Math.random() * choices.length)];
  await interaction.reply({
    embeds: [
      embed(
        "Rock Paper Scissors",
        `You picked **${player}**.\nI picked **${bot}**.\n\n**${outcome(player, bot)}**`,
        palette.primary
      )
    ],
    flags: MessageFlags.Ephemeral
  });
}
