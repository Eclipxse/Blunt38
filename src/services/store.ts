import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  Birthday,
  Giveaway,
  GuildConfig,
  LevelRecord,
  ModCase,
  Poll,
  RolePanel,
  StoreShape,
  TempVoiceChannel
} from "../types.js";
import { postgresEnabled, query } from "./db.js";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "store.json");

type DbDate = Date | string;

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
  last_birthday_run: string | null;
  leveling_enabled: boolean;
  level_up_channel_id: string | null;
  ai_responder_enabled: boolean;
  ai_responder_channel_id: string | null;
  ai_responder_prompt: string | null;
  ai_responder_persona: GuildConfig["aiResponderPersona"] | null;
  accent_color: number | null;
};

type ModCaseRow = Omit<ModCase, "guildId" | "userId" | "moderatorId" | "durationMs" | "createdAt"> & {
  guild_id: string;
  user_id: string;
  moderator_id: string;
  duration_ms: number | string | null;
  created_at: DbDate;
};

type PollRow = Omit<Poll, "guildId" | "createdAt"> & {
  guild_id: string;
  created_at: DbDate;
};

type RolePanelRow = Omit<RolePanel, "guildId" | "roleIds" | "createdAt"> & {
  guild_id: string;
  role_ids: string[];
  created_at: DbDate;
};

type GiveawayRow = Omit<Giveaway, "guildId" | "channelId" | "messageId" | "winnerCount" | "endsAt" | "entrantIds" | "createdAt"> & {
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  winner_count: number;
  ends_at: DbDate;
  entrant_ids: string[];
  created_at: DbDate;
};

type LevelRecordRow = Omit<LevelRecord, "guildId" | "userId" | "lastXpAt"> & {
  guild_id: string;
  user_id: string;
  xp: number | string;
  last_xp_at: DbDate | null;
};

type BirthdayRow = Omit<Birthday, "guildId" | "userId" | "createdAt"> & {
  guild_id: string;
  user_id: string;
  created_at: DbDate;
};

type TempVoiceChannelRow = Omit<TempVoiceChannel, "guildId" | "channelId" | "ownerId" | "createdAt"> & {
  guild_id: string;
  channel_id: string;
  owner_id: string;
  created_at: DbDate;
};

const emptyStore = (): StoreShape => ({
  guilds: {},
  modCases: {},
  polls: {},
  rolePanels: {},
  giveaways: {},
  levels: {},
  birthdays: {},
  tempVoiceChannels: {}
});

function iso(value: DbDate | null | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function nullable<T>(value: T | undefined) {
  return value ?? null;
}

function toGuildConfig(row: GuildConfigRow): GuildConfig {
  return {
    guildId: row.guild_id,
    welcomeChannelId: row.welcome_channel_id ?? undefined,
    welcomeMessage: row.welcome_message ?? undefined,
    logChannelId: row.log_channel_id ?? undefined,
    ticketCategoryId: row.ticket_category_id ?? undefined,
    supportRoleId: row.support_role_id ?? undefined,
    verifiedRoleId: row.verified_role_id ?? undefined,
    autoRoleId: row.auto_role_id ?? undefined,
    tempVoiceJoinChannelId: row.temp_voice_join_channel_id ?? undefined,
    tempVoiceCategoryId: row.temp_voice_category_id ?? undefined,
    birthdayChannelId: row.birthday_channel_id ?? undefined,
    lastBirthdayRun: row.last_birthday_run ?? undefined,
    levelingEnabled: row.leveling_enabled,
    levelUpChannelId: row.level_up_channel_id ?? undefined,
    aiResponderEnabled: row.ai_responder_enabled,
    aiResponderChannelId: row.ai_responder_channel_id ?? undefined,
    aiResponderPrompt: row.ai_responder_prompt ?? undefined,
    aiResponderPersona: row.ai_responder_persona ?? undefined,
    accentColor: row.accent_color ?? undefined
  };
}

function toModCase(row: ModCaseRow): ModCase {
  return {
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    moderatorId: row.moderator_id,
    action: row.action,
    reason: row.reason,
    durationMs: row.duration_ms === null ? undefined : Number(row.duration_ms),
    createdAt: iso(row.created_at) ?? new Date().toISOString()
  };
}

function toPoll(row: PollRow): Poll {
  return {
    id: row.id,
    guildId: row.guild_id,
    question: row.question,
    options: Array.isArray(row.options) ? row.options : [],
    votes: row.votes && typeof row.votes === "object" && !Array.isArray(row.votes) ? row.votes : {},
    createdAt: iso(row.created_at) ?? new Date().toISOString()
  };
}

function toRolePanel(row: RolePanelRow): RolePanel {
  return {
    id: row.id,
    guildId: row.guild_id,
    title: row.title,
    roleIds: row.role_ids,
    createdAt: iso(row.created_at) ?? new Date().toISOString()
  };
}

function toGiveaway(row: GiveawayRow): Giveaway {
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id ?? undefined,
    prize: row.prize,
    winnerCount: row.winner_count,
    endsAt: iso(row.ends_at) ?? new Date().toISOString(),
    entrantIds: row.entrant_ids,
    ended: row.ended,
    createdAt: iso(row.created_at) ?? new Date().toISOString()
  };
}

