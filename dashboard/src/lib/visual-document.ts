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

export type VisualStudioDefinition = {
  type: VisualStudioType;
  label: string;
  eyebrow: string;
  description: string;
  format: string;
  accent: string;
  variables: readonly string[];
};

export const visualStudioCatalog: readonly VisualStudioDefinition[] = [
  {
    type: "welcome",
    label: "Welcome",
    eyebrow: "ARRIVAL SCREEN",
    description: "The first frame a new member sees.",
    format: "960 x 360",
    accent: "#d797d8",
    variables: ["{user}", "{mention}", "{server}", "{membercount}", "{inviter}"]
  },
  {
    type: "goodbye",
    label: "Goodbye",
    eyebrow: "EXIT SIGNAL",
    description: "A quiet final transmission for departures.",
    format: "960 x 360",
    accent: "#9b91c7",
    variables: [
      "{user}",
      "{username}",
      "{mention}",
      "{server}",
      "{membercount}",
      "{count}"
    ]
  },
  {
    type: "ticket",
    label: "Ticket",
    eyebrow: "SUPPORT WINDOW",
    description: "The cover image for private support threads.",
    format: "960 x 360",
    accent: "#7fcbd1",
    variables: ["{user}", "{ticket}", "{server}", "{staff}"]
  },
  {
    type: "music",
    label: "Music Player",
    eyebrow: "NOW PLAYING",
    description: "Album-led playback art for voice sessions.",
    format: "960 x 360",
    accent: "#79c8d9",
    variables: ["{track}", "{artist}", "{duration}", "{user}", "{server}"]
  },
  {
    type: "rank",
    label: "Rank",
    eyebrow: "PLAYER FILE",
    description: "Personal XP and position card.",
    format: "960 x 360",
    accent: "#c69ad5",
    variables: ["{user}", "{level}", "{xp}", "{nextxp}", "{rank}"]
  },
  {
    type: "level-up",
    label: "Level Up",
    eyebrow: "NEW LEVEL",
    description: "A compact achievement transmission.",
    format: "960 x 360",
    accent: "#d9b76f",
    variables: ["{user}", "{level}", "{xp}", "{server}"]
  },
  {
    type: "starboard",
    label: "Starboard",
    eyebrow: "SAVED MOMENT",
    description: "A featured-message frame for community highlights.",
    format: "960 x 420",
    accent: "#d4ae69",
    variables: ["{user}", "{message}", "{channel}", "{stars}", "{server}"]
  },
  {
    type: "birthday",
    label: "Birthday",
    eyebrow: "SPECIAL DATE",
    description: "Soft celebration art without party-store energy.",
    format: "960 x 360",
    accent: "#e3a2bd",
    variables: ["{user}", "{mention}", "{age}", "{server}"]
  },
  {
    type: "announcement",
    label: "Announcement",
    eyebrow: "BROADCAST",
    description: "Reusable editorial covers for server news.",
    format: "1200 x 600",
    accent: "#9f98cf",
    variables: ["{title}", "{message}", "{channel}", "{server}"]
  },
  {
    type: "logging",
    label: "Logging",
    eyebrow: "SYSTEM RECORD",
    description: "Readable audit cards for staff channels.",
    format: "960 x 360",
    accent: "#79c6bd",
    variables: ["{user}", "{action}", "{channel}", "{created}"]
  },
  {
    type: "moderation",
    label: "Moderation",
    eyebrow: "STAFF ACTION",
    description: "Clear case cards for warns, mutes, kicks, and bans.",
    format: "960 x 360",
    accent: "#cf889d",
    variables: ["{user}", "{moderator}", "{action}", "{reason}", "{created}"]
  }
] as const;

export function getVisualStudioDefinition(studioType: VisualStudioType) {
  return visualStudioCatalog.find((studio) => studio.type === studioType) ?? visualStudioCatalog[0];
}

