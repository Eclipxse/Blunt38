import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type APIEmbedField } from "discord.js";
import { embed, palette } from "./ui.js";

type HelpSection = "music" | "community" | "server";

const sections: Record<HelpSection, { label: string; description: string; color: number; fields: APIEmbedField[] }> = {
  music: {
    label: "Music",
    description: "Join a voice channel, then use `/play query` with a song name or supported link. Use `/search query` to choose a result.",
    color: palette.electric,
    fields: [
      { name: "Playback", value: "`/pause` · `/resume` · `/skip` · `/stop`" },
      { name: "Queue and sound", value: "`/queue` · `/nowplaying` · `/shuffle`\n`/volume percent` · `/loop mode`" },
      {
        name: "More controls",
        value: "`/music previous` · `/music replay` · `/music seek`\n`/music move` · `/music remove` · `/music clear`\n`/music autoplay` · `/music filters`"
      },
      { name: "Settings", value: "`/music settings` — DJ role, default volume, and autoplay. Requires Manage Server." },
      {
        name: "Who can control playback?",
        value: "Stay in the bot's voice channel. If a DJ role is configured, controls require that role, Manage Server, or Move Members."
      }
    ]
  },
  community: {
    label: "Community",
    description: "Everyday commands for members. Select a command in Discord to see its options.",
    color: palette.violet,
    fields: [
      { name: "Chat and games", value: "`/ai ask` · `/poll` · `/minigame` · `/draw start`" },
      { name: "Profiles and activity", value: "`/rank` · `/leaderboard` · `/userinfo` · `/serverinfo`" },
      { name: "Birthdays", value: "`/birthday set` · `/birthday remove` · `/birthday list`" },
      {
        name: "Server panels",
        value: "Use posted panels to open tickets, submit suggestions, choose roles, or enter giveaways. Server staff can publish them from the Server section."
      },
      { name: "Help", value: "Use `/help` any time to return to this guide." }
    ]
  },
  server: {
    label: "Server",
    description: "Configuration, moderation, and publishing. Access depends on each command's permissions and the server's configuration.",
    color: palette.warning,
    fields: [
      { name: "Setup", value: "`/setup` · `/server preview` · `/server build` · `/server cleanup`" },
      { name: "Members and roles", value: "`/moderate` · `/purge` · `/voice disconnect` · `/role`" },
      { name: "Panels and posts", value: "`/ticket-panel` · `/role-panel` · `/suggest-panel`\n`/announce` · `/embed create`" },
      { name: "Automation", value: "`/welcome` · `/goodbye` · `/tempvc` · `/leveling`\n`/starboard` · `/giveaway` · `/birthday channel`" },
      { name: "AI configuration", value: "`/ai setup` · `/ai persona` · `/ai prompt`\n`/ai status` · `/ai disable` — requires Manage Server." },
      { name: "Server expressions", value: "`/emoji` · `/sticker`" },
      {
        name: "Permissions",
        value: "Voice controls use the configured allowlist, or Move Members when no allowlist is set. Role, moderation, and channel tools retain their own permission checks."
      }
    ]
  }
};

export function helpPayload(requestedSection = "music") {
  const section: HelpSection = requestedSection === "community"
    ? "community"
    : requestedSection === "server" || requestedSection === "staff"
      ? "server"
      : "music";
  const content = sections[section];
  const navigation = new ActionRowBuilder<ButtonBuilder>().addComponents(
    (Object.keys(sections) as HelpSection[]).map((key) =>
      new ButtonBuilder()
        .setCustomId(`help:${key}`)
        .setLabel(sections[key].label)
        .setStyle(key === section ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(key === section)
    )
  );

  return {
    embeds: [embed(`${content.label} help`, content.description, content.color).addFields(content.fields)],
    components: [navigation]
  };
}
