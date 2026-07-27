alter table public.guild_configs
  add column if not exists starboard_channel_id text,
  add column if not exists starboard_threshold integer not null default 3
    check (starboard_threshold >= 1 and starboard_threshold <= 25);

create table if not exists public.starboard_posts (
  guild_id text not null,
  source_message_id text not null,
  source_channel_id text not null,
  starboard_message_id text not null,
  created_at timestamptz not null default now(),
  primary key (guild_id, source_message_id)
);

create index if not exists starboard_posts_guild_created_idx
  on public.starboard_posts (guild_id, created_at desc);

alter table public.starboard_posts enable row level security;
