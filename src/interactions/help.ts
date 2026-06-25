import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { panelEmbed, palette } from "../utils/ui.js";

const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId("help:core").setEmoji("🎛️").setLabel("Control").setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId("help:community").setEmoji("💬").setLabel("Community").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("help:staff").setEmoji("🛡️").setLabel("Staff").setStyle(ButtonStyle.Secondary)
);

export async function handleHelpButton(interaction: ButtonInteraction) {
  const section = interaction.customId.split(":")[1];

  if (section === "core") {
    await interaction.update({
      embeds: [
        panelEmbed("Core Commands", "CONTROL", "Daily utility and configuration commands.", palette.electric)
          .addFields(
            { name: "Commands", value: "`/help`\n`/ai ask`\n`/setup`\n`/serverinfo`\n`/userinfo`\n`/embed create`", inline: false }
          )
      ],
      components: [row]
    });
    return;
  }

  if (section === "community") {
    await interaction.update({
      embeds: [
        panelEmbed("Community Commands", "COMMUNITY", "Engagement systems for active servers.", palette.violet)
          .addFields(
            { name: "Commands", value: "`/poll`\n`/giveaway start`\n`/birthday set`\n`/rank`\n`/leaderboard`\n`/minigame`", inline: false }
          )
      ],
      components: [row]
    });
    return;
  }

  await interaction.update({
    embeds: [
        panelEmbed("Staff Commands", "STAFF OPS", "Admin tools for roles, moderation, content, and automation.", palette.warning)
        .addFields(
          { name: "Commands", value: "`/ai setup`\n`/ai persona`\n`/ai disable`\n`/moderate`\n`/role`\n`/welcome`\n`/tempvc`\n`/emoji`\n`/sticker`", inline: false }
        )
    ],
    components: [row]
  });
}
