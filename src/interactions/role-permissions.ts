import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type Role,
  type StringSelectMenuInteraction
} from "discord.js";
import {
  missingMemberPermissions,
  permissionGroups,
  permissionSummary,
  roleEditProblem,
  rolePermissionKeys,
  specsFromKeys,
  type PermissionGroupKey
} from "../services/role-permissions.js";
import { palette, panelEmbed, warningEmbed } from "../utils/ui.js";

type RolePermissionSession = {
  id: string;
  guildId: string;
  userId: string;
  roleId: string;
  selected: Set<string>;
};

const sessions = new Map<string, RolePermissionSession>();
const groupKeys = Object.keys(permissionGroups) as PermissionGroupKey[];

function sessionCustomId(action: string, session: RolePermissionSession, detail?: string) {
  return ["roleperm", action, session.id, detail].filter(Boolean).join(":");
}

function homeRows(session: RolePermissionSession) {
  const groups = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...groupKeys.map((key) =>
      new ButtonBuilder()
        .setCustomId(sessionCustomId("group", session, key))
        .setLabel(permissionGroups[key].name)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(sessionCustomId("apply", session))
      .setLabel("Apply Permissions")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(sessionCustomId("reset", session))
      .setLabel("Clear All")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(sessionCustomId("cancel", session))
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
  );

  return [groups, actions];
}

export function createRolePermissionSession(
  guildId: string,
  userId: string,
  role: Role
) {
  const session: RolePermissionSession = {
    id: randomUUID().slice(0, 8),
    guildId,
    userId,
    roleId: role.id,
    selected: rolePermissionKeys(role)
  };

  sessions.set(session.id, session);
  const expiry = setTimeout(() => sessions.delete(session.id), 10 * 60 * 1000);
  expiry.unref();
  return session;
}

export function rolePermissionBuilderPayload(session: RolePermissionSession) {
  const selected = specsFromKeys(session.selected);
  return {
    embeds: [
      panelEmbed(
        "Role Factory",
        "CUSTOM PERMISSIONS",
        `Editing <@&${session.roleId}>. Open a category, select permissions, then apply the finished loadout.`,
        palette.electric,
        `${selected.length} selected`
      ).addFields(
        {
          name: "Selected Permissions",
          value: selected.length ? permissionSummary(selected) : "`None`",
          inline: false
        },
        {
          name: "Safety",
          value: "Administrator requires a second confirmation. Channel-specific overrides are not changed.",
          inline: false
        }
      )
    ],
    components: homeRows(session)
  };
}

function groupPayload(session: RolePermissionSession, key: PermissionGroupKey) {
  const group = permissionGroups[key];
  const select = new StringSelectMenuBuilder()
    .setCustomId(sessionCustomId("select", session, key))
    .setPlaceholder(`Choose ${group.name.toLowerCase()} permissions`)
    .setMinValues(0)
    .setMaxValues(group.permissions.length)
    .addOptions(
      group.permissions.map((item) => ({
        label: item.name,
        description: item.description.slice(0, 100),
        value: item.key,
        default: session.selected.has(item.key)
      }))
    );

  const navigation = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(sessionCustomId("home", session))
      .setLabel("All Categories")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(sessionCustomId("apply", session))
      .setLabel("Apply Permissions")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(sessionCustomId("cancel", session))
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [
      panelEmbed(
        group.name,
        "PERMISSION CATEGORY",
        group.description,
        palette.violet,
        `${group.permissions.filter((item) => session.selected.has(item.key)).length}/${group.permissions.length} selected`
      )
    ],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      navigation
    ]
  };
}

