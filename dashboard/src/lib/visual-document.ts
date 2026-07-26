export const studioTypes = [
  "welcome",
  "goodbye",
  "ticket",
  "music",
  "rank",
  "level-up",
  "starboard",
  "birthday",
  "announcement",
  "logging",
  "moderation"
] as const;

export type VisualStudioType = (typeof studioTypes)[number];
export type VisualElementType = "text" | "avatar" | "shape" | "image";
export type AvatarShape = "circle" | "rounded" | "square";
export type TextAlign = "left" | "center" | "right";

export type VisualBackground = {
  type: "color" | "gradient" | "image";
  value: string;
  overlay: string;
  overlayOpacity: number;
  blur: number;
  noise: number;
};

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
  align: TextAlign;
  letterSpacing: number;
  lineHeight: number;
  shadowColor: string;
  shadowBlur: number;
};

export type VisualAvatarElement = VisualElementBase & {
  type: "avatar";
  shape: AvatarShape;
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
  canvas: {
    width: number;
    height: number;
  };
  background: VisualBackground;
  elements: VisualElement[];
};

export type VisualTemplateEnvelope = {
  id: string | null;
  guildId: string;
  studioType: VisualStudioType;
  name: string;
  document: VisualDocument;
  version: number;
  persisted: boolean;
  updatedAt: string | null;
};

const sampleVariables: Record<string, string> = {
  "{user}": "Raven",
  "{mention}": "@Raven",
  "{server}": "blunt38 community",
  "{membercount}": "2,438",
  "{count}": "2,438",
  "{inviter}": "Eclipxse",
  "{created}": "2 years ago"
};

export const variableOptions = [
  "{user}",
  "{mention}",
  "{server}",
  "{membercount}",
  "{inviter}",
  "{created}"
] as const;

export const fontOptions = [
  "Inter",
  "Space Grotesk",
  "IBM Plex Mono",
  "Arial",
  "Georgia"
] as const;

export function previewText(value: string) {
  return Object.entries(sampleVariables).reduce(
    (result, [variable, sample]) => result.replaceAll(variable, sample),
    value
  );
}

export function createId(prefix: VisualElementType) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function baseElement(
  type: VisualElementType,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number
): VisualElementBase {
  return {
    id: createId(type),
    type,
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    hidden: false,
    locked: false
  };
}

export function createTextElement(text = "New text", x = 320, y = 110): VisualTextElement {
  return {
    ...baseElement("text", "Text", x, y, 520, 72),
    type: "text",
    text,
    fontFamily: "Space Grotesk",
    fontSize: 42,
    fontWeight: 700,
    color: "#f8f4ff",
    align: "left",
    letterSpacing: 0,
    lineHeight: 1.05,
    shadowColor: "#12091f",
    shadowBlur: 16
  };
}

export function createShapeElement(x = 60, y = 60): VisualShapeElement {
  return {
    ...baseElement("shape", "Panel", x, y, 840, 240),
    type: "shape",
    fill: "rgba(19, 11, 31, 0.72)",
    borderColor: "#8e73b8",
    borderWidth: 1,
    radius: 20
  };
}

export function createAvatarElement(x = 98, y = 96): VisualAvatarElement {
  return {
    ...baseElement("avatar", "Member avatar", x, y, 168, 168),
    type: "avatar",
    shape: "rounded",
    borderColor: "#d7c6ef",
    borderWidth: 3,
    glowColor: "#7f5aa8",
    glowBlur: 24
  };
}

export function createImageElement(src: string, x = 80, y = 80): VisualImageElement {
  return {
    ...baseElement("image", "Image", x, y, 240, 160),
    type: "image",
    src,
    fit: "cover",
    radius: 16
  };
}

export function createDefaultVisualDocument(studioType: VisualStudioType = "welcome"): VisualDocument {
  const panel = createShapeElement();
  const avatar = createAvatarElement();
  const title = createTextElement("welcome, {user}.", 306, 102);
  const subtitle = createTextElement("you are member {membercount} of {server}", 310, 177);
  const signal = createTextElement("always watching.", 310, 236);

  title.name = "Headline";
  subtitle.name = "Member line";
  subtitle.fontFamily = "IBM Plex Mono";
  subtitle.fontSize = 23;
  subtitle.fontWeight = 500;
  subtitle.color = "#cbb8df";
  subtitle.height = 42;
  signal.name = "Signature";
  signal.fontFamily = "IBM Plex Mono";
  signal.fontSize = 17;
  signal.fontWeight = 500;
  signal.color = "#987daf";
  signal.height = 32;

  return {
    schemaVersion: 1,
    studioType,
    name: "Midnight arrival",
    canvas: { width: 960, height: 360 },
    background: {
      type: "gradient",
      value: "linear-gradient(135deg, #110a19 0%, #261337 52%, #0e0914 100%)",
      overlay: "#0a0710",
      overlayOpacity: 0.08,
      blur: 0,
      noise: 0.08
    },
    elements: [panel, avatar, title, subtitle, signal]
  };
}

const defaultDocument = createDefaultVisualDocument();

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

function validColor(value: unknown, fallback: string) {
  const next = string(value, fallback, 120);
  return next || fallback;
}

export function isVisualStudioType(value: unknown): value is VisualStudioType {
  return studioTypes.includes(value as VisualStudioType);
}

