import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { embed, palette } from "../utils/ui.js";

export const serverInfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show server information.")
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.guild) return;
    const guild = interaction.guild;

    await interaction.reply({
      embeds: [
        embed("Server Info", `Information for **${guild.name}**.`, palette.primary)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: "Members", value: `${guild.memberCount}`, inline: true },
            { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
            { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
            { name: "Channels", value: `${guild.channels.cache.size}`, inline: true },
            { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
            { name: "Boosts", value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true }
          )
      ]
    });
  }
};

export const userInfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show user information.")
    .setDMPermission(false)
    .addUserOption((option) => option.setName("user").setDescription("User to inspect.")),
  async execute(interaction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user") ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    await interaction.reply({
      embeds: [
        embed("User Info", `${user}`, palette.primary)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: "User ID", value: user.id, inline: true },
            { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: "Joined Server", value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown", inline: true },
            { name: "Roles", value: member ? `${Math.max(0, member.roles.cache.size - 1)}` : "0", inline: true }
          )
      ]
    });
  }
};
