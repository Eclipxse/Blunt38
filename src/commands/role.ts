import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";
import { palette, panelEmbed, warningEmbed } from "../utils/ui.js";

type RolePresetKey = "moderator" | "support" | "dj" | "member";

type PermissionSpec = {
  name: string;
  flag: bigint;
};

type RolePreset = {
  name: string;
  description: string;
  permissions: PermissionSpec[];
};

const rolePresets: Record<RolePresetKey, RolePreset> = {
  moderator: {
    name: "Moderator",
    description: "Moderate members, clean conversations, review logs, and control disruptive voice users.",
    permissions: [
      { name: "View Audit Log", flag: PermissionFlagsBits.ViewAuditLog },
      { name: "Kick Members", flag: PermissionFlagsBits.KickMembers },
      { name: "Ban Members", flag: PermissionFlagsBits.BanMembers },
      { name: "Timeout Members", flag: PermissionFlagsBits.ModerateMembers },
      { name: "Manage Messages", flag: PermissionFlagsBits.ManageMessages },
      { name: "Manage Threads", flag: PermissionFlagsBits.ManageThreads },
      { name: "Manage Nicknames", flag: PermissionFlagsBits.ManageNicknames },
      { name: "View Channels", flag: PermissionFlagsBits.ViewChannel },
      { name: "Send Messages", flag: PermissionFlagsBits.SendMessages },
      { name: "Embed Links", flag: PermissionFlagsBits.EmbedLinks },
      { name: "Attach Files", flag: PermissionFlagsBits.AttachFiles },
      { name: "Read Message History", flag: PermissionFlagsBits.ReadMessageHistory },
      { name: "Connect", flag: PermissionFlagsBits.Connect },
      { name: "Speak", flag: PermissionFlagsBits.Speak },
      { name: "Mute Members", flag: PermissionFlagsBits.MuteMembers },
      { name: "Deafen Members", flag: PermissionFlagsBits.DeafenMembers },
      { name: "Move Members", flag: PermissionFlagsBits.MoveMembers }
    ]
  },
  support: {
    name: "Support",
    description: "Handle tickets and member questions without receiving full moderation access.",
    permissions: [
      { name: "View Channels", flag: PermissionFlagsBits.ViewChannel },
      { name: "Send Messages", flag: PermissionFlagsBits.SendMessages },
      { name: "Embed Links", flag: PermissionFlagsBits.EmbedLinks },
      { name: "Attach Files", flag: PermissionFlagsBits.AttachFiles },
      { name: "Read Message History", flag: PermissionFlagsBits.ReadMessageHistory },
      { name: "Manage Messages", flag: PermissionFlagsBits.ManageMessages },
      { name: "Manage Threads", flag: PermissionFlagsBits.ManageThreads },
      { name: "Connect", flag: PermissionFlagsBits.Connect },
      { name: "Speak", flag: PermissionFlagsBits.Speak },
      { name: "Move Members", flag: PermissionFlagsBits.MoveMembers }
    ]
  },
  dj: {
    name: "DJ",
    description: "Use music spaces, stream audio, and move listeners between voice rooms.",
    permissions: [
      { name: "View Channels", flag: PermissionFlagsBits.ViewChannel },
      { name: "Send Messages", flag: PermissionFlagsBits.SendMessages },
      { name: "Embed Links", flag: PermissionFlagsBits.EmbedLinks },
      { name: "Read Message History", flag: PermissionFlagsBits.ReadMessageHistory },
      { name: "Connect", flag: PermissionFlagsBits.Connect },
      { name: "Speak", flag: PermissionFlagsBits.Speak },
      { name: "Video", flag: PermissionFlagsBits.Stream },
      { name: "Voice Activity", flag: PermissionFlagsBits.UseVAD },
      { name: "Move Members", flag: PermissionFlagsBits.MoveMembers }
    ]
  },
  member: {
    name: "Member",
    description: "Standard community access for chatting, media, threads, reactions, and voice.",
    permissions: [
      { name: "Change Nickname", flag: PermissionFlagsBits.ChangeNickname },
      { name: "View Channels", flag: PermissionFlagsBits.ViewChannel },
      { name: "Send Messages", flag: PermissionFlagsBits.SendMessages },
      { name: "Send In Threads", flag: PermissionFlagsBits.SendMessagesInThreads },
      { name: "Create Public Threads", flag: PermissionFlagsBits.CreatePublicThreads },
      { name: "Embed Links", flag: PermissionFlagsBits.EmbedLinks },
      { name: "Attach Files", flag: PermissionFlagsBits.AttachFiles },
      { name: "Add Reactions", flag: PermissionFlagsBits.AddReactions },
      { name: "External Emojis", flag: PermissionFlagsBits.UseExternalEmojis },
      { name: "External Stickers", flag: PermissionFlagsBits.UseExternalStickers },
      { name: "Read Message History", flag: PermissionFlagsBits.ReadMessageHistory },
      { name: "Use Application Commands", flag: PermissionFlagsBits.UseApplicationCommands },
      { name: "Connect", flag: PermissionFlagsBits.Connect },
      { name: "Speak", flag: PermissionFlagsBits.Speak },
      { name: "Video", flag: PermissionFlagsBits.Stream },
      { name: "Voice Activity", flag: PermissionFlagsBits.UseVAD }
    ]
  }
};

