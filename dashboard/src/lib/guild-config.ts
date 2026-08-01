import { query } from "@/lib/db";

export type AiPersona = "default" | "genz-girl" | "professional" | "sassy";

export type GuildConfig = {
  guildId: string;
  welcomeChannelId: string | null;
  welcomeMessage: string | null;
  goodbyeChannelId: string | null;
  goodbyeMessage: string | null;
  logChannelId: string | null;
  ticketCategoryId: string | null;
  supportRoleId: string | null;
  verifiedRoleId: string | null;
  autoRoleId: string | null;
  tempVoiceJoinChannelId: string | null;
  tempVoiceCategoryId: string | null;
  birthdayChannelId: string | null;
  levelingEnabled: boolean;
  levelUpChannelId: string | null;
  aiResponderEnabled: boolean;
  aiResponderChannelId: string | null;
  aiResponderPrompt: string | null;
  aiResponderPersona: AiPersona;
  musicDjRoleId: string | null;
  musicDefaultVolume: number;
  musicAutoplayEnabled: boolean;
  accentColor: number;
  updatedAt: string | null;
};

type GuildConfigRow = {
  guild_id: string;
  welcome_channel_id: string | null;
  welcome_message: string | null;
  goodbye_channel_id: string | null;
  goodbye_message: string | null;
  log_channel_id: string | null;
  ticket_category_id: string | null;
  support_role_id: string | null;
  verified_role_id: string | null;
  auto_role_id: string | null;
  temp_voice_join_channel_id: string | null;
  temp_voice_category_id: string | null;
  birthday_channel_id: string | null;
  leveling_enabled: boolean;
  level_up_channel_id: string | null;
  ai_responder_enabled: boolean;
  ai_responder_channel_id: string | null;
  ai_responder_prompt: string | null;
  ai_responder_persona: AiPersona | null;
  music_dj_role_id: string | null;
  music_default_volume: number | null;
  music_autoplay_enabled: boolean | null;
  accent_color: number | null;
  updated_at: string | null;
};

export type GuildConfigPatch = Partial<Omit<GuildConfig, "guildId" | "updatedAt">>;

const defaultWelcome = "Welcome {user} to {server}. You are member #{count}.";
const defaultGoodbye = "{user} left {server}. {count} members remain.";
const defaultPrompt =
  "Reply like a fun Gen Z community girl. Keep it short, warm, witty, and never mean. Match the user's energy.";

function fallback(guildId: string): GuildConfig {
  return {
    guildId,
    welcomeChannelId: null,
    welcomeMessage: defaultWelcome,
    goodbyeChannelId: null,
    goodbyeMessage: defaultGoodbye,
    logChannelId: null,
    ticketCategoryId: null,
    supportRoleId: null,
    verifiedRoleId: null,
    autoRoleId: null,
    tempVoiceJoinChannelId: null,
    tempVoiceCategoryId: null,
    birthdayChannelId: null,
    levelingEnabled: false,
    levelUpChannelId: null,
    aiResponderEnabled: false,
    aiResponderChannelId: null,
    aiResponderPrompt: defaultPrompt,
    aiResponderPersona: "genz-girl",
    musicDjRoleId: null,
    musicDefaultVolume: 80,
    musicAutoplayEnabled: false,
    accentColor: 0x948ce8,
    updatedAt: null
  };
}

