alter table public.guild_configs
  add column if not exists goodbye_channel_id text,
  add column if not exists goodbye_message text;
