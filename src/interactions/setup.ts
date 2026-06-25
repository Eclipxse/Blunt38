import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  type InteractionReplyOptions,
  type InteractionUpdateOptions,
  type ModalSubmitInteraction
} from "discord.js";
import { getGuildConfig, updateGuildConfig } from "../services/store.js";
import { backButton, compactFields, mentionChannel, mentionRole, palette, panelEmbed, statusValue } from "../utils/ui.js";

function homeRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("setup:channels").setEmoji("🧭").setLabel("Channels").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("setup:tickets").setEmoji("💌").setLabel("Tickets").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("setup:roles").setEmoji("🎀").setLabel("Roles").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("setup:theme").setEmoji("🎨").setLabel("Theme").setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("setup:preview").setEmoji("✨").setLabel("Preview").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("setup:reset").setEmoji("🧼").setLabel("Reset").setStyle(ButtonStyle.Danger)
    )
  ];
}

export async function setupHomePayload(guildId: string): Promise<InteractionReplyOptions> {
  const config = await getGuildConfig(guildId);

  return {
    embeds: [
      panelEmbed("Server Setup", "CONTROL ROOM", "Configure every major bot module from one private panel.", config.accentColor ?? palette.electric)
        .addFields(
          compactFields([
            { name: "Welcome Channel", value: mentionChannel(config.welcomeChannelId), inline: true },
            { name: "Log Channel", value: mentionChannel(config.logChannelId), inline: true },
            { name: "Ticket Category", value: mentionChannel(config.ticketCategoryId), inline: true },
            { name: "Support Role", value: mentionRole(config.supportRoleId), inline: true },
            { name: "Verified Role", value: mentionRole(config.verifiedRoleId), inline: true },
            { name: "Autorole", value: mentionRole(config.autoRoleId), inline: true },
            { name: "Temp VC", value: mentionChannel(config.tempVoiceJoinChannelId), inline: true },
            { name: "Birthday Channel", value: mentionChannel(config.birthdayChannelId), inline: true },
            { name: "Leveling", value: config.levelingEnabled ? statusValue("Enabled") : statusValue("Disabled"), inline: true },
            { name: "Accent", value: `#${(config.accentColor ?? palette.primary).toString(16).padStart(6, "0")}`, inline: true }
          ])
        )
    ],
    components: homeRows(),
    flags: MessageFlags.Ephemeral
  };
}

async function updateWithHome(interaction: ButtonInteraction | ChannelSelectMenuInteraction | RoleSelectMenuInteraction) {
  if (!interaction.guildId) return;
  const payload = await setupHomePayload(interaction.guildId);
  await interaction.update({
    embeds: payload.embeds,
    components: payload.components
  } satisfies InteractionUpdateOptions);
}

async function channelsPayload(guildId: string): Promise<InteractionUpdateOptions> {
  const config = await getGuildConfig(guildId);

  return {
    embeds: [
      panelEmbed("Setup Channels", "ROUTING", "Pick where public messages and staff logs should land.", config.accentColor ?? palette.electric)
    ],
    components: [
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId("setup:select:welcome_channel")
          .setPlaceholder("Pick the welcome channel")
          .addChannelTypes(ChannelType.GuildText)
      ),
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId("setup:select:log_channel")
          .setPlaceholder("Pick the staff log channel")
          .addChannelTypes(ChannelType.GuildText)
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton())
    ]
  };
}

async function ticketsPayload(guildId: string): Promise<InteractionUpdateOptions> {
  const config = await getGuildConfig(guildId);

  return {
    embeds: [
      panelEmbed("Setup Tickets", "SUPPORT", "Connect the private ticket system to staff channels and roles.", config.accentColor ?? palette.violet)
    ],
    components: [
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId("setup:select:ticket_category")
          .setPlaceholder("Pick the ticket category")
          .addChannelTypes(ChannelType.GuildCategory)
      ),
      new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId("setup:select:support_role")
          .setPlaceholder("Pick the support role")
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton())
    ]
  };
}

async function rolesPayload(guildId: string): Promise<InteractionUpdateOptions> {
  const config = await getGuildConfig(guildId);

  return {
    embeds: [
      panelEmbed("Setup Roles", "ACCESS", "Choose the roles used by verification and self-service panels.", config.accentColor ?? palette.success)
    ],
    components: [
      new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId("setup:select:verified_role")
          .setPlaceholder("Pick the verified role")
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton())
    ]
  };
}