function toConfig(row: GuildConfigRow | undefined, guildId: string): GuildConfig {
  const base = fallback(guildId);
  if (!row) return base;

  return {
    guildId: row.guild_id,
    welcomeChannelId: row.welcome_channel_id,
    welcomeMessage: row.welcome_message ?? base.welcomeMessage,
    goodbyeChannelId: row.goodbye_channel_id,
    goodbyeMessage: row.goodbye_message ?? base.goodbyeMessage,
    logChannelId: row.log_channel_id,
    ticketCategoryId: row.ticket_category_id,
    supportRoleId: row.support_role_id,
    verifiedRoleId: row.verified_role_id,
    autoRoleId: row.auto_role_id,
    tempVoiceJoinChannelId: row.temp_voice_join_channel_id,
    tempVoiceCategoryId: row.temp_voice_category_id,
    birthdayChannelId: row.birthday_channel_id,
    levelingEnabled: row.leveling_enabled,
    levelUpChannelId: row.level_up_channel_id,
    aiResponderEnabled: row.ai_responder_enabled,
    aiResponderChannelId: row.ai_responder_channel_id,
    aiResponderPrompt: row.ai_responder_prompt ?? base.aiResponderPrompt,
    aiResponderPersona: row.ai_responder_persona ?? base.aiResponderPersona,
    musicDjRoleId: row.music_dj_role_id,
    musicDefaultVolume: row.music_default_volume ?? base.musicDefaultVolume,
    musicAutoplayEnabled: row.music_autoplay_enabled ?? base.musicAutoplayEnabled,
    accentColor: row.accent_color ?? base.accentColor,
    updatedAt: row.updated_at
  };
}

function cleanString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanBoolean(value: unknown) {
  return value === true;
}

function cleanPersona(value: unknown): AiPersona {
  if (value === "default" || value === "genz-girl" || value === "professional" || value === "sassy") {
    return value;
  }

  return "genz-girl";
}

function cleanColor(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0x948ce8;
  return Math.max(0, Math.min(0xffffff, Math.round(value)));
}

function cleanVolume(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 80;
  return Math.max(1, Math.min(100, Math.round(value)));
}

function patchedValue<K extends keyof GuildConfigPatch>(
  patch: GuildConfigPatch,
  key: K,
  current: GuildConfig[K]
) {
  return patch[key] === undefined ? current : patch[key];
}

export async function getGuildConfig(guildId: string) {
  const result = await query<GuildConfigRow>("select * from public.guild_configs where guild_id = $1", [guildId]);
  return toConfig(result.rows[0], guildId);
}