const sampleVariables: Record<string, string> = {
  "{user}": "Raven",
  "{username}": "raven38",
  "{mention}": "@Raven",
  "{server}": "blunt38 community",
  "{membercount}": "2,438",
  "{count}": "2,438",
  "{inviter}": "Eclipxse",
  "{created}": "2 minutes ago",
  "{ticket}": "047",
  "{staff}": "Support Team",
  "{track}": "drugs don't work",
  "{artist}": "unknown signal",
  "{duration}": "03:38",
  "{level}": "38",
  "{xp}": "7,420",
  "{nextxp}": "8,000",
  "{rank}": "#04",
  "{stars}": "38",
  "{message}": "some things stay saved.",
  "{channel}": "#lounge",
  "{age}": "18",
  "{title}": "late night transmission",
  "{action}": "WARN",
  "{moderator}": "Raven",
  "{reason}": "read the room"
};

export const variableOptions = [
  "{user}",
  "{username}",
  "{mention}",
  "{server}",
  "{membercount}",
  "{count}",
  "{inviter}",
  "{created}",
  "{ticket}",
  "{staff}",
  "{track}",
  "{artist}",
  "{duration}",
  "{level}",
  "{xp}",
  "{nextxp}",
  "{rank}",
  "{stars}",
  "{message}",
  "{channel}",
  "{age}",
  "{title}",
  "{action}",
  "{moderator}",
  "{reason}"
] as const;

export const fontCategories = [
  "Cute",
  "Attitude",
  "Pixel",
  "Editorial",
  "Clean"
] as const;

export type FontCategory = (typeof fontCategories)[number];

export type StudioFontOption = {
  family: string;
  category: FontCategory;
  preview: string;
  file?: string;
  weight?: string;
};

export const fontOptions: readonly StudioFontOption[] = [
  { family: "Fredoka", category: "Cute", preview: "soft chaos", file: "Fredoka.ttf", weight: "300 700" },
  { family: "Comfortaa", category: "Cute", preview: "pretty things", file: "Comfortaa.ttf", weight: "300 700" },
  { family: "Pacifico", category: "Cute", preview: "kiss & tell", file: "Pacifico.ttf" },
  { family: "Indie Flower", category: "Cute", preview: "dear diary", file: "IndieFlower.ttf" },
  { family: "Lobster", category: "Cute", preview: "too pretty", file: "Lobster.ttf" },
  { family: "Caveat", category: "Cute", preview: "little secret", file: "Caveat.ttf", weight: "400 700" },
  { family: "Lilita One", category: "Cute", preview: "sweet menace", file: "LilitaOne.ttf" },
  { family: "Luckiest Guy", category: "Cute", preview: "main character", file: "LuckiestGuy.ttf" },
  { family: "Cherry Bomb One", category: "Cute", preview: "cute but loud", file: "CherryBombOne.ttf" },
  { family: "Dancing Script", category: "Cute", preview: "love me later", file: "DancingScript.ttf", weight: "400 700" },

  { family: "Bangers", category: "Attitude", preview: "say it louder", file: "Bangers.ttf" },
  { family: "Bebas Neue", category: "Attitude", preview: "no apologies", file: "BebasNeue.ttf" },
  { family: "Permanent Marker", category: "Attitude", preview: "leave a mark", file: "PermanentMarker.ttf" },
  { family: "Rubik Glitch", category: "Attitude", preview: "signal damaged", file: "RubikGlitch.ttf" },
  { family: "Righteous", category: "Attitude", preview: "look at me", file: "Righteous.ttf" },
  { family: "Unbounded", category: "Attitude", preview: "zero limits", file: "Unbounded.ttf", weight: "200 900" },
  { family: "Orbitron", category: "Attitude", preview: "future threat", file: "Orbitron.ttf", weight: "400 900" },
  { family: "Special Elite", category: "Attitude", preview: "classified", file: "SpecialElite.ttf" },
  { family: "Monoton", category: "Attitude", preview: "after midnight", file: "Monoton.ttf" },
  { family: "Black Ops One", category: "Attitude", preview: "final warning", file: "BlackOpsOne.ttf" },

  { family: "Press Start 2P", category: "Pixel", preview: "insert coin", file: "PressStart2P.ttf" },
  { family: "Jersey 10", category: "Pixel", preview: "player one", file: "Jersey10.ttf" },
  { family: "Share Tech Mono", category: "Pixel", preview: "system online", file: "ShareTechMono.ttf" },
  { family: "Silkscreen", category: "Pixel", preview: "save point", file: "Silkscreen.ttf" },
  { family: "VT323", category: "Pixel", preview: "terminal crush", file: "VT323.ttf" },

  { family: "Playfair Display", category: "Editorial", preview: "beautiful damage", file: "PlayfairDisplay.ttf", weight: "400 900" },
  { family: "DM Serif Display", category: "Editorial", preview: "private affair", file: "DMSerifDisplay.ttf" },
  { family: "Abril Fatface", category: "Editorial", preview: "read between us", file: "AbrilFatface.ttf" },
  { family: "Cormorant Garamond", category: "Editorial", preview: "softly dramatic", file: "CormorantGaramond.ttf", weight: "300 700" },
  { family: "Cinzel", category: "Editorial", preview: "pretty dangerous", file: "Cinzel.ttf", weight: "400 900" },

  { family: "Space Grotesk", category: "Clean", preview: "clean signal", file: "SpaceGrotesk.ttf", weight: "300 700" },
  { family: "Syne", category: "Clean", preview: "different on purpose", file: "Syne.ttf", weight: "400 800" },
  { family: "Nunito", category: "Clean", preview: "easy on the eyes", file: "Nunito.ttf", weight: "200 1000" },
  { family: "Inter", category: "Clean", preview: "say it clearly", file: "Inter.ttf", weight: "100 900" },
  { family: "IBM Plex Mono", category: "Clean", preview: "control signal", file: "IBMPlexMono.ttf" }
] as const;