export function sanitizeVisualDocument(input: unknown, studioType: VisualStudioType): VisualDocument {
  if (!input || typeof input !== "object") return createDefaultVisualDocument(studioType);
  const raw = input as Partial<VisualDocument>;
  const canvas = raw.canvas && typeof raw.canvas === "object" ? raw.canvas : defaultDocument.canvas;
  const background =
    raw.background && typeof raw.background === "object" ? raw.background : defaultDocument.background;
  const width = number(canvas.width, 960, 320, 1920);
  const height = number(canvas.height, 360, 180, 1080);
  const rawElements = Array.isArray(raw.elements) ? raw.elements.slice(0, 80) : [];

  const elements = rawElements.flatMap((candidate, index): VisualElement[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Partial<VisualElement>;
    const type = item.type;
    if (type !== "text" && type !== "avatar" && type !== "shape" && type !== "image") return [];

    const base = {
      id: string(item.id, `${type}-${index}`, 120),
      type,
      name: string(item.name, type, 80),
      x: number(item.x, 0, -width, width * 2),
      y: number(item.y, 0, -height, height * 2),
      width: number(item.width, 120, 16, width * 2),
      height: number(item.height, 80, 16, height * 2),
      rotation: number(item.rotation, 0, -360, 360),
      opacity: number(item.opacity, 1, 0, 1),
      hidden: boolean(item.hidden),
      locked: boolean(item.locked)
    };

    if (type === "text") {
      const text = item as Partial<VisualTextElement>;
      const align = text.align === "center" || text.align === "right" ? text.align : "left";
      return [{
        ...base,
        type,
        text: string(text.text, "Text", 1000),
        fontFamily: string(text.fontFamily, "Inter", 80),
        fontSize: number(text.fontSize, 36, 8, 240),
        fontWeight: number(text.fontWeight, 600, 100, 900),
        color: validColor(text.color, "#ffffff"),
        align,
        letterSpacing: number(text.letterSpacing, 0, 0, 40),
        lineHeight: number(text.lineHeight, 1.1, 0.7, 2.5),
        shadowColor: validColor(text.shadowColor, "#000000"),
        shadowBlur: number(text.shadowBlur, 0, 0, 80)
      }];
    }

    if (type === "avatar") {
      const avatar = item as Partial<VisualAvatarElement>;
      const shape =
        avatar.shape === "circle" || avatar.shape === "square" ? avatar.shape : "rounded";
      return [{
        ...base,
        type,
        shape,
        borderColor: validColor(avatar.borderColor, "#ffffff"),
        borderWidth: number(avatar.borderWidth, 0, 0, 24),
        glowColor: validColor(avatar.glowColor, "#000000"),
        glowBlur: number(avatar.glowBlur, 0, 0, 80)
      }];
    }

    if (type === "shape") {
      const shape = item as Partial<VisualShapeElement>;
      return [{
        ...base,
        type,
        fill: validColor(shape.fill, "rgba(0, 0, 0, 0.45)"),
        borderColor: validColor(shape.borderColor, "#ffffff"),
        borderWidth: number(shape.borderWidth, 0, 0, 24),
        radius: number(shape.radius, 0, 0, 200)
      }];
    }

    const image = item as Partial<VisualImageElement>;
    return [{
      ...base,
      type,
      src: string(image.src, "", 2_000_000),
      fit: image.fit === "contain" ? "contain" : "cover",
      radius: number(image.radius, 0, 0, 200)
    }];
  });

  return {
    schemaVersion: 1,
    studioType,
    name: string(raw.name, "Untitled", 80),
    canvas: { width, height },
    background: {
      type:
        background.type === "color" || background.type === "image" ? background.type : "gradient",
      value: string(background.value, defaultDocument.background.value, 2_000_000),
      overlay: validColor(background.overlay, "#000000"),
      overlayOpacity: number(background.overlayOpacity, 0, 0, 1),
      blur: number(background.blur, 0, 0, 40),
      noise: number(background.noise, 0, 0, 1)
    },
    elements
  };
}

export const welcomePresets: Array<{ name: string; document: VisualDocument }> = [
  { name: "Midnight", document: createDefaultVisualDocument("welcome") },
  {
    name: "Signal",
    document: sanitizeVisualDocument(
      {
        ...createDefaultVisualDocument("welcome"),
        name: "Signal arrival",
        background: {
          type: "gradient",
          value: "linear-gradient(145deg, #07070a 0%, #1d0d2d 58%, #3a1758 100%)",
          overlay: "#000000",
          overlayOpacity: 0.04,
          blur: 0,
          noise: 0.15
        },
        elements: createDefaultVisualDocument("welcome").elements.map((element) =>
          element.type === "shape"
            ? { ...element, fill: "rgba(7, 7, 10, 0.82)", borderColor: "#ba8ee8", radius: 4 }
            : element
        )
      },
      "welcome"
    )
  },
  {
    name: "Monolith",
    document: sanitizeVisualDocument(
      {
        ...createDefaultVisualDocument("welcome"),
        name: "Monolith",
        background: {
          type: "color",
          value: "#0b0a0d",
          overlay: "#000000",
          overlayOpacity: 0,
          blur: 0,
          noise: 0.04
        },
        elements: createDefaultVisualDocument("welcome").elements.map((element) => {
          if (element.type === "shape") {
            return { ...element, fill: "#151119", borderColor: "#4d4058", radius: 0 };
          }
          if (element.type === "text") return { ...element, color: "#e7e0ec" };
          return element;
        })
      },
      "welcome"
    )
  }
];
