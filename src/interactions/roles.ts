import { MessageFlags, StringSelectMenuInteraction } from "discord.js";
import { getRolePanel } from "../services/store.js";

export async function handleRoleSelect(interaction: StringSelectMenuInteraction) {
  if (!interaction.guild || !interaction.customId.startsWith("roles:select:")) return;

  const panelId = interaction.customId.split(":")[2];
  const panel = await getRolePanel(panelId);

  if (!panel || panel.guildId !== interaction.guild.id) {
    await interaction.reply({ content: "This role panel no longer exists.", flags: MessageFlags.Ephemeral });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const selected = new Set(interaction.values);
  const add = panel.roleIds.filter((roleId) => selected.has(roleId) && !member.roles.cache.has(roleId));
  const remove = panel.roleIds.filter((roleId) => !selected.has(roleId) && member.roles.cache.has(roleId));

  try {
    if (add.length) await member.roles.add(add, "Self-role panel");
    if (remove.length) await member.roles.remove(remove, "Self-role panel");
    await interaction.reply({ content: "Your roles have been updated.", flags: MessageFlags.Ephemeral });
  } catch {
    await interaction.reply({
      content: "I could not update one of those roles. Make sure my role is above the panel roles.",
      flags: MessageFlags.Ephemeral
    });
  }
}