let studioFontsLoaded = false;

export function loadStudioFonts() {
  if (studioFontsLoaded || typeof window === "undefined" || !("FontFace" in window)) return;
  studioFontsLoaded = true;

  for (const font of fontOptions) {
    if (!font.file) continue;
    const face = new FontFace(
      font.family,
      `url("/fonts/${font.file}") format("truetype")`,
      { display: "swap", weight: font.weight ?? "400" }
    );
    window.document.fonts.add(face);
  }
}

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
  const definition = getVisualStudioDefinition(studioType);
  const profile = studioProfiles[studioType];
  const panel = createShapeElement();
  const avatar = createAvatarElement();
  const title = createTextElement(profile.title, 306, 102);
  const subtitle = createTextElement(profile.subtitle, 310, 177);
  const signal = createTextElement(profile.signal, 310, 236);

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
  panel.borderColor = definition.accent;

  const [width, height] = definition.format.split(" x ").map(Number);

  return {
    schemaVersion: 1,
    studioType,
    name: profile.name,
    canvas: { width, height },
    background: {
      type: "gradient",
      value: profile.background,
      overlay: "#30223f",
      overlayOpacity: 0.04,
      blur: 0,
      noise: 0.16
    },
    elements: [panel, avatar, title, subtitle, signal]
  };
}

const studioProfiles: Record<
  VisualStudioType,
  { name: string; title: string; subtitle: string; signal: string; background: string }
