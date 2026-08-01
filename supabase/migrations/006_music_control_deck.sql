alter table public.guild_configs
  add column if not exists music_dj_role_id text,
  add column if not exists music_default_volume integer not null default 80
    check (music_default_volume between 1 and 100),
  add column if not exists music_autoplay_enabled boolean not null default false;
