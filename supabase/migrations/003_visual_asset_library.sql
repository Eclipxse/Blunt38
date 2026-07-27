insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blunt38-assets',
  'blunt38-assets',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.visual_assets (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  storage_path text not null unique,
  public_url text not null,
  file_name text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 8388608),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists visual_assets_guild_idx
  on public.visual_assets (guild_id, created_at desc);

alter table public.visual_assets enable row level security;
