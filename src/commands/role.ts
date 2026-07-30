import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Role
} from "discord.js";
import {
  createRolePermissionSession,
  rolePermissionBuilderPayload
} from "../interactions/role-permissions.js";
import {
  isRolePresetKey,
  missingMemberPermissions,
  parseRoleColor,
  permissionSummary,
  roleEditProblem,
  rolePresetChoices,
  rolePresets,
  type PermissionSpec,
  type RolePreset
} from "../services/role-permissions.js";
import { updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";
import { palette, panelEmbed, warningEmbed } from "../utils/ui.js";

type CommandInteraction = Parameters<Command["execute"]>[0];

async function permissionGrantProblem(
  interaction: CommandInteraction,
  permissions: PermissionSpec[]
) {
  if (!interaction.guild) return "This command only works in a server.";

  const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();
  const moderator = await interaction.guild.members.fetch(interaction.user.id);
  const botMissing = missingMemberPermissions(botMember, permissions);
  const moderatorMissing = interaction.guild.ownerId === interaction.user.id
    ? []
    : missingMemberPermissions(moderator, permissions);

  if (botMissing.length) {
    return `blunt38 cannot grant permissions it does not have: ${permissionSummary(botMissing)}`;
  }

  if (moderatorMissing.length) {
    return `You cannot grant permissions you do not have: ${permissionSummary(moderatorMissing)}`;
  }

  return null;
}

async function applyPreset(
  interaction: CommandInteraction,
  role: Role,
  preset: RolePreset
) {
  if (!interaction.guild) return;

  const editProblem = await roleEditProblem(interaction.guild, interaction.user.id, role);
  if (editProblem) {
    await interaction.reply({
      embeds: [warningEmbed("Role Factory Blocked", editProblem)],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const grantProblem = await permissionGrantProblem(interaction, preset.permissions);
  if (grantProblem) {
    await interaction.reply({
      embeds: [warningEmbed("Preset Blocked", grantProblem)],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    await role.setPermissions(
      preset.permissions.map((permission) => permission.flag),
      `${preset.name} preset applied by ${interaction.user.tag}`
    );

    await interaction.reply({
      embeds: [
        panelEmbed(
          "Role Preset Applied",
          "PERMISSION LOADOUT",
          `Applied the \`${preset.name}\` profile to ${role}.`,
          palette.electric,
          "Applied"
        ).addFields(
          { name: "Purpose", value: preset.description, inline: false },
          { name: "Permissions", value: permissionSummary(preset.permissions), inline: false },
          {
            name: "Important",
            value: "This replaced the role's server-wide permissions. Existing channel overrides were not changed.",
            inline: false
          }
        )
      ],
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error("Role preset failed:", error);
    await interaction.reply({
      embeds: [
        warningEmbed(
          "Preset Failed",
          "Discord rejected the role update. Check Manage Roles and move blunt38 above the target role."
        )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

async function createRole(interaction: CommandInteraction) {
  if (!interaction.guild || !interaction.guildId) return;

  const name = interaction.options.getString("name", true).trim();
  const presetKey = interaction.options.getString("preset");
  const color = parseRoleColor(interaction.options.getString("color"));
  const hoist = interaction.options.getBoolean("hoist") ?? false;
  const mentionable = interaction.options.getBoolean("mentionable") ?? false;
  const preset = presetKey && isRolePresetKey(presetKey) ? rolePresets[presetKey] : null;

  if (!name) {
    await interaction.reply({
      embeds: [warningEmbed("Invalid Role Name", "Give the role a visible name.")],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (color === null) {
    await interaction.reply({
      embeds: [warningEmbed("Invalid Color", "Use a six-digit hex color such as `#8f63c7`.")],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (preset) {
    const grantProblem = await permissionGrantProblem(interaction, preset.permissions);
    if (grantProblem) {
      await interaction.reply({
        embeds: [warningEmbed("Role Creation Blocked", grantProblem)],
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  }

  try {
    const role = await interaction.guild.roles.create({
      name,
      color,
      hoist,
      mentionable,
      permissions: preset?.permissions.map((permission) => permission.flag) ?? [],
      reason: `Role Factory creation by ${interaction.user.tag}`
    });

    if (!preset) {
      const session = createRolePermissionSession(
        interaction.guildId,
        interaction.user.id,
        role
      );
      await interaction.reply({
        ...rolePermissionBuilderPayload(session),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.reply({
      embeds: [
        panelEmbed(
          "Role Created",
          "ROLE FACTORY",
          `Created ${role} with the \`${preset.name}\` permission loadout.`,
          color,
          "Live"
        ).addFields(
          { name: "Purpose", value: preset.description, inline: false },
          { name: "Permissions", value: permissionSummary(preset.permissions), inline: false },
          { name: "Displayed Separately", value: hoist ? "`Yes`" : "`No`", inline: true },
          { name: "Mentionable", value: mentionable ? "`Yes`" : "`No`", inline: true }
        )
      ],
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error("Role creation failed:", error);
    await interaction.reply({
      embeds: [
        warningEmbed(
          "Role Creation Failed",
          "Check Manage Roles, the role hierarchy, and the supplied role color."
        )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
}

async function openPermissionBuilder(interaction: CommandInteraction) {
  if (!interaction.guild || !interaction.guildId) return;

  const selectedRole = interaction.options.getRole("role", true);
  const role = await interaction.guild.roles.fetch(selectedRole.id).catch(() => null);

  if (!role) {
    await interaction.reply({
      embeds: [warningEmbed("Role Missing", "I could not load that role.")],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const problem = await roleEditProblem(interaction.guild, interaction.user.id, role);
  if (problem) {
    await interaction.reply({
      embeds: [warningEmbed("Role Factory Blocked", problem)],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const session = createRolePermissionSession(
    interaction.guildId,
    interaction.user.id,
    role
  );
  await interaction.reply({
    ...rolePermissionBuilderPayload(session),
    flags: MessageFlags.Ephemeral
  });
}

export const roleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Create, assign, and configure server roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a named role with a preset or custom permissions.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name for the new role.")
            .setMinLength(1)
            .setMaxLength(100)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("preset")
            .setDescription("Optional automatic permission loadout.")
            .addChoices(...rolePresetChoices)
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("Optional hex color, for example #8f63c7.")
            .setMaxLength(7)
        )
        .addBooleanOption((option) =>
          option
            .setName("hoist")
            .setDescription("Display members separately in the member list.")
        )
        .addBooleanOption((option) =>
          option
            .setName("mentionable")
            .setDescription("Allow members to mention this role.")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("permissions")
        .setDescription("Open the detailed permission builder for a role.")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to edit.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("preset")
        .setDescription("Apply a complete permission preset to an existing role.")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role whose permissions will be replaced.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("preset")
            .setDescription("Permission profile to apply.")
            .setRequired(true)
            .addChoices(...rolePresetChoices)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("give")
        .setDescription("Give a role to a member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to update.").setRequired(true)
        )
        .addRoleOption((option) =>
          option.setName("role").setDescription("Role to give.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from a member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to update.").setRequired(true)
        )
        .addRoleOption((option) =>
          option.setName("role").setDescription("Role to remove.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("autorole")
        .setDescription("Set the role given to new members.")
        .addRoleOption((option) =>
          option.setName("role").setDescription("Join role.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clear-autorole")
        .setDescription("Disable automatic join roles.")
    ),
  async execute(interaction) {
    if (!interaction.guildId || !interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      await createRole(interaction);
      return;
    }

    if (subcommand === "permissions") {
      await openPermissionBuilder(interaction);
      return;
    }

    if (subcommand === "preset") {
      const selectedRole = interaction.options.getRole("role", true);
      const selectedPreset = interaction.options.getString("preset", true);
      const preset = isRolePresetKey(selectedPreset) ? rolePresets[selectedPreset] : null;
      const role = await interaction.guild.roles.fetch(selectedRole.id).catch(() => null);

      if (!preset || !role) {
        await interaction.reply({
          embeds: [warningEmbed("Preset Failed", "I could not load that role or permission preset.")],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await applyPreset(interaction, role, preset);
      return;
    }

    if (subcommand === "autorole") {
      const role = interaction.options.getRole("role", true);
      await updateGuildConfig(interaction.guildId, { autoRoleId: role.id });
      await interaction.reply({
        content: `Autorole set to ${role}.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === "clear-autorole") {
      await updateGuildConfig(interaction.guildId, { autoRoleId: undefined });
      await interaction.reply({
        content: "Autorole disabled.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const selectedRole = interaction.options.getRole("role", true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const role = await interaction.guild.roles.fetch(selectedRole.id).catch(() => null);

    if (!member || !role) {
      await interaction.reply({
        content: "I could not find that member or role.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      if (subcommand === "give") {
        await member.roles.add(role.id, `Role command by ${interaction.user.tag}`);
        await interaction.reply({
          content: `Gave ${role} to ${member}.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await member.roles.remove(role.id, `Role command by ${interaction.user.tag}`);
      await interaction.reply({
        content: `Removed ${role} from ${member}.`,
        flags: MessageFlags.Ephemeral
      });
    } catch {
      await interaction.reply({
        content: "Role update failed. Put my bot role above the target role and check Manage Roles.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
