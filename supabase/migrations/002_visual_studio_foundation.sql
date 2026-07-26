create table if not exists public.visual_studio_templates (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  studio_type text not null check (
    studio_type in (
      'welcome',
      'goodbye',
      'ticket',
      'music',
      'rank',
      'level-up',
      'starboard',
      'birthday',
      'announcement',
      'logging',
      'moderation'
    )
  ),
  name text not null default 'Untitled',
  document jsonb not null,
  is_active boolean not null default true,
  current_version integer not null default 1 check (current_version >= 1),
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists visual_studio_templates_active_idx
  on public.visual_studio_templates (guild_id, studio_type)
  where is_active;

create index if not exists visual_studio_templates_guild_idx
  on public.visual_studio_templates (guild_id, studio_type, updated_at desc);

create table if not exists public.visual_studio_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.visual_studio_templates(id) on delete cascade,
  version integer not null check (version >= 1),
  document jsonb not null,
  created_by text,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create index if not exists visual_studio_versions_template_idx
  on public.visual_studio_versions (template_id, version desc);

drop trigger if exists visual_studio_templates_touch_updated_at on public.visual_studio_templates;
create trigger visual_studio_templates_touch_updated_at
before update on public.visual_studio_templates
for each row
execute function public.touch_updated_at();

alter table public.visual_studio_templates enable row level security;
alter table public.visual_studio_versions enable row level security;
