import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
  type OverwriteResolvable
} from "discord.js";
import { getGuildConfig } from "../services/store.js";
import { logToGuild } from "../services/logger.js";
import { safeChannelName } from "../utils/format.js";
import { dangerConfirmRow, embed, palette, panelEmbed } from "../utils/ui.js";

const ticketKinds = [
  { label: "Support", value: "support", description: "General help and server questions", emoji: "💬" },
  { label: "Report", value: "report", description: "Report a user, bug, or issue", emoji: "🚩" },
  { label: "Partnership", value: "partnership", description: "Partnership and business requests", emoji: "🤝" },
  { label: "Other", value: "other", description: "Anything that does not fit above", emoji: "✨" }
];

function ticketControlRow(ownerId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket:claim:${ownerId}`).setEmoji("🙋").setLabel("Claim").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ticket:transcript:${ownerId}`).setEmoji("🧾").setLabel("Transcript").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ticket:lock:${ownerId}`).setEmoji("🔒").setLabel("Lock").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ticket:close:${ownerId}`).setEmoji("🫧").setLabel("Close").setStyle(ButtonStyle.Danger)
  );
}

function ticketModal(kind: string) {
  return new ModalBuilder()
    .setCustomId(`ticket:create:${kind}`)
    .setTitle("Open Ticket")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("subject")
          .setLabel("Subject")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(80)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("details")
          .setLabel("Details")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
      )
    );
}

function isStaff(interaction: ButtonInteraction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ?? false;
}

export async function handleTicketComponent(interaction: ButtonInteraction | StringSelectMenuInteraction) {
  if (!interaction.guildId || !interaction.guild) return;

  if (interaction.isButton() && interaction.customId === "ticket:open") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket:kind")
      .setPlaceholder("Choose the ticket vibe")
      .addOptions(ticketKinds);

    await interaction.reply({
      embeds: [panelEmbed("Open Ticket", "SUPPORT PORTAL", "Pick the route that matches your request.", palette.electric)],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket:kind") {
    await interaction.showModal(ticketModal(interaction.values[0] ?? "other"));
    return;
  }

  if (!interaction.isButton()) return;

  const [_, action, ownerId] = interaction.customId.split(":");

  if (!isStaff(interaction)) {
    await interaction.reply({ content: "Only staff can use ticket controls.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!interaction.channel || interaction.channel.isDMBased() || interaction.channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "This control only works inside ticket channels.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === "claim") {
    await interaction.reply({ content: `${interaction.user} claimed this ticket.` });
    await logToGuild(interaction.guild, "Ticket Claimed", `${interaction.user} claimed ${interaction.channel}.`);
    return;
  }

  if (action === "transcript") {
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const transcript = [...messages.values()]
      .reverse()
      .map((message) => `[${message.createdAt.toISOString()}] ${message.author.tag}: ${message.cleanContent || "[embed/file]"}`)
      .join("\n");

    const file = new AttachmentBuilder(Buffer.from(transcript || "No messages.", "utf8"), {
      name: `transcript-${interaction.channel.id}.txt`
    });

    await interaction.reply({ content: "Here is the latest transcript.", files: [file], flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === "lock") {
    await interaction.channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => null);
    await interaction.reply({ content: "Ticket locked for the opener." });
    await logToGuild(interaction.guild, "Ticket Locked", `${interaction.user} locked ${interaction.channel}.`);
    return;
  }

  if (action === "close") {
    await interaction.reply({
      content: "Close this ticket?",
      components: [dangerConfirmRow(`ticket:close-confirm:${ownerId}`, `ticket:close-cancel:${ownerId}`)],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (action === "close-cancel") {
    await interaction.update({ content: "Close cancelled.", components: [] });
    return;
  }

  if (action === "close-confirm") {
    await interaction.update({ content: "Closing ticket in 5 seconds.", components: [] });
    await logToGuild(interaction.guild, "Ticket Closed", `${interaction.user} closed ${interaction.channel}.`);
    setTimeout(() => {
      interaction.channel?.delete("Ticket closed").catch(() => null);
    }, 5000);
  }
}

export async function handleTicketModal(interaction: ModalSubmitInteraction) {
  if (!interaction.guildId || !interaction.guild || !interaction.customId.startsWith("ticket:create:")) return;

  const kind = interaction.customId.split(":")[2] ?? "other";
  const subject = interaction.fields.getTextInputValue("subject").trim();
  const details = interaction.fields.getTextInputValue("details").trim();
  const config = await getGuildConfig(interaction.guildId);

  const overwrites: OverwriteResolvable[] = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles
      ]
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  if (config.supportRoleId) {
    overwrites.push({
      id: config.supportRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels
      ]
    });
  }

  const channel = await interaction.guild.channels.create({
    name: `ticket-${safeChannelName(interaction.user.username)}`,
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId,
    topic: `ticket-owner:${interaction.user.id}; ticket-kind:${kind}`,
    permissionOverwrites: overwrites
  });

  await channel.send({
    content: config.supportRoleId ? `<@&${config.supportRoleId}>` : undefined,
    embeds: [
      embed("Ticket Opened", details, palette.primary).addFields(
        { name: "Type", value: kind, inline: true },
        { name: "Subject", value: subject, inline: true },
        { name: "Opened By", value: `${interaction.user}`, inline: true },
        { name: "Staff Controls", value: "`Claim` `Transcript` `Lock` `Close`", inline: false }
      )
    ],
    components: [ticketControlRow(interaction.user.id)]
  });

  await interaction.reply({ content: `Ticket created: ${channel}`, flags: MessageFlags.Ephemeral });
  await logToGuild(interaction.guild, "Ticket Created", `${interaction.user} opened ${channel} (${kind}).`);
}
