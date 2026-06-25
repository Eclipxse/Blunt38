create extension if not exists pgcrypto;

create table if not exists public.guild_configs (
  guild_id text primary key,
  welcome_channel_id text,
  welcome_message text,
  log_channel_id text,
  ticket_category_id text,
  support_role_id text,
  verified_role_id text,
  auto_role_id text,
  temp_voice_join_channel_id text,
  temp_voice_category_id text,
  birthday_channel_id text,
  last_birthday_run text,
  leveling_enabled boolean not null default false,
  level_up_channel_id text,
  ai_responder_enabled boolean not null default false,
  ai_responder_channel_id text,
  ai_responder_prompt text,
  ai_responder_persona text check (ai_responder_persona is null or ai_responder_persona in ('default', 'genz-girl', 'professional', 'sassy')),
  accent_color integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mod_cases (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  moderator_id text not null,
  action text not null check (action in ('warn', 'timeout', 'kick', 'ban')),
  reason text not null,
  duration_ms bigint,
  created_at timestamptz not null default now()
);

create index if not exists mod_cases_guild_user_created_idx on public.mod_cases (guild_id, user_id, created_at desc);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  votes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists polls_guild_created_idx on public.polls (guild_id, created_at desc);

create table if not exists public.role_panels (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  title text not null,
  role_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists role_panels_guild_created_idx on public.role_panels (guild_id, created_at desc);

create table if not exists public.giveaways (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  channel_id text not null,
  message_id text,
  prize text not null,
  winner_count integer not null default 1 check (winner_count >= 1),
  ends_at timestamptz not null,
  entrant_ids text[] not null default '{}',
  ended boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists giveaways_active_idx on public.giveaways (ended, ends_at);
create index if not exists giveaways_guild_created_idx on public.giveaways (guild_id, created_at desc);

create table if not exists public.level_records (
  guild_id text not null,
  user_id text not null,
  xp bigint not null default 0,
  level integer not null default 0,
  last_xp_at timestamptz,
  primary key (guild_id, user_id)
);

create index if not exists level_records_leaderboard_idx on public.level_records (guild_id, xp desc);

create table if not exists public.birthdays (
  guild_id text not null,
  user_id text not null,
  month integer not null check (month >= 1 and month <= 12),
  day integer not null check (day >= 1 and day <= 31),
  created_at timestamptz not null default now(),
  primary key (guild_id, user_id)
);

create index if not exists birthdays_date_idx on public.birthdays (guild_id, month, day);

create table if not exists public.temp_voice_channels (
  channel_id text primary key,
  guild_id text not null,
  owner_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists temp_voice_channels_guild_idx on public.temp_voice_channels (guild_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guild_configs_touch_updated_at on public.guild_configs;
create trigger guild_configs_touch_updated_at
before update on public.guild_configs
for each row
execute function public.touch_updated_at();

alter table public.guild_configs enable row level security;
alter table public.mod_cases enable row level security;
alter table public.polls enable row level security;
alter table public.role_panels enable row level security;
alter table public.giveaways enable row level security;
alter table public.level_records enable row level security;
alter table public.birthdays enable row level security;
alter table public.temp_voice_channels enable row level security;