function toLevelRecord(row: LevelRecordRow): LevelRecord {
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    xp: Number(row.xp),
    level: row.level,
    lastXpAt: iso(row.last_xp_at)
  };
}

function toBirthday(row: BirthdayRow): Birthday {
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    month: row.month,
    day: row.day,
    createdAt: iso(row.created_at) ?? new Date().toISOString()
  };
}

function toTempVoiceChannel(row: TempVoiceChannelRow): TempVoiceChannel {
  return {
    guildId: row.guild_id,
    channelId: row.channel_id,
    ownerId: row.owner_id,
    createdAt: iso(row.created_at) ?? new Date().toISOString()
  };
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      guilds: parsed.guilds ?? {},
      modCases: parsed.modCases ?? {},
      polls: parsed.polls ?? {},
      rolePanels: parsed.rolePanels ?? {},
      giveaways: parsed.giveaways ?? {},
      levels: parsed.levels ?? {},
      birthdays: parsed.birthdays ?? {},
      tempVoiceChannels: parsed.tempVoiceChannels ?? {}
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyStore();
    }

    throw error;
  }
}

async function writeStore(store: StoreShape) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

async function updateStore<T>(mutator: (store: StoreShape) => T | Promise<T>) {
  const store = await readStore();
  const result = await mutator(store);
  await writeStore(store);
  return result;
}

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  if (postgresEnabled()) {
    const result = await query<GuildConfigRow>("select * from public.guild_configs where guild_id = $1", [guildId]);
    return result.rows[0] ? toGuildConfig(result.rows[0]) : { guildId };
  }

  const store = await readStore();
  return store.guilds[guildId] ?? { guildId };
}

export async function updateGuildConfig(guildId: string, patch: Partial<GuildConfig>) {
  if (postgresEnabled()) {
    const next = { ...(await getGuildConfig(guildId)), ...patch, guildId };
    await query(
      `insert into public.guild_configs (
        guild_id, welcome_channel_id, welcome_message, log_channel_id, ticket_category_id, support_role_id,
        verified_role_id, auto_role_id, temp_voice_join_channel_id, temp_voice_category_id, birthday_channel_id,
        last_birthday_run, leveling_enabled, level_up_channel_id, ai_responder_enabled, ai_responder_channel_id,
        ai_responder_prompt, ai_responder_persona, accent_color
      ) values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19
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
        last_birthday_run = excluded.last_birthday_run,
        leveling_enabled = excluded.leveling_enabled,
        level_up_channel_id = excluded.level_up_channel_id,
        ai_responder_enabled = excluded.ai_responder_enabled,
        ai_responder_channel_id = excluded.ai_responder_channel_id,
        ai_responder_prompt = excluded.ai_responder_prompt,
        ai_responder_persona = excluded.ai_responder_persona,
        accent_color = excluded.accent_color`,
      [
        guildId,
        nullable(next.welcomeChannelId),
        nullable(next.welcomeMessage),
        nullable(next.logChannelId),
        nullable(next.ticketCategoryId),
        nullable(next.supportRoleId),
        nullable(next.verifiedRoleId),
        nullable(next.autoRoleId),
        nullable(next.tempVoiceJoinChannelId),
        nullable(next.tempVoiceCategoryId),
        nullable(next.birthdayChannelId),
        nullable(next.lastBirthdayRun),
        next.levelingEnabled ?? false,
        nullable(next.levelUpChannelId),
        next.aiResponderEnabled ?? false,
        nullable(next.aiResponderChannelId),
        nullable(next.aiResponderPrompt),
        nullable(next.aiResponderPersona),
        nullable(next.accentColor)
      ]
    );
    return next;
  }

  return updateStore((store) => {
    const next = { ...(store.guilds[guildId] ?? { guildId }), ...patch, guildId };
    store.guilds[guildId] = next;
    return next;
  });
}

