import {
  ActionRowBuilder,
  ButtonInteraction,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction
} from "discord.js";
import { addModCase, getModCases } from "../services/store.js";
import { logToGuild } from "../services/logger.js";
import { formatDuration, parseDuration } from "../utils/format.js";
import { embed, palette } from "../utils/ui.js";

type ModAction = "warn" | "timeout" | "kick" | "ban";

function requiredPermission(action: ModAction) {
  if (action === "kick") return PermissionFlagsBits.KickMembers;
  if (action === "ban") return PermissionFlagsBits.BanMembers;
  return PermissionFlagsBits.ModerateMembers;
}

function actionModal(action: ModAction, userId: string) {
  const modal = new ModalBuilder()
    .setCustomId(`mod:modal:${action}:${userId}`)
    .setTitle(`${action[0]?.toUpperCase()}${action.slice(1)} User`);

  if (action === "timeout") {
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("duration")
          .setLabel("Duration")
          .setPlaceholder("10m, 1h, 1d")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(8)
      )
    );
  }

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Reason")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
    )
  );

  return modal;
}

export async function handleModerationButton(interaction: ButtonInteraction) {
  if (!interaction.guildId || !interaction.guild || !interaction.customId.startsWith("mod:")) return;

  const [, action, userId] = interaction.customId.split(":");

  if (action === "history") {
    const cases = await getModCases(interaction.guildId, userId);
    const target = await interaction.client.users.fetch(userId).catch(() => null);
    const lines = cases.slice(-10).map((modCase) => {
      return `\`${modCase.action}\` by <@${modCase.moderatorId}> - ${modCase.reason} (${formatDuration(modCase.durationMs)})`;
    });

    await interaction.reply({
      embeds: [
        embed(
          "Moderation History",
          lines.length ? lines.join("\n") : `No cases found for ${target ?? `<@${userId}>`}.`,
          palette.muted
        )
      ],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!["warn", "timeout", "kick", "ban"].includes(action)) return;

  const modAction = action as ModAction;
  if (!interaction.memberPermissions?.has(requiredPermission(modAction))) {
    await interaction.reply({ content: "You do not have permission for that action.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.showModal(actionModal(modAction, userId));
}

export async function handleModerationModal(interaction: ModalSubmitInteraction) {
  if (!interaction.guildId || !interaction.guild || !interaction.customId.startsWith("mod:modal:")) return;

  const [, , action, userId] = interaction.customId.split(":");
  if (!["warn", "timeout", "kick", "ban"].includes(action)) return;

  const modAction = action as ModAction;
  if (!interaction.memberPermissions?.has(requiredPermission(modAction))) {
    await interaction.reply({ content: "You do not have permission for that action.", flags: MessageFlags.Ephemeral });
    return;
  }

  const reason = interaction.fields.getTextInputValue("reason").trim();
  let durationMs: number | undefined;

  if (modAction === "timeout") {
    const parsed = parseDuration(interaction.fields.getTextInputValue("duration"));
    if (!parsed || parsed > 2_419_200_000) {
      await interaction.reply({ content: "Use a valid timeout duration up to 28d.", flags: MessageFlags.Ephemeral });
      return;
    }
    durationMs = parsed;
  }

  const member = await interaction.guild.members.fetch(userId).catch(() => null);

  try {
    if (modAction === "timeout") {
      if (!member) throw new Error("Member not found.");
      await member.timeout(durationMs ?? null, reason);
    }

    if (modAction === "kick") {
      if (!member) throw new Error("Member not found.");
      await member.kick(reason);
    }

    if (modAction === "ban") {
      await interaction.guild.members.ban(userId, { reason });
    }
  } catch {
    await interaction.reply({
      content: "Action failed. Check role hierarchy and bot permissions.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const modCase = await addModCase({
    guildId: interaction.guildId,
    userId,
    moderatorId: interaction.user.id,
    action: modAction,
    reason,
    durationMs
  });

  await interaction.reply({
    content: `Case \`${modCase.id.slice(0, 8)}\`: ${modAction} saved for <@${userId}>.`,
    flags: MessageFlags.Ephemeral
  });

  await logToGuild(
    interaction.guild,
    "Moderation Action",
    `${interaction.user} used **${modAction}** on <@${userId}>.\nReason: ${reason}`
  );
}
