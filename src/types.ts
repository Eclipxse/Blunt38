import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from "discord.js";

export type Command = {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export type GuildConfig = {
  guildId: string;
  welcomeChannelId?: string;
  welcomeMessage?: string;
  logChannelId?: string;
  ticketCategoryId?: string;
  supportRoleId?: string;
  verifiedRoleId?: string;
  autoRoleId?: string;
  tempVoiceJoinChannelId?: string;
  tempVoiceCategoryId?: string;
  birthdayChannelId?: string;
  lastBirthdayRun?: string;
  levelingEnabled?: boolean;
  levelUpChannelId?: string;
  aiResponderEnabled?: boolean;
  aiResponderChannelId?: string;
  aiResponderPrompt?: string;
  aiResponderPersona?: "default" | "genz-girl" | "professional" | "sassy";
  accentColor?: number;
};

export type ModCase = {
  id: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  action: "warn" | "timeout" | "kick" | "ban";
  reason: string;
  durationMs?: number;
  createdAt: string;
};

export type Poll = {
  id: string;
  guildId: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  createdAt: string;
};

export type RolePanel = {
  id: string;
  guildId: string;
  title: string;
  roleIds: string[];
  createdAt: string;
};

export type Giveaway = {
  id: string;
  guildId: string;
  channelId: string;
  messageId?: string;
  prize: string;
  winnerCount: number;
  endsAt: string;
  entrantIds: string[];
  ended: boolean;
  createdAt: string;
};

export type LevelRecord = {
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  lastXpAt?: string;
};

export type Birthday = {
  guildId: string;
  userId: string;
  month: number;
  day: number;
  createdAt: string;
};

export type TempVoiceChannel = {
  guildId: string;
  channelId: string;
  ownerId: string;
  createdAt: string;
};

export type StoreShape = {
  guilds: Record<string, GuildConfig>;
  modCases: Record<string, ModCase[]>;
  polls: Record<string, Poll>;
  rolePanels: Record<string, RolePanel>;
  giveaways: Record<string, Giveaway>;
  levels: Record<string, Record<string, LevelRecord>>;
  birthdays: Record<string, Record<string, Birthday>>;
  tempVoiceChannels: Record<string, TempVoiceChannel>;
};
