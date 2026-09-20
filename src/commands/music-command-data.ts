import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types.js";

export const directMusicActions = [
  "play", "search", "pause", "resume", "skip", "stop",
  "queue", "nowplaying", "volume", "loop", "shuffle"
] as const;

/** Build registration data without importing the playback engine or credentials. */
export function createMusicCommandData(musicFilterChoices: Array<{ name: string; value: string }>) {
  const legacy = new SlashCommandBuilder()
    .setName("music")
    .setDescription("Play and control music in voice channels.")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("play")
        .setDescription("Play a song, playlist, or supported link.")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Song name, YouTube link, Spotify link, SoundCloud link, etc.")
            .setRequired(true)
            .setMaxLength(500)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setDescription("Search and choose the exact track from a menu.")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Song title, artist, or search phrase.")
            .setRequired(true)
            .setMaxLength(200)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("pause").setDescription("Pause the current track."))
    .addSubcommand((subcommand) => subcommand.setName("resume").setDescription("Resume the current track."))
    .addSubcommand((subcommand) => subcommand.setName("previous").setDescription("Play the previous track."))
    .addSubcommand((subcommand) => subcommand.setName("replay").setDescription("Restart the current track."))
    .addSubcommand((subcommand) => subcommand.setName("skip").setDescription("Skip the current track."))
    .addSubcommand((subcommand) => subcommand.setName("stop").setDescription("Stop playback and leave voice."))
    .addSubcommand((subcommand) => subcommand.setName("queue").setDescription("Show the music queue."))
    .addSubcommand((subcommand) => subcommand.setName("nowplaying").setDescription("Show the current track."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("volume")
        .setDescription("Set player volume.")
        .addIntegerOption((option) =>
          option
            .setName("percent")
            .setDescription("Volume from 1 to 100.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("loop")
        .setDescription("Set loop mode.")
        .addStringOption((option) =>
          option
            .setName("mode")
            .setDescription("Loop mode.")
            .setRequired(true)
            .addChoices(
              { name: "Off", value: "off" },
              { name: "Track", value: "track" },
              { name: "Queue", value: "queue" }
            )
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("shuffle").setDescription("Shuffle the upcoming queue."))
    .addSubcommand((subcommand) => subcommand.setName("clear").setDescription("Clear every upcoming track."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("seek")
        .setDescription("Jump to a timestamp in the current track.")
        .addStringOption((option) =>
          option
            .setName("position")
            .setDescription("Seconds or a timestamp such as 1:30.")
            .setRequired(true)
            .setMaxLength(12)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("autoplay")
        .setDescription("Toggle related-song autoplay for this voice session.")
        .addBooleanOption((option) =>
          option.setName("enabled").setDescription("Whether autoplay should stay on.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("filters")
        .setDescription("Apply a polished sound preset.")
        .addStringOption((option) =>
          option
            .setName("preset")
            .setDescription("Sound profile.")
            .setRequired(true)
            .addChoices(...musicFilterChoices)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("move")
        .setDescription("Move an upcoming track to another queue position.")
        .addIntegerOption((option) =>
          option.setName("from").setDescription("Current queue position.").setRequired(true).setMinValue(1)
        )
        .addIntegerOption((option) =>
          option.setName("to").setDescription("New queue position.").setRequired(true).setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a track from the queue.")
        .addIntegerOption((option) =>
          option
            .setName("position")
            .setDescription("Queue position, starting at 1.")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("settings")
        .setDescription("View or change this server's DJ role and playback defaults.")
        .addRoleOption((option) =>
          option.setName("dj_role").setDescription("Role allowed to control active music sessions.")
        )
        .addBooleanOption((option) =>
          option.setName("clear_dj_role").setDescription("Remove the DJ-role requirement.")
        )
        .addIntegerOption((option) =>
          option
            .setName("default_volume")
            .setDescription("Starting volume for new players.")
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addBooleanOption((option) =>
          option.setName("autoplay_default").setDescription("Default autoplay state for new players.")
        )
    );

  const advanced = new SlashCommandBuilder()
    .setName("music")
    .setDescription("Advanced playback controls and server music settings.")
    .setDMPermission(false);
  const direct: SlashCommandBuilder[] = [];

  for (const action of legacy.options) {
    if (!(action instanceof SlashCommandSubcommandBuilder)) {
      throw new Error("Music commands must contain only subcommands.");
    }
    if (directMusicActions.some((name) => name === action.name)) {
      const command = new SlashCommandBuilder()
        .setName(action.name)
        .setDescription(action.description)
        .setDMPermission(false);
      // Reuse validated option builders so shortcut limits cannot drift from legacy commands.
      command.options.push(...action.options);
      direct.push(command);
    } else {
      advanced.addSubcommand(action);
    }
  }

  return { direct, advanced };
}

export function createMusicCommands(
  execute: (interaction: ChatInputCommandInteraction, action: string) => Promise<void>,
  filterChoices: Array<{ name: string; value: string }>
): Command[] {
  const { direct, advanced } = createMusicCommandData(filterChoices);
  return [
    ...direct.map((data): Command => ({
      data,
      execute: (interaction) => execute(interaction, data.name)
    })),
    {
      data: advanced,
      // Handle old nested commands during Discord's command-menu refresh, too.
      execute: (interaction) => execute(interaction, interaction.options.getSubcommand())
    }
  ];
}
