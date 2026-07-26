import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { isVisualStudioType } from "@/lib/visual-document";
import {
  getVisualTemplate,
  listVisualTemplateVersions,
  saveVisualTemplate
} from "@/lib/visual-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ guildId: string; studio: string }>;
};

async function authorize(context: RouteContext) {
  const session = await getSession();
  const { guildId, studio } = await context.params;

  if (!session || !session.guildIds.includes(guildId)) {
    return {
      session: null,
      guildId,
      studio,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    };
  }

  if (!isVisualStudioType(studio)) {
    return {
      session,
      guildId,
      studio,
      error: NextResponse.json({ error: "Unknown studio" }, { status: 404 })
    };
  }

  return { session, guildId, studio, error: null };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;
  if (!auth.session || !isVisualStudioType(auth.studio)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const template = await getVisualTemplate(auth.guildId, auth.studio);
  const versions = template.id ? await listVisualTemplateVersions(template.id) : [];
  return NextResponse.json({ template, versions });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;
  if (!auth.session || !isVisualStudioType(auth.studio)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { document?: unknown };
  const template = await saveVisualTemplate(
    auth.guildId,
    auth.studio,
    body.document,
    auth.session.user.id
  );
  const versions = template.id ? await listVisualTemplateVersions(template.id) : [];
  return NextResponse.json({ template, versions });
}
