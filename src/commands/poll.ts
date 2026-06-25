import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command, Poll } from "../types.js";
import { createPoll } from "../services/store.js";
import { embed, palette, progressBar } from "../utils/ui.js";

const pollEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

export function pollEmbed(poll: Poll) {
  const counts = poll.options.map((_, index) =>
    Object.values(poll.votes).filter((vote) => vote === index).length
  );
  const total = counts.reduce((sum, count) => sum + count, 0);

  return embed("Live Poll", poll.question, palette.electric).addFields(
    poll.options.map((option, index) => {
      const count = counts[index] ?? 0;
      const pct = total === 0 ? 0 : Math.round((count / total) * 100);
      return {
        name: `${index + 1}. ${option}`,
        value: `${progressBar(pct)}\n${count} vote${count === 1 ? "" : "s"}`,
        inline: false
      };
    })
  );
}

export function pollRows(poll: Poll) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      poll.options.map((option, index) =>
        new ButtonBuilder()
          .setCustomId(`poll:vote:${poll.id}:${index}`)
          .setEmoji(pollEmojis[index] ?? "✨")
          .setLabel("Vote")
          .setStyle(ButtonStyle.Secondary)
      )
    )
  ];
}

export const pollCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a button poll.")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Poll question.")
        .setRequired(true)
        .setMaxLength(200)
    )
    .addStringOption((option) =>
      option
        .setName("option_1")
        .setDescription("First option.")
        .setRequired(true)
        .setMaxLength(80)
    )
    .addStringOption((option) =>
      option
        .setName("option_2")
        .setDescription("Second option.")
        .setRequired(true)
        .setMaxLength(80)
    )
    .addStringOption((option) => option.setName("option_3").setDescription("Third option.").setMaxLength(80))
    .addStringOption((option) => option.setName("option_4").setDescription("Fourth option.").setMaxLength(80)),
  async execute(interaction) {
    if (!interaction.guildId) return;

    const question = interaction.options.getString("question", true);
    const options = [1, 2, 3, 4]
      .map((index) => interaction.options.getString(`option_${index}`))
      .filter((option): option is string => Boolean(option));

    const poll = await createPoll(interaction.guildId, question, options);

    await interaction.reply({
      embeds: [pollEmbed(poll)],
      components: pollRows(poll)
    });

    await interaction.followUp({ content: "Poll created.", flags: MessageFlags.Ephemeral });
  }
};
