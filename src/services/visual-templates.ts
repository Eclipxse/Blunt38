import { postgresEnabled, query } from "./db.js";

export type VisualStudioType =
  | "welcome"
  | "goodbye"
  | "ticket"
  | "music"
  | "rank"
  | "level-up"
  | "starboard"
  | "birthday"
  | "announcement"
  | "logging"
  | "moderation";
export type VisualElementType = "text" | "avatar" | "shape" | "image";

type VisualElementBase = {
  id: string;
  type: VisualElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  hidden: boolean;
  locked: boolean;
};

export type VisualTextElement = VisualElementBase & {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  shadowColor: string;
  shadowBlur: number;
};

export type VisualAvatarElement = VisualElementBase & {
  type: "avatar";
  shape: "circle" | "rounded" | "square";
  borderColor: string;
  borderWidth: number;
  glowColor: string;
  glowBlur: number;
};

export type VisualShapeElement = VisualElementBase & {
  type: "shape";
  fill: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
};

export type VisualImageElement = VisualElementBase & {
  type: "image";
  src: string;
  fit: "cover" | "contain";
  radius: number;
};

export type VisualElement =
  | VisualTextElement
  | VisualAvatarElement
  | VisualShapeElement
  | VisualImageElement;

export type VisualDocument = {
  schemaVersion: 1;
  studioType: VisualStudioType;
  name: string;
  canvas: { width: number; height: number };
  background: {
    type: "color" | "gradient" | "image";
    value: string;
    overlay: string;
    overlayOpacity: number;
    blur: number;
    noise: number;
  };
  elements: VisualElement[];
};

type VisualTemplateRow = {
  document: unknown;
};

function number(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function string(value: unknown, fallback: string, max = 5000) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function boolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeElement(
  input: unknown,
  index: number,
  canvasWidth: number,
  canvasHeight: number
): VisualElement | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<VisualElement>;
  if (
    raw.type !== "text" &&
    raw.type !== "avatar" &&
    raw.type !== "shape" &&
    raw.type !== "image"
  ) {
    return null;
  }

  const base = {
    id: string(raw.id, `${raw.type}-${index}`, 120),
    type: raw.type,
    name: string(raw.name, raw.type, 80),
    x: number(raw.x, 0, -canvasWidth, canvasWidth * 2),
    y: number(raw.y, 0, -canvasHeight, canvasHeight * 2),
    width: number(raw.width, 120, 16, canvasWidth * 2),
    height: number(raw.height, 80, 16, canvasHeight * 2),
    rotation: number(raw.rotation, 0, -360, 360),
    opacity: number(raw.opacity, 1, 0, 1),
    hidden: boolean(raw.hidden),
    locked: boolean(raw.locked)
  };

  if (raw.type === "text") {
    const text = raw as Partial<VisualTextElement>;
    return {
      ...base,
      type: "text",
      text: string(text.text, "Text", 1000),
      fontFamily: string(text.fontFamily, "Inter", 80),
      fontSize: number(text.fontSize, 36, 8, 240),
      fontWeight: number(text.fontWeight, 600, 100, 900),
      color: string(text.color, "#ffffff", 120),
      align: text.align === "center" || text.align === "right" ? text.align : "left",
      letterSpacing: number(text.letterSpacing, 0, 0, 40),
      lineHeight: number(text.lineHeight, 1.1, 0.7, 2.5),
      shadowColor: string(text.shadowColor, "#000000", 120),
      shadowBlur: number(text.shadowBlur, 0, 0, 80)
    };
  }

  if (raw.type === "avatar") {
    const avatar = raw as Partial<VisualAvatarElement>;
    return {
      ...base,
      type: "avatar",
      shape:
        avatar.shape === "circle" || avatar.shape === "square" ? avatar.shape : "rounded",
      borderColor: string(avatar.borderColor, "#ffffff", 120),
      borderWidth: number(avatar.borderWidth, 0, 0, 24),
      glowColor: string(avatar.glowColor, "#000000", 120),
      glowBlur: number(avatar.glowBlur, 0, 0, 80)
    };
  }

  if (raw.type === "shape") {
    const shape = raw as Partial<VisualShapeElement>;
    return {
      ...base,
      type: "shape",
      fill: string(shape.fill, "rgba(0, 0, 0, 0.45)", 120),
      borderColor: string(shape.borderColor, "#ffffff", 120),
      borderWidth: number(shape.borderWidth, 0, 0, 24),
      radius: number(shape.radius, 0, 0, 200)
    };
  }

  const image = raw as Partial<VisualImageElement>;
  return {
    ...base,
    type: "image",
    src: string(image.src, "", 2_000_000),
    fit: image.fit === "contain" ? "contain" : "cover",
    radius: number(image.radius, 0, 0, 200)
  };
}

function sanitizeVisualDocument(
  input: unknown,
  studioType: VisualStudioType
): VisualDocument | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<VisualDocument>;
  if (raw.schemaVersion !== 1 || raw.studioType !== studioType) return null;

  const rawCanvas =
    raw.canvas && typeof raw.canvas === "object" ? raw.canvas : { width: 960, height: 360 };
  const width = number(rawCanvas.width, 960, 320, 1920);
  const height = number(rawCanvas.height, 360, 180, 1080);
  const rawBackground =
    raw.background && typeof raw.background === "object" ? raw.background : null;
  if (!rawBackground) return null;

  return {
    schemaVersion: 1,
    studioType,
    name: string(raw.name, "Welcome", 80),
    canvas: { width, height },
    background: {
      type:
        rawBackground.type === "color" || rawBackground.type === "image"
          ? rawBackground.type
          : "gradient",
      value: string(rawBackground.value, "#160d21", 2_000_000),
      overlay: string(rawBackground.overlay, "#000000", 120),
      overlayOpacity: number(rawBackground.overlayOpacity, 0, 0, 1),
      blur: number(rawBackground.blur, 0, 0, 40),
      noise: number(rawBackground.noise, 0, 0, 1)
    },
    elements: (Array.isArray(raw.elements) ? raw.elements : [])
      .slice(0, 80)
      .map((element, index) => sanitizeElement(element, index, width, height))
      .filter((element): element is VisualElement => element !== null)
  };
}

export async function getActiveVisualTemplate(
  guildId: string,
  studioType: VisualStudioType
) {
  if (!postgresEnabled()) return null;

  try {
    const result = await query<VisualTemplateRow>(
      `select document
       from public.visual_studio_templates
       where guild_id = $1 and studio_type = $2 and is_active = true
       limit 1`,
      [guildId, studioType]
    );
    return sanitizeVisualDocument(result.rows[0]?.document, studioType);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "42P01") return null;
    throw error;
  }
}