> = {
  welcome: {
    name: "soft arrival",
    title: "welcome, {user}.",
    subtitle: "you are member {membercount} of {server}",
    signal: "you found the right frequency.",
    background: "linear-gradient(135deg, #ddd0e5 0%, #b9a6cc 54%, #8fcbd1 100%)"
  },
  goodbye: {
    name: "signal lost",
    title: "{user} left the screen.",
    subtitle: "{server} has {membercount} people still awake",
    signal: "no dramatic exit music.",
    background: "linear-gradient(135deg, #d9cfdf 0%, #a99bbb 58%, #8382a8 100%)"
  },
  ticket: {
    name: "support window",
    title: "ticket #{ticket}",
    subtitle: "{user}, somebody will be here soon.",
    signal: "{staff} // private channel",
    background: "linear-gradient(135deg, #d8d1e4 0%, #98c9cf 58%, #8c83b5 100%)"
  },
  music: {
    name: "now playing",
    title: "{track}",
    subtitle: "{artist} // {duration}",
    signal: "requested by {user}",
    background: "linear-gradient(135deg, #d2cce2 0%, #78c4d0 55%, #b878b8 100%)"
  },
  rank: {
    name: "player file",
    title: "{user} // level {level}",
    subtitle: "{xp} xp // next {nextxp}",
    signal: "server rank {rank}",
    background: "linear-gradient(135deg, #e0d1e5 0%, #c49bce 58%, #8ea7cb 100%)"
  },
  "level-up": {
    name: "new level",
    title: "level {level} reached.",
    subtitle: "{user} keeps going somehow",
    signal: "{xp} xp recorded",
    background: "linear-gradient(135deg, #e2d5e3 0%, #d5b46e 52%, #b18fc4 100%)"
  },
  starboard: {
    name: "saved moment",
    title: "{stars} people kept this.",
    subtitle: "{message}",
    signal: "{user} // {channel}",
    background: "linear-gradient(135deg, #e0d6e5 0%, #d2ad6b 52%, #9c8dc3 100%)"
  },
  birthday: {
    name: "special date",
    title: "today belongs to {user}.",
    subtitle: "happy birthday from {server}",
    signal: "try not to get older too loudly.",
    background: "linear-gradient(135deg, #e6d5e4 0%, #dfa0bd 52%, #8fc8cb 100%)"
  },
  announcement: {
    name: "broadcast frame",
    title: "{title}",
    subtitle: "{message}",
    signal: "{server} // {channel}",
    background: "linear-gradient(135deg, #d9d0e3 0%, #9f96ca 52%, #6fc4c7 100%)"
  },
  logging: {
    name: "system record",
    title: "{action} recorded.",
    subtitle: "{user} // {channel}",
    signal: "{created}",
    background: "linear-gradient(135deg, #d4d8e0 0%, #78bfb8 52%, #9184b3 100%)"
  },
  moderation: {
    name: "staff action",
    title: "{action} // {user}",
    subtitle: "{reason}",
    signal: "{moderator} // {created}",
    background: "linear-gradient(135deg, #ded0df 0%, #cd879d 52%, #8e82b2 100%)"
  }
};

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

export function getVisualPresets(
  studioType: VisualStudioType
): Array<{ name: string; document: VisualDocument }> {
  const base = createDefaultVisualDocument(studioType);
  const definition = getVisualStudioDefinition(studioType);

  return [
    { name: "Lavender OS", document: base },
    {
      name: "Pocket Signal",
      document: sanitizeVisualDocument(
        {
          ...base,
          name: `${definition.label} pocket signal`,
          background: {
            ...base.background,
            value: "linear-gradient(145deg, #e0d3e6 0%, #b9a5cc 55%, #77c4c9 100%)",
            noise: 0.22
          },
          elements: base.elements.map((element) =>
            element.type === "shape"
              ? {
                  ...element,
                  fill: "rgba(245, 237, 247, 0.58)",
                  borderColor: "#4d385f",
                  borderWidth: 3,
                  radius: 3
                }
              : element.type === "text"
                ? { ...element, color: "#342141", shadowBlur: 0 }
                : element
          )
        },
        studioType
      )
    },
    {
      name: "Afterimage",
      document: sanitizeVisualDocument(
        {
          ...base,
          name: `${definition.label} afterimage`,
          background: {
            ...base.background,
            value: "linear-gradient(135deg, #c5b6d2 0%, #d691bd 48%, #73cbd1 100%)",
            overlay: "#51335f",
            overlayOpacity: 0.08,
            noise: 0.3
          },
          elements: base.elements.map((element) => {
            if (element.type === "shape") {
              return {
                ...element,
                fill: "rgba(255, 248, 252, 0.35)",
                borderColor: definition.accent,
                borderWidth: 4,
                radius: 0
              };
            }
            if (element.type === "text") {
              return {
                ...element,
                color: "#2b1738",
                shadowColor: "#7ee0dd",
                shadowBlur: 8
              };
            }
            return element;
          })
        },
        studioType
      )
    }
  ];
}

export const welcomePresets = getVisualPresets("welcome");
