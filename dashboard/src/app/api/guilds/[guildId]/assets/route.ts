import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bucket = "blunt38-assets";
const maxBytes = 8 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

type RouteContext = {
  params: Promise<{ guildId: string }>;
};

type AssetRow = {
  id: string;
  guild_id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  created_at: Date | string;
};

async function authorize(context: RouteContext) {
  const session = await getSession();
  const { guildId } = await context.params;
  if (!session || !session.guildIds.includes(guildId)) return null;
  return { session, guildId };
}

function asset(row: AssetRow) {
  return {
    id: row.id,
    guildId: row.guild_id,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    fileName: row.file_name,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function storageEnv() {
  const env = getEnv();
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  return {
    url: env.supabaseUrl,
    key: env.supabaseServiceRoleKey
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await authorize(context);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await query<AssetRow>(
    `select id, guild_id, storage_path, public_url, file_name, mime_type, byte_size, created_at
     from public.visual_assets
     where guild_id = $1
     order by created_at desc
     limit 80`,
    [auth.guildId]
  );
  return NextResponse.json({ assets: result.rows.map(asset) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authorize(context);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const storage = storageEnv();
  if (!storage) {
    return NextResponse.json(
      { error: "Supabase asset storage is not configured." },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image." }, { status: 400 });
  }

  const extension = extensions[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Use JPEG, PNG, WebP, or GIF." }, { status: 415 });
  }
  if (file.size <= 0 || file.size > maxBytes) {
    return NextResponse.json({ error: "Keep assets under 8 MB." }, { status: 413 });
  }

  const path = `${auth.guildId}/${Date.now()}-${randomUUID()}.${extension}`;
  const upload = await fetch(`${storage.url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${storage.key}`,
      apikey: storage.key,
      "Content-Type": file.type,
      "x-upsert": "false"
    },
    body: Buffer.from(await file.arrayBuffer())
  });

  if (!upload.ok) {
    const details = await upload.text();
    console.error("Supabase asset upload failed:", upload.status, details);
    return NextResponse.json({ error: "Asset upload failed." }, { status: 502 });
  }

  const publicUrl = `${storage.url}/storage/v1/object/public/${bucket}/${path}`;
  const result = await query<AssetRow>(
    `insert into public.visual_assets (
       guild_id, storage_path, public_url, file_name, mime_type, byte_size, created_by
     ) values ($1, $2, $3, $4, $5, $6, $7)
     returning id, guild_id, storage_path, public_url, file_name, mime_type, byte_size, created_at`,
    [auth.guildId, path, publicUrl, file.name.slice(0, 240), file.type, file.size, auth.session.user.id]
  );

  return NextResponse.json({ asset: asset(result.rows[0]) }, { status: 201 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authorize(context);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const storage = storageEnv();
  if (!storage) {
    return NextResponse.json(
      { error: "Supabase asset storage is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Missing asset id." }, { status: 400 });

  const result = await query<AssetRow>(
    `delete from public.visual_assets
     where id = $1 and guild_id = $2
     returning id, guild_id, storage_path, public_url, file_name, mime_type, byte_size, created_at`,
    [body.id, auth.guildId]
  );
  const row = result.rows[0];
  if (!row) return NextResponse.json({ error: "Asset not found." }, { status: 404 });

  await fetch(`${storage.url}/storage/v1/object/${bucket}/${row.storage_path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${storage.key}`,
      apikey: storage.key
    }
  }).catch(() => null);

  return NextResponse.json({ deleted: true });
}
