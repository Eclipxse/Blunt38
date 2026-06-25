import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { embed, palette } from "../utils/ui.js";

export const minigameCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("minigame")
    .setDescription("Play small server games.")
    .setDMPermission(false)
    .addSubcommand((subcommand) => subcommand.setName("coinflip").setDescription("Flip a coin."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("dice")
        .setDescription("Roll a die.")
        .addIntegerOption((option) => option.setName("sides").setDescription("Number of sides.").setMinValue(2).setMaxValue(100))
    )
    .addSubcommand((subcommand) => subcommand.setName("rps").setDescription("Play rock paper scissors with buttons.")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "coinflip") {
      await interaction.reply({
        embeds: [embed("Coin Flip", Math.random() > 0.5 ? "Heads" : "Tails", palette.primary)]
      });
      return;
    }

    if (subcommand === "dice") {
      const sides = interaction.options.getInteger("sides") ?? 6;
      await interaction.reply({
        embeds: [embed("Dice Roll", `You rolled **${1 + Math.floor(Math.random() * sides)}** on a d${sides}.`, palette.primary)]
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("game:rps:rock").setEmoji("🪨").setLabel("Rock").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("game:rps:paper").setEmoji("📄").setLabel("Paper").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("game:rps:scissors").setEmoji("✂️").setLabel("Scissors").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [embed("Rock Paper Scissors", "Choose your move.", palette.primary)],
      components: [row]
    });
  }
};
