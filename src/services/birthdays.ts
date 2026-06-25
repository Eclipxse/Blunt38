import type { Client } from "discord.js";
import { getAllGuildConfigs, listBirthdaysForDate, updateGuildConfig } from "./store.js";
import { embed, palette } from "../utils/ui.js";

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

  void check();
  return setInterval(() => void check(), 60 * 60 * 1000);
}
