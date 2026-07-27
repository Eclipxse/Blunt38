import type { Client } from "discord.js";
import { getAllGuildConfigs, listBirthdaysForDate, updateGuildConfig } from "./store.js";
import { embed, palette } from "../utils/ui.js";
import { buildVisualAttachment } from "./visual-message.js";

export function startBirthdayScheduler(client: Client) {
  const check = async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();

    for (const config of await getAllGuildConfigs()) {
      if (!config.birthdayChannelId || config.lastBirthdayRun === today) continue;

      const birthdays = await listBirthdaysForDate(config.guildId, month, day);
      await updateGuildConfig(config.guildId, { lastBirthdayRun: today });
      if (!birthdays.length) continue;

      const guild = await client.guilds.fetch(config.guildId).catch(() => null);
      const channel = await guild?.channels.fetch(config.birthdayChannelId).catch(() => null);
      if (!channel?.isTextBased() || channel.isDMBased()) continue;

      const files = guild
        ? (
            await Promise.all(
              birthdays.slice(0, 10).map(async (birthday) => {
                const user = await guild.client.users.fetch(birthday.userId).catch(() => null);
                if (!user) return null;
                return buildVisualAttachment({
                  guildId: guild.id,
                  studioType: "birthday",
                  user,
                  variables: {
                    user: guild.members.cache.get(user.id)?.displayName ?? user.username,
                    mention: `@${user.username}`,
                    server: guild.name,
                    age: ""
                  },
                  fileName: `birthday-${user.id}`
                }).catch((error) => {
                  console.error("Visual birthday render failed:", error);
                  return null;
                });
              })
            )
          ).filter((file) => file !== null)
        : [];

      if (files.length) {
        await channel.send({
          content: birthdays.map((birthday) => `Happy birthday <@${birthday.userId}>!`).join("\n"),
          files
        }).catch(() => null);
        continue;
      }

      await channel.send({
        embeds: [
          embed(
            "Happy Birthday",
            birthdays.map((birthday) => `Happy birthday <@${birthday.userId}>!`).join("\n"),
            config.accentColor ?? palette.warning
          )
        ]
      }).catch(() => null);
    }
  };

  const runCheck = () => {
    void check().catch((error) => {
      console.error("Birthday scheduler failed:", error);
    });
  };

  runCheck();
  return setInterval(runCheck, 60 * 60 * 1000);
}
