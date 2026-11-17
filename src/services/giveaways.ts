import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  TextChannel
} from "discord.js";
import type { Giveaway } from "../types.js";
import { claimGiveawayEnd, listActiveGiveaways } from "./store.js";
import { palette, statusValue } from "../utils/ui.js";
import { env } from "../env.js";

export function giveawayEmbed(giveaway: Giveaway, winnerMentions: string[] = (giveaway.winnerIds ?? []).map((id) => `<@${id}>`)) {
  const ended = giveaway.ended || Date.parse(giveaway.endsAt) <= Date.now();
  const description = ended
    ? winnerMentions.length
      ? `Prize: **${giveaway.prize}**\nWinners: ${winnerMentions.join(", ")}`
      : `Prize: **${giveaway.prize}**\nNo valid entrants.`
    : `Prize: **${giveaway.prize}**\nEnds: <t:${Math.floor(Date.parse(giveaway.endsAt) / 1000)}:R>\nEntrants: **${giveaway.entrantIds.length}**\nWinners: **${giveaway.winnerCount}**`;

  return new EmbedBuilder()
    .setColor(ended ? palette.success : palette.warning)
    .setAuthor({ name: env.brandName })
    .setTitle(ended ? "GIVEAWAY COMPLETE" : "GIVEAWAY LIVE")
    .setDescription(description)
    .addFields(
      { name: "State", value: ended ? statusValue("Ended") : statusValue("Live"), inline: true },
      { name: "Entries", value: statusValue(`${giveaway.entrantIds.length}`), inline: true }
    )
    .setFooter({ text: `Giveaway ID: ${giveaway.id}` })
    .setTimestamp();
}

export function giveawayRows(giveaway: Giveaway, disabled = false) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway:enter:${giveaway.id}`)
        .setEmoji("🎁")
        .setLabel("Enter")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled || giveaway.ended)
    )
  ];
}

export async function endGiveaway(client: Client, id: string, guildId: string) {
  const ended = await claimGiveawayEnd(id, guildId);
  if (!ended) return false;
  const giveaway = ended;
  const winners = ended.winnerIds ?? [];

  const guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);
  const channel = giveaway.channelId
    ? await guild?.channels.fetch(giveaway.channelId).catch(() => null)
    : null;

  if (channel instanceof TextChannel && giveaway.messageId) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    await message?.edit({
      embeds: [giveawayEmbed(ended, winners.map((winner) => `<@${winner}>`))],
      components: giveawayRows(ended, true)
    }).catch(() => null);

    if (winners.length) {
      await channel.send(`Congrats ${winners.map((winner) => `<@${winner}>`).join(", ")}! You won **${giveaway.prize}**.`);
    }
  }

  return true;
}

export function startGiveawayScheduler(client: Client) {
  const check = async () => {
    const active = await listActiveGiveaways();
    await Promise.all(
      active
        .filter((giveaway) => Date.parse(giveaway.endsAt) <= Date.now())
        .map((giveaway) => endGiveaway(client, giveaway.id, giveaway.guildId))
    );
  };

  const runCheck = () => {
    void check().catch((error) => {
      console.error("Giveaway scheduler failed:", error);
    });
  };

  runCheck();
  return setInterval(runCheck, 30_000);
}
