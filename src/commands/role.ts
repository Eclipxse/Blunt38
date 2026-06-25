import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";

export const roleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Give, remove, and configure automatic roles.")
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