function confirmationPayload(session: RolePermissionSession) {
  return {
    embeds: [
      warningEmbed(
        "Administrator Selected",
        `This gives <@&${session.roleId}> every Discord permission and bypasses channel restrictions. Confirm only if that is intentional.`
      )
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(sessionCustomId("confirm", session))
          .setLabel("Grant Administrator")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(sessionCustomId("home", session))
          .setLabel("Go Back")
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

async function applySession(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  session: RolePermissionSession
) {
  if (!interaction.guild) return;

  const role = await interaction.guild.roles.fetch(session.roleId).catch(() => null);
  if (!role) {
    sessions.delete(session.id);
    await interaction.update({
      embeds: [warningEmbed("Role Missing", "That role no longer exists.")],
      components: []
    });
    return;
  }

  const problem = await roleEditProblem(interaction.guild, interaction.user.id, role);
  if (problem) {
    await interaction.update({
      embeds: [warningEmbed("Role Factory Blocked", problem)],
      components: []
    });
    return;
  }

  const selected = specsFromKeys(session.selected);
  const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();
  const moderator = await interaction.guild.members.fetch(interaction.user.id);
  const botMissing = missingMemberPermissions(botMember, selected);
  const moderatorMissing = interaction.guild.ownerId === interaction.user.id
    ? []
    : missingMemberPermissions(moderator, selected);

  if (botMissing.length || moderatorMissing.length) {
    const blocked = botMissing.length ? botMissing : moderatorMissing;
    const subject = botMissing.length ? "blunt38" : "You";
    await interaction.update({
      embeds: [
        warningEmbed(
          "Permissions Blocked",
          `${subject} cannot grant permissions ${subject.toLowerCase()} do not have: ${permissionSummary(blocked)}`
        )
      ],
      components: homeRows(session)
    });
    return;
  }

  try {
    await role.setPermissions(
      selected.map((item) => item.flag),
      `Custom permission loadout applied by ${interaction.user.tag}`
    );
    sessions.delete(session.id);

    await interaction.update({
      embeds: [
        panelEmbed(
          "Custom Role Updated",
          "ROLE FACTORY",
          `Applied \`${selected.length}\` permissions to ${role}.`,
          palette.success,
          "Live"
        ).addFields({
          name: "Permissions",
          value: selected.length ? permissionSummary(selected) : "`No server-wide permissions`",
          inline: false
        })
      ],
      components: []
    });
  } catch (error) {
    console.error("Custom role permissions failed:", error);
    await interaction.update({
      embeds: [
        warningEmbed(
          "Role Update Failed",
          "Discord rejected the permission update. Check the role hierarchy and try again."
        )
      ],
      components: homeRows(session)
    });
  }
}

export async function handleRolePermissionComponent(
  interaction: ButtonInteraction | StringSelectMenuInteraction
) {
  const [, action, sessionId, detail] = interaction.customId.split(":");
  const session = sessions.get(sessionId);

  if (!session || session.guildId !== interaction.guildId) {
    await interaction.update({
      embeds: [warningEmbed("Session Expired", "Run `/role permissions` again to reopen the Role Factory.")],
      components: []
    });
    return;
  }

  if (session.userId !== interaction.user.id) {
    await interaction.reply({
      content: "Only the moderator who opened this Role Factory can use it.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (action === "select" && interaction.isStringSelectMenu()) {
    const key = detail as PermissionGroupKey;
    const group = permissionGroups[key];
    if (!group) return;

    for (const item of group.permissions) session.selected.delete(item.key);
    for (const value of interaction.values) session.selected.add(value);
    await interaction.update(groupPayload(session, key));
    return;
  }

  if (action === "group" && detail in permissionGroups) {
    await interaction.update(groupPayload(session, detail as PermissionGroupKey));
    return;
  }

  if (action === "home") {
    await interaction.update(rolePermissionBuilderPayload(session));
    return;
  }

  if (action === "reset") {
    session.selected.clear();
    await interaction.update(rolePermissionBuilderPayload(session));
    return;
  }

  if (action === "cancel") {
    sessions.delete(session.id);
    await interaction.update({
      embeds: [panelEmbed("Role Factory Closed", "CANCELLED", "No permissions were changed.", palette.muted, "Closed")],
      components: []
    });
    return;
  }

  if (action === "apply" && session.selected.has("administrator")) {
    await interaction.update(confirmationPayload(session));
    return;
  }

  if (action === "apply" || action === "confirm") {
    await applySession(interaction, session);
  }
}
