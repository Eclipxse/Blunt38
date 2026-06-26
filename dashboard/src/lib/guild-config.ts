import { query } from "@/lib/db";

export type AiPersona = "default" | "genz-girl" | "professional" | "sassy";

export type GuildConfig = {
  guildId: string;
  welcomeChannelId: string | null;
  welcomeMessage: string | null;
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
  accentColor: number;
  updatedAt: string | null;
};

type GuildConfigRow = {
  guild_id: string;
  welcome_channel_id: string | null;
  welcome_message: string | null;
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
  accent_color: number | null;
  updated_at: string | null;
};

export type GuildConfigPatch = Partial<Omit<GuildConfig, "guildId" | "updatedAt">>;

const defaultWelcome = "Welcome {user} to {server}. You are member #{count}.";
const defaultPrompt =
  "Reply like a fun Gen Z community girl. Keep it short, warm, witty, and never mean. Match the user's energy.";

function fallback(guildId: string): GuildConfig {
  return {
    guildId,
    welcomeChannelId: null,
    welcomeMessage: defaultWelcome,
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
    accentColor: 0x38dff8,
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
  if (typeof value !== "number" || !Number.isFinite(value)) return 0x38dff8;
  return Math.max(0, Math.min(0xffffff, Math.round(value)));
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
    welcomeChannelId: cleanString(patch.welcomeChannelId ?? current.welcomeChannelId),
    welcomeMessage: cleanString(patch.welcomeMessage ?? current.welcomeMessage) ?? defaultWelcome,
    logChannelId: cleanString(patch.logChannelId ?? current.logChannelId),
    ticketCategoryId: cleanString(patch.ticketCategoryId ?? current.ticketCategoryId),
    supportRoleId: cleanString(patch.supportRoleId ?? current.supportRoleId),
    verifiedRoleId: cleanString(patch.verifiedRoleId ?? current.verifiedRoleId),
    autoRoleId: cleanString(patch.autoRoleId ?? current.autoRoleId),
    tempVoiceJoinChannelId: cleanString(patch.tempVoiceJoinChannelId ?? current.tempVoiceJoinChannelId),
    tempVoiceCategoryId: cleanString(patch.tempVoiceCategoryId ?? current.tempVoiceCategoryId),
    birthdayChannelId: cleanString(patch.birthdayChannelId ?? current.birthdayChannelId),
    levelUpChannelId: cleanString(patch.levelUpChannelId ?? current.levelUpChannelId),
    aiResponderChannelId: cleanString(patch.aiResponderChannelId ?? current.aiResponderChannelId),
    aiResponderPrompt: cleanString(patch.aiResponderPrompt ?? current.aiResponderPrompt) ?? defaultPrompt,
    aiResponderPersona: cleanPersona(patch.aiResponderPersona ?? current.aiResponderPersona),
    levelingEnabled: cleanBoolean(patch.levelingEnabled ?? current.levelingEnabled),
    aiResponderEnabled: cleanBoolean(patch.aiResponderEnabled ?? current.aiResponderEnabled),
    accentColor: cleanColor(patch.accentColor ?? current.accentColor),
    updatedAt: current.updatedAt
  };

  const result = await query<GuildConfigRow>(
    `insert into public.guild_configs (
      guild_id, welcome_channel_id, welcome_message, log_channel_id, ticket_category_id, support_role_id,
      verified_role_id, auto_role_id, temp_voice_join_channel_id, temp_voice_category_id, birthday_channel_id,
      leveling_enabled, level_up_channel_id, ai_responder_enabled, ai_responder_channel_id,
      ai_responder_prompt, ai_responder_persona, accent_color
    ) values (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18
    )
    on conflict (guild_id) do update set
      welcome_channel_id = excluded.welcome_channel_id,
      welcome_message = excluded.welcome_message,
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
      accent_color = excluded.accent_color
    returning *`,
    [
      guildId,
      next.welcomeChannelId,
      next.welcomeMessage,
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
      next.accentColor
    ]
  );

  return toConfig(result.rows[0], guildId);
}