const presetChoices = [
  { name: "Moderator", value: "moderator" },
  { name: "Support", value: "support" },
  { name: "DJ", value: "dj" },
  { name: "Member", value: "member" }
] satisfies Array<{ name: string; value: RolePresetKey }>;

function isRolePresetKey(value: string): value is RolePresetKey {
  return value in rolePresets;
}

function permissionSummary(preset: RolePreset) {
  return preset.permissions.map((permission) => `\`${permission.name}\``).join(" ");
}

export const roleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Give, remove, and configure server roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("give")
        .setDescription("Give a role to a member.")
        .addUserOption((option) => option.setName("user").setDescription("Member to update.").setRequired(true))
        .addRoleOption((option) => option.setName("role").setDescription("Role to give.").setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from a member.")
        .addUserOption((option) => option.setName("user").setDescription("Member to update.").setRequired(true))
        .addRoleOption((option) => option.setName("role").setDescription("Role to remove.").setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("autorole")
        .setDescription("Set the role given to new members.")
        .addRoleOption((option) => option.setName("role").setDescription("Join role.").setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clear-autorole")
        .setDescription("Disable automatic join roles.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("preset")
        .setDescription("Apply a complete permission preset to a role.")
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
            .addChoices(...presetChoices)
        )
    ),
  async execute(interaction) {
    if (!interaction.guildId || !interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "autorole") {
      const role = interaction.options.getRole("role", true);
      await updateGuildConfig(interaction.guildId, { autoRoleId: role.id });
      await interaction.reply({ content: `Autorole set to ${role}.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "clear-autorole") {
      await updateGuildConfig(interaction.guildId, { autoRoleId: undefined });
      await interaction.reply({ content: "Autorole disabled.", flags: MessageFlags.Ephemeral });
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

      if (role.id === interaction.guild.id || role.managed) {
        await interaction.reply({
          embeds: [
            warningEmbed(
              "Role Locked",
              "Choose a normal server role. The `@everyone` role and integration-managed roles cannot use presets."
            )
          ],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();
      const moderator = await interaction.guild.members.fetch(interaction.user.id);
      const moderatorCanEdit = interaction.guild.ownerId === interaction.user.id
        || role.position < moderator.roles.highest.position;
      const botCanEdit = botMember.permissions.has(PermissionFlagsBits.ManageRoles)
        && role.position < botMember.roles.highest.position;

      if (!moderatorCanEdit || !botCanEdit) {
        await interaction.reply({
          embeds: [
            warningEmbed(
              "Role Hierarchy Blocked",
              "Both your highest role and blunt38's highest role must be positioned above the target role."
            )
          ],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const missingPermissions = preset.permissions.filter(
        (permission) => !botMember.permissions.has(permission.flag)
      );

      if (missingPermissions.length) {
        await interaction.reply({
          embeds: [
            warningEmbed(
              "Preset Blocked",
              `blunt38 cannot grant permissions it does not have: ${missingPermissions
                .map((permission) => `\`${permission.name}\``)
                .join(" ")}`
            )
          ],
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
              { name: "Permissions", value: permissionSummary(preset), inline: false },
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
      return;
    }

    const user = interaction.options.getUser("user", true);
    const role = interaction.options.getRole("role", true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: "I could not find that member.", flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      if (subcommand === "give") {
        await member.roles.add(role.id, `Role command by ${interaction.user.tag}`);
        await interaction.reply({ content: `Gave ${role} to ${member}.`, flags: MessageFlags.Ephemeral });
        return;
      }

      await member.roles.remove(role.id, `Role command by ${interaction.user.tag}`);
      await interaction.reply({ content: `Removed ${role} from ${member}.`, flags: MessageFlags.Ephemeral });
    } catch {
      await interaction.reply({
        content: "Role update failed. Put my bot role above the target role and check Manage Roles.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