export async function getAllGuildConfigs() {
  if (postgresEnabled()) {
    const result = await query<GuildConfigRow>("select * from public.guild_configs order by guild_id");
    return result.rows.map(toGuildConfig);
  }

  const store = await readStore();
  return Object.values(store.guilds);
}

export async function addModCase(input: Omit<ModCase, "id" | "createdAt">) {
  if (postgresEnabled()) {
    const modCase: ModCase = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    await query(
      `insert into public.mod_cases (id, guild_id, user_id, moderator_id, action, reason, duration_ms, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        modCase.id,
        modCase.guildId,
        modCase.userId,
        modCase.moderatorId,
        modCase.action,
        modCase.reason,
        nullable(modCase.durationMs),
        modCase.createdAt
      ]
    );
    return modCase;
  }

  return updateStore((store) => {
    const modCase: ModCase = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };

    store.modCases[input.guildId] ??= [];
    store.modCases[input.guildId].push(modCase);
    return modCase;
  });
}

export async function getModCases(guildId: string, userId: string) {
  if (postgresEnabled()) {
    const result = await query<ModCaseRow>(
      "select * from public.mod_cases where guild_id = $1 and user_id = $2 order by created_at asc",
      [guildId, userId]
    );
    return result.rows.map(toModCase);
  }

  const store = await readStore();
  return (store.modCases[guildId] ?? []).filter((modCase) => modCase.userId === userId);
}

export async function createPoll(guildId: string, question: string, options: string[]) {
  if (postgresEnabled()) {
    const poll: Poll = {
      id: randomUUID(),
      guildId,
      question,
      options,
      votes: {},
      createdAt: new Date().toISOString()
    };
    await query(
      `insert into public.polls (id, guild_id, question, options, votes, created_at)
       values ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
      [poll.id, guildId, question, JSON.stringify(options), JSON.stringify(poll.votes), poll.createdAt]
    );
    return poll;
  }

  return updateStore((store) => {
    const poll: Poll = {
      id: randomUUID(),
      guildId,
      question,
      options,
      votes: {},
      createdAt: new Date().toISOString()
    };

    store.polls[poll.id] = poll;
    return poll;
  });
}

export async function votePoll(pollId: string, userId: string, optionIndex: number) {
  if (postgresEnabled()) {
    const poll = await getPoll(pollId);
    if (!poll) return null;
    poll.votes[userId] = optionIndex;
    const result = await query<PollRow>(
      "update public.polls set votes = $2::jsonb where id = $1 returning *",
      [pollId, JSON.stringify(poll.votes)]
    );
    return result.rows[0] ? toPoll(result.rows[0]) : null;
  }

  return updateStore((store) => {
    const poll = store.polls[pollId];
    if (!poll) return null;

    poll.votes[userId] = optionIndex;
    return poll;
  });
}

export async function getPoll(pollId: string) {
  if (postgresEnabled()) {
    const result = await query<PollRow>("select * from public.polls where id = $1", [pollId]);
    return result.rows[0] ? toPoll(result.rows[0]) : null;
  }

  const store = await readStore();
  return store.polls[pollId] ?? null;
}

export async function createRolePanel(guildId: string, title: string, roleIds: string[]) {
  if (postgresEnabled()) {
    const panel: RolePanel = { id: randomUUID(), guildId, title, roleIds, createdAt: new Date().toISOString() };
    await query(
      "insert into public.role_panels (id, guild_id, title, role_ids, created_at) values ($1, $2, $3, $4, $5)",
      [panel.id, guildId, title, roleIds, panel.createdAt]
    );
    return panel;
  }

  return updateStore((store) => {
    const panel: RolePanel = {
      id: randomUUID(),
      guildId,
      title,
      roleIds,
      createdAt: new Date().toISOString()
    };

    store.rolePanels[panel.id] = panel;
    return panel;
  });
}

export async function getRolePanel(panelId: string) {
  if (postgresEnabled()) {
    const result = await query<RolePanelRow>("select * from public.role_panels where id = $1", [panelId]);
    return result.rows[0] ? toRolePanel(result.rows[0]) : null;
  }

  const store = await readStore();
  return store.rolePanels[panelId] ?? null;
}