export async function updateGuildConfig(guildId: string, patch: GuildConfigPatch) {
  const current = await getGuildConfig(guildId);
  const next: GuildConfig = {
    ...current,
    ...patch,
    guildId,
    welcomeChannelId: cleanString(patchedValue(patch, "welcomeChannelId", current.welcomeChannelId)),
    welcomeMessage: cleanString(patchedValue(patch, "welcomeMessage", current.welcomeMessage)) ?? defaultWelcome,
    goodbyeChannelId: cleanString(patchedValue(patch, "goodbyeChannelId", current.goodbyeChannelId)),
    goodbyeMessage: cleanString(patchedValue(patch, "goodbyeMessage", current.goodbyeMessage)) ?? defaultGoodbye,
    logChannelId: cleanString(patchedValue(patch, "logChannelId", current.logChannelId)),
    ticketCategoryId: cleanString(patchedValue(patch, "ticketCategoryId", current.ticketCategoryId)),
    supportRoleId: cleanString(patchedValue(patch, "supportRoleId", current.supportRoleId)),
    verifiedRoleId: cleanString(patchedValue(patch, "verifiedRoleId", current.verifiedRoleId)),
    autoRoleId: cleanString(patchedValue(patch, "autoRoleId", current.autoRoleId)),
    tempVoiceJoinChannelId: cleanString(
      patchedValue(patch, "tempVoiceJoinChannelId", current.tempVoiceJoinChannelId)
    ),
    tempVoiceCategoryId: cleanString(
      patchedValue(patch, "tempVoiceCategoryId", current.tempVoiceCategoryId)
    ),
    birthdayChannelId: cleanString(patchedValue(patch, "birthdayChannelId", current.birthdayChannelId)),
    levelUpChannelId: cleanString(patchedValue(patch, "levelUpChannelId", current.levelUpChannelId)),
    aiResponderChannelId: cleanString(
      patchedValue(patch, "aiResponderChannelId", current.aiResponderChannelId)
    ),
    aiResponderPrompt: cleanString(
      patchedValue(patch, "aiResponderPrompt", current.aiResponderPrompt)
    ) ?? defaultPrompt,
    aiResponderPersona: cleanPersona(patch.aiResponderPersona ?? current.aiResponderPersona),
    levelingEnabled: cleanBoolean(patch.levelingEnabled ?? current.levelingEnabled),
    aiResponderEnabled: cleanBoolean(patch.aiResponderEnabled ?? current.aiResponderEnabled),
    musicDjRoleId: cleanString(patchedValue(patch, "musicDjRoleId", current.musicDjRoleId)),
    musicDefaultVolume: cleanVolume(
      patchedValue(patch, "musicDefaultVolume", current.musicDefaultVolume)
    ),
    musicAutoplayEnabled: cleanBoolean(
      patchedValue(patch, "musicAutoplayEnabled", current.musicAutoplayEnabled)
    ),
    accentColor: cleanColor(patch.accentColor ?? current.accentColor),
    updatedAt: current.updatedAt
  };

  const result = await query<GuildConfigRow>(
    `insert into public.guild_configs (
      guild_id, welcome_channel_id, welcome_message, goodbye_channel_id, goodbye_message,
      log_channel_id, ticket_category_id, support_role_id, verified_role_id, auto_role_id,
      temp_voice_join_channel_id, temp_voice_category_id, birthday_channel_id, leveling_enabled,
      level_up_channel_id, ai_responder_enabled, ai_responder_channel_id, ai_responder_prompt,
      ai_responder_persona, music_dj_role_id, music_default_volume, music_autoplay_enabled,
      accent_color
    ) values (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16, $17, $18,
      $19, $20, $21, $22, $23
    )
    on conflict (guild_id) do update set
      welcome_channel_id = excluded.welcome_channel_id,
      welcome_message = excluded.welcome_message,
      goodbye_channel_id = excluded.goodbye_channel_id,
      goodbye_message = excluded.goodbye_message,
      log_channel_id = excluded.log_channel_id,
      ticket_category_id = excluded.ticket_category_id,
      support_role_id = excluded.support_role_id,
      verified_role_id = excluded.verified_role_id,
      auto_role_id = excluded.auto_role_id,
      temp_voice_join_channel_id = excluded.temp_voice_join_channel_id,
      temp_voice_category_id = excluded.temp_voice_category_id,
      birthday_channel_id = excluded.birthday_channel_id,
      leveling_enabled = excluded.leveling_enabled,
      level_up_channel_id = excluded.level_up_channel_id,
      ai_responder_enabled = excluded.ai_responder_enabled,
      ai_responder_channel_id = excluded.ai_responder_channel_id,
      ai_responder_prompt = excluded.ai_responder_prompt,
      ai_responder_persona = excluded.ai_responder_persona,
      music_dj_role_id = excluded.music_dj_role_id,
      music_default_volume = excluded.music_default_volume,
      music_autoplay_enabled = excluded.music_autoplay_enabled,
      accent_color = excluded.accent_color
    returning *`,
    [
      guildId,
      next.welcomeChannelId,
      next.welcomeMessage,
      next.goodbyeChannelId,
      next.goodbyeMessage,
      next.logChannelId,
      next.ticketCategoryId,
      next.supportRoleId,
      next.verifiedRoleId,
      next.autoRoleId,
      next.tempVoiceJoinChannelId,
      next.tempVoiceCategoryId,
      next.birthdayChannelId,
      next.levelingEnabled,
      next.levelUpChannelId,
      next.aiResponderEnabled,
      next.aiResponderChannelId,
      next.aiResponderPrompt,
      next.aiResponderPersona,
      next.musicDjRoleId,
      next.musicDefaultVolume,
      next.musicAutoplayEnabled,
      next.accentColor
    ]
  );

  return toConfig(result.rows[0], guildId);
}
