import { aiCommand } from "./ai.js";
import type { Command } from "../types.js";
import { birthdayCommand } from "./birthday.js";
import { embedBuilderCommand } from "./embed-builder.js";
import { emojiCommand, stickerCommand } from "./emoji-sticker.js";
import { giveawayCommand } from "./giveaway.js";
import { helpCommand } from "./help.js";
import { serverInfoCommand, userInfoCommand } from "./info.js";
import { leaderboardCommand, levelingCommand, rankCommand } from "./leveling.js";
import { minigameCommand } from "./minigame.js";
import { moderateCommand } from "./moderate.js";
import { musicCommand } from "./music.js";
import { pollCommand } from "./poll.js";
import { roleCommand } from "./role.js";
import { rolePanelCommand } from "./role-panel.js";
import { setupCommand } from "./setup.js";
import { suggestPanelCommand } from "./suggest-panel.js";
import { tempVcCommand } from "./temp-vc.js";
import { ticketPanelCommand } from "./ticket-panel.js";
import { voiceCommand } from "./voice.js";
import { welcomeCommand } from "./welcome.js";

export const commands: Command[] = [
  helpCommand,
  aiCommand,
  setupCommand,
  welcomeCommand,
  roleCommand,
  ticketPanelCommand,
  rolePanelCommand,
  moderateCommand,
  pollCommand,
  suggestPanelCommand,
  tempVcCommand,
  giveawayCommand,
  levelingCommand,
  rankCommand,
  leaderboardCommand,
  embedBuilderCommand,
  birthdayCommand,
  serverInfoCommand,
  userInfoCommand,
  emojiCommand,
  stickerCommand,
  minigameCommand,
  musicCommand,
  voiceCommand
];

export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
export const commandData = commands.map((command) => command.data.toJSON());