export async function createGiveaway(input: Omit<Giveaway, "id" | "entrantIds" | "ended" | "createdAt">) {
  if (postgresEnabled()) {
    const giveaway: Giveaway = {
      ...input,
      id: randomUUID(),
      entrantIds: [],
      ended: false,
      createdAt: new Date().toISOString()
    };
    await query(
      `insert into public.giveaways
       (id, guild_id, channel_id, message_id, prize, winner_count, ends_at, entrant_ids, ended, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        giveaway.id,
        giveaway.guildId,
        giveaway.channelId,
        nullable(giveaway.messageId),
        giveaway.prize,
        giveaway.winnerCount,
        giveaway.endsAt,
        giveaway.entrantIds,
        giveaway.ended,
        giveaway.createdAt
      ]
    );
    return giveaway;
  }

  return updateStore((store) => {
    const giveaway: Giveaway = {
      ...input,
      id: randomUUID(),
      entrantIds: [],
      ended: false,
      createdAt: new Date().toISOString()
    };

    store.giveaways[giveaway.id] = giveaway;
    return giveaway;
  });
}

export async function updateGiveaway(id: string, patch: Partial<Giveaway>) {
  if (postgresEnabled()) {
    const current = await getGiveaway(id);
    if (!current) return null;
    const next = { ...current, ...patch, id };
    const result = await query<GiveawayRow>(
      `update public.giveaways set
        guild_id = $2,
        channel_id = $3,
        message_id = $4,
        prize = $5,
        winner_count = $6,
        ends_at = $7,
        entrant_ids = $8,
        ended = $9,
        created_at = $10
       where id = $1
       returning *`,
      [
        id,
        next.guildId,
        next.channelId,
        nullable(next.messageId),
        next.prize,
        next.winnerCount,
        next.endsAt,
        next.entrantIds,
        next.ended,
        next.createdAt
      ]
    );
    return result.rows[0] ? toGiveaway(result.rows[0]) : null;
  }

  return updateStore((store) => {
    const giveaway = store.giveaways[id];
    if (!giveaway) return null;

    const next = { ...giveaway, ...patch, id };
    store.giveaways[id] = next;
    return next;
  });
}

export async function getGiveaway(id: string) {
  if (postgresEnabled()) {
    const result = await query<GiveawayRow>("select * from public.giveaways where id = $1", [id]);
    return result.rows[0] ? toGiveaway(result.rows[0]) : null;
  }

  const store = await readStore();
  return store.giveaways[id] ?? null;
}

export async function listActiveGiveaways() {
  if (postgresEnabled()) {
    const result = await query<GiveawayRow>("select * from public.giveaways where ended = false order by ends_at asc");
    return result.rows.map(toGiveaway);
  }

  const store = await readStore();
  return Object.values(store.giveaways).filter((giveaway) => !giveaway.ended);
}

export async function enterGiveaway(id: string, userId: string) {
  if (postgresEnabled()) {
    const giveaway = await getGiveaway(id);
    if (!giveaway || giveaway.ended) return null;

    const entered = giveaway.entrantIds.includes(userId);
    if (!entered) {
      giveaway.entrantIds.push(userId);
      await updateGiveaway(id, { entrantIds: giveaway.entrantIds });
    }

    return { giveaway, entered: !entered };
  }

  return updateStore((store) => {
    const giveaway = store.giveaways[id];
    if (!giveaway || giveaway.ended) return null;

    const entered = giveaway.entrantIds.includes(userId);
    if (!entered) giveaway.entrantIds.push(userId);
    return { giveaway, entered: !entered };
  });
}

export async function getLevelRecord(guildId: string, userId: string) {
  if (postgresEnabled()) {
    const result = await query<LevelRecordRow>(
      "select * from public.level_records where guild_id = $1 and user_id = $2",
      [guildId, userId]
    );
    return result.rows[0] ? toLevelRecord(result.rows[0]) : null;
  }

  const store = await readStore();
  return store.levels[guildId]?.[userId] ?? null;
}

export async function addXp(guildId: string, userId: string, amount: number, nextLevel: (xp: number) => number) {
  if (postgresEnabled()) {
    const current = await getLevelRecord(guildId, userId) ?? { guildId, userId, xp: 0, level: 0 };
    const previousLevel = current.level;
    const xp = current.xp + amount;
    const level = nextLevel(xp);
    const lastXpAt = new Date().toISOString();
    const result = await query<LevelRecordRow>(
      `insert into public.level_records (guild_id, user_id, xp, level, last_xp_at)
       values ($1, $2, $3, $4, $5)
       on conflict (guild_id, user_id) do update set
        xp = excluded.xp,
        level = excluded.level,
        last_xp_at = excluded.last_xp_at
       returning *`,
      [guildId, userId, xp, level, lastXpAt]
    );
    const record = result.rows[0] ? toLevelRecord(result.rows[0]) : { guildId, userId, xp, level, lastXpAt };
    return { record, previousLevel, leveledUp: level > previousLevel };
  }

  return updateStore((store) => {
    store.levels[guildId] ??= {};
    const current: LevelRecord = store.levels[guildId][userId] ?? {
      guildId,
      userId,
      xp: 0,
      level: 0
    };

    const previousLevel = current.level;
    const xp = current.xp + amount;
    const level = nextLevel(xp);
    const record: LevelRecord = {
      ...current,
      xp,
      level,
      lastXpAt: new Date().toISOString()
    };

    store.levels[guildId][userId] = record;
    return { record, previousLevel, leveledUp: level > previousLevel };
  });
}

export async function listTopLevels(guildId: string, limit = 10) {
  if (postgresEnabled()) {
    const result = await query<LevelRecordRow>(
      "select * from public.level_records where guild_id = $1 order by xp desc limit $2",
      [guildId, limit]
    );
    return result.rows.map(toLevelRecord);
  }

  const store = await readStore();
  return Object.values(store.levels[guildId] ?? {})
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

export async function setBirthday(guildId: string, userId: string, month: number, day: number) {
  if (postgresEnabled()) {
    const birthday: Birthday = { guildId, userId, month, day, createdAt: new Date().toISOString() };
    await query(
      `insert into public.birthdays (guild_id, user_id, month, day, created_at)
       values ($1, $2, $3, $4, $5)
       on conflict (guild_id, user_id) do update set
        month = excluded.month,
        day = excluded.day`,
      [guildId, userId, month, day, birthday.createdAt]
    );
    return birthday;
  }

  return updateStore((store) => {
    store.birthdays[guildId] ??= {};
    const birthday: Birthday = {
      guildId,
      userId,
      month,
      day,
      createdAt: new Date().toISOString()
    };

    store.birthdays[guildId][userId] = birthday;
    return birthday;
  });
}

export async function removeBirthday(guildId: string, userId: string) {
  if (postgresEnabled()) {
    const result = await query("delete from public.birthdays where guild_id = $1 and user_id = $2", [guildId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  return updateStore((store) => {
    const existed = Boolean(store.birthdays[guildId]?.[userId]);
    delete store.birthdays[guildId]?.[userId];
    return existed;
  });
}

export async function listBirthdays(guildId: string) {
  if (postgresEnabled()) {
    const result = await query<BirthdayRow>(
      "select * from public.birthdays where guild_id = $1 order by month asc, day asc",
      [guildId]
    );
    return result.rows.map(toBirthday);
  }

  const store = await readStore();
  return Object.values(store.birthdays[guildId] ?? {});
}

export async function listBirthdaysForDate(guildId: string, month: number, day: number) {
  if (postgresEnabled()) {
    const result = await query<BirthdayRow>(
      "select * from public.birthdays where guild_id = $1 and month = $2 and day = $3",
      [guildId, month, day]
    );
    return result.rows.map(toBirthday);
  }

  const birthdays = await listBirthdays(guildId);
  return birthdays.filter((birthday) => birthday.month === month && birthday.day === day);
}

export async function addTempVoiceChannel(channel: TempVoiceChannel) {
  if (postgresEnabled()) {
    await query(
      `insert into public.temp_voice_channels (channel_id, guild_id, owner_id, created_at)
       values ($1, $2, $3, $4)
       on conflict (channel_id) do update set
        guild_id = excluded.guild_id,
        owner_id = excluded.owner_id,
        created_at = excluded.created_at`,
      [channel.channelId, channel.guildId, channel.ownerId, channel.createdAt]
    );
    return channel;
  }

  return updateStore((store) => {
    store.tempVoiceChannels[channel.channelId] = channel;
    return channel;
  });
}

export async function getTempVoiceChannel(channelId: string) {
  if (postgresEnabled()) {
    const result = await query<TempVoiceChannelRow>(
      "select * from public.temp_voice_channels where channel_id = $1",
      [channelId]
    );
    return result.rows[0] ? toTempVoiceChannel(result.rows[0]) : null;
  }

  const store = await readStore();
  return store.tempVoiceChannels[channelId] ?? null;
}

export async function removeTempVoiceChannel(channelId: string) {
  if (postgresEnabled()) {
    const result = await query("delete from public.temp_voice_channels where channel_id = $1", [channelId]);
    return (result.rowCount ?? 0) > 0;
  }

  return updateStore((store) => {
    const existed = Boolean(store.tempVoiceChannels[channelId]);
    delete store.tempVoiceChannels[channelId];
    return existed;
  });
}
