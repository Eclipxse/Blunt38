import {
  ActionRowBuilder,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import type { Command } from "../types.js";
import { createRolePanel } from "../services/store.js";
import { panelEmbed, palette } from "../utils/ui.js";

export const rolePanelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("role-panel")
    .setDescription("Post a dropdown self-role panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addRoleOption((option) => option.setName("role_1").setDescription("Role option 1.").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Panel title.")
        .setMaxLength(80)
    )
    .addRoleOption((option) => option.setName("role_2").setDescription("Role option 2."))
    .addRoleOption((option) => option.setName("role_3").setDescription("Role option 3."))
    .addRoleOption((option) => option.setName("role_4").setDescription("Role option 4."))
    .addRoleOption((option) => option.setName("role_5").setDescription("Role option 5."))
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Where to post the role panel.")
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return;

    const roles = [1, 2, 3, 4, 5]
      .map((index) => interaction.options.getRole(`role_${index}`))
      .filter((role): role is NonNullable<typeof role> => Boolean(role));

    const roleIds = [...new Set(roles.map((role) => role.id))];
    const title = interaction.options.getString("title") ?? "Choose Your Roles";
    const selected = interaction.options.getChannel("channel");
    const target = selected
      ? await interaction.guild?.channels.fetch(selected.id)
      : interaction.channel;

    if (!target || target.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Pick a normal text channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const panel = await createRolePanel(interaction.guildId, title, roleIds);
    const select = new StringSelectMenuBuilder()
      .setCustomId(`roles:select:${panel.id}`)
      .setPlaceholder("Pick your roles")
      .setMinValues(0)
      .setMaxValues(roleIds.length)
      .addOptions(
        roles.map((role, index) => ({
          label: role.name.slice(0, 100),
          value: role.id,
          emoji: ["🎀", "✨", "🌙", "💫", "🌸"][index] ?? "✨"
        }))
      );

    await target.send({
      embeds: [
        panelEmbed(title, "ROLE VAULT", "Use the dropdown below to add or remove your roles.", palette.violet)
          .addFields({ name: "Available Roles", value: roles.map((role) => `${role}`).join("\n"), inline: false })
      ],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)]
    });

    await interaction.reply({ content: `Role panel posted in ${target}.`, flags: MessageFlags.Ephemeral });
  }
};