function themeModal() {
  return new ModalBuilder()
    .setCustomId("setup:modal:theme")
    .setTitle("Set Bot Theme")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("accent")
          .setLabel("Accent color hex")
          .setPlaceholder("#5865f2")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(7)
      )
    );
}

function canSetup(interaction: ButtonInteraction | ChannelSelectMenuInteraction | RoleSelectMenuInteraction | ModalSubmitInteraction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

export async function handleSetupComponent(
  interaction: ButtonInteraction | ChannelSelectMenuInteraction | RoleSelectMenuInteraction
) {
  if (!interaction.guildId) return;

  if (!canSetup(interaction)) {
    await interaction.reply({ content: "You need Manage Server to use this panel.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === "setup:home") return updateWithHome(interaction);
    if (interaction.customId === "setup:channels") return interaction.update(await channelsPayload(interaction.guildId));
    if (interaction.customId === "setup:tickets") return interaction.update(await ticketsPayload(interaction.guildId));
    if (interaction.customId === "setup:roles") return interaction.update(await rolesPayload(interaction.guildId));
    if (interaction.customId === "setup:theme") return interaction.showModal(themeModal());
    if (interaction.customId === "setup:preview") {
      const config = await getGuildConfig(interaction.guildId);
      await interaction.update({
        embeds: [panelEmbed("Preview", "LIVE THEME", "This is how premium bot panels will look in your server.", config.accentColor ?? palette.electric)],
        components: homeRows()
      });
      return;
    }
    if (interaction.customId === "setup:reset") {
      await updateGuildConfig(interaction.guildId, {
        welcomeChannelId: undefined,
        logChannelId: undefined,
        ticketCategoryId: undefined,
        supportRoleId: undefined,
        verifiedRoleId: undefined,
        autoRoleId: undefined,
        tempVoiceJoinChannelId: undefined,
        tempVoiceCategoryId: undefined,
        birthdayChannelId: undefined,
        levelUpChannelId: undefined,
        levelingEnabled: false,
        aiResponderEnabled: false,
        aiResponderChannelId: undefined,
        aiResponderPrompt: undefined,
        accentColor: undefined
      });
      return updateWithHome(interaction);
    }
  }

  if (interaction.isChannelSelectMenu()) {
    const selected = interaction.values[0];
    if (interaction.customId === "setup:select:welcome_channel") {
      await updateGuildConfig(interaction.guildId, { welcomeChannelId: selected });
      return interaction.update(await channelsPayload(interaction.guildId));
    }
    if (interaction.customId === "setup:select:log_channel") {
      await updateGuildConfig(interaction.guildId, { logChannelId: selected });
      return interaction.update(await channelsPayload(interaction.guildId));
    }
    if (interaction.customId === "setup:select:ticket_category") {
      await updateGuildConfig(interaction.guildId, { ticketCategoryId: selected });
      return interaction.update(await ticketsPayload(interaction.guildId));
    }
  }

  if (interaction.isRoleSelectMenu()) {
    const selected = interaction.values[0];
    if (interaction.customId === "setup:select:support_role") {
      await updateGuildConfig(interaction.guildId, { supportRoleId: selected });
      return interaction.update(await ticketsPayload(interaction.guildId));
    }
    if (interaction.customId === "setup:select:verified_role") {
      await updateGuildConfig(interaction.guildId, { verifiedRoleId: selected });
      return interaction.update(await rolesPayload(interaction.guildId));
    }
  }
}

export async function handleSetupModal(interaction: ModalSubmitInteraction) {
  if (!interaction.guildId || interaction.customId !== "setup:modal:theme") return;

  if (!canSetup(interaction)) {
    await interaction.reply({ content: "You need Manage Server to use this panel.", flags: MessageFlags.Ephemeral });
    return;
  }

  const raw = interaction.fields.getTextInputValue("accent").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    await interaction.reply({ content: "Use a valid hex color like #5865f2.", flags: MessageFlags.Ephemeral });
    return;
  }

  await updateGuildConfig(interaction.guildId, { accentColor: Number.parseInt(raw, 16) });
  await interaction.reply({ content: "Theme updated. Reopen `/setup` to see it everywhere.", flags: MessageFlags.Ephemeral });
}
