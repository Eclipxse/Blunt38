import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction
} from "discord.js";
import { embed, palette } from "../utils/ui.js";

function suggestionModal() {
  return new ModalBuilder()
    .setCustomId("suggest:modal")
    .setTitle("Create Suggestion")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Title")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(80)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("body")
          .setLabel("Details")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
      )
    );
}

function suggestionRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("suggest:approve").setEmoji("🌿").setLabel("Approve").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("suggest:deny").setEmoji("🫧").setLabel("Deny").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("suggest:discuss").setEmoji("💬").setLabel("Discuss").setStyle(ButtonStyle.Secondary)
    )
  ];
}

export async function handleSuggestionButton(interaction: ButtonInteraction) {
  if (interaction.customId === "suggest:open") {
    await interaction.showModal(suggestionModal());
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: "Only staff can review suggestions.", flags: MessageFlags.Ephemeral });
    return;
  }

  const current = interaction.message.embeds[0];
  if (!current) {
    await interaction.reply({ content: "Suggestion embed missing.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.customId === "suggest:discuss") {
    const thread = await interaction.message.startThread({ name: "Suggestion discussion" }).catch(() => null);
    await interaction.reply({
      content: thread ? `Discussion started: ${thread}` : "Could not start a thread here.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const approved = interaction.customId === "suggest:approve";
  const next = EmbedBuilder.from(current)
    .setTitle(approved ? "Suggestion Approved" : "Suggestion Denied")
    .setColor(approved ? palette.success : palette.danger);

  await interaction.update({ embeds: [next], components: [] });
}

export async function handleSuggestionModal(interaction: ModalSubmitInteraction) {
  if (interaction.customId !== "suggest:modal") return;

  const title = interaction.fields.getTextInputValue("title").trim();
  const body = interaction.fields.getTextInputValue("body").trim();

  if (!interaction.channel?.isTextBased() || interaction.channel.isDMBased()) {
    await interaction.reply({ content: "Suggestions must be sent in a server channel.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.channel.send({
    embeds: [
      embed(title, body, palette.warning).addFields({ name: "Suggested By", value: `${interaction.user}`, inline: true })
    ],
    components: suggestionRows()
  });

  await interaction.reply({ content: "Suggestion submitted.", flags: MessageFlags.Ephemeral });
}
