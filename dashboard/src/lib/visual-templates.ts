import type { PoolClient } from "pg";

import { getPool, query } from "@/lib/db";
import {
  createDefaultVisualDocument,
  sanitizeVisualDocument,
  type VisualDocument,
  type VisualStudioType,
  type VisualTemplateEnvelope
} from "@/lib/visual-document";

type TemplateRow = {
  id: string;
  guild_id: string;
  studio_type: VisualStudioType;
  name: string;
  document: unknown;
  current_version: number;
  updated_at: Date | string;
};

function envelope(
  row: TemplateRow | undefined,
  guildId: string,
  studioType: VisualStudioType
): VisualTemplateEnvelope {
  if (!row) {
    const document = createDefaultVisualDocument(studioType);
    return {
      id: null,
      guildId,
      studioType,
      name: document.name,
      document,
      version: 0,
      persisted: false,
      updatedAt: null
    };
  }

  return {
    id: row.id,
    guildId: row.guild_id,
    studioType: row.studio_type,
    name: row.name,
    document: sanitizeVisualDocument(row.document, studioType),
    version: row.current_version,
    persisted: true,
    updatedAt:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

async function selectActive(
  guildId: string,
  studioType: VisualStudioType,
  client?: PoolClient
) {
  const runner = client ?? getPool();
  const result = await runner.query<TemplateRow>(
    `select id, guild_id, studio_type, name, document, current_version, updated_at
     from public.visual_studio_templates
     where guild_id = $1 and studio_type = $2 and is_active = true
     limit 1`,
    [guildId, studioType]
  );
  return result.rows[0];
}

export async function getVisualTemplate(
  guildId: string,
  studioType: VisualStudioType
) {
  const row = await selectActive(guildId, studioType);
  return envelope(row, guildId, studioType);
}

export async function saveVisualTemplate(
  guildId: string,
  studioType: VisualStudioType,
  input: unknown,
  actorId: string
) {
  const document = sanitizeVisualDocument(input, studioType);
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const existing = await selectActive(guildId, studioType, client);
    let saved: TemplateRow;

    if (existing) {
      const nextVersion = existing.current_version + 1;
      const result = await client.query<TemplateRow>(
        `update public.visual_studio_templates
         set name = $1, document = $2::jsonb, current_version = $3, updated_by = $4
         where id = $5
         returning id, guild_id, studio_type, name, document, current_version, updated_at`,
        [document.name, JSON.stringify(document), nextVersion, actorId, existing.id]
      );
      saved = result.rows[0];
    } else {
      const result = await client.query<TemplateRow>(
        `insert into public.visual_studio_templates (
           guild_id, studio_type, name, document, created_by, updated_by
         ) values ($1, $2, $3, $4::jsonb, $5, $5)
         returning id, guild_id, studio_type, name, document, current_version, updated_at`,
        [guildId, studioType, document.name, JSON.stringify(document), actorId]
      );
      saved = result.rows[0];
    }

    await client.query(
      `insert into public.visual_studio_versions (
         template_id, version, document, created_by
       ) values ($1, $2, $3::jsonb, $4)`,
      [saved.id, saved.current_version, JSON.stringify(document), actorId]
    );
    await client.query("commit");
    return envelope(saved, guildId, studioType);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listVisualTemplateVersions(templateId: string) {
  const result = await query<{
    version: number;
    created_by: string | null;
    created_at: Date | string;
  }>(
    `select version, created_by, created_at
     from public.visual_studio_versions
     where template_id = $1
     order by version desc
     limit 30`,
    [templateId]
  );

  return result.rows.map((row) => ({
    version: row.version,
    createdBy: row.created_by,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  }));
}
