import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import type { GuildMember, User } from "discord.js";
import type {
  VisualAvatarElement,
  VisualDocument,
  VisualElement,
  VisualImageElement,
  VisualShapeElement,
  VisualTextElement
} from "./visual-templates.js";

type WelcomeCardContext = {
  member: GuildMember;
  inviter?: User | null;
};

type DrawRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function resolveVariables(value: string, context: WelcomeCardContext) {
  const member = context.member;
  const replacements: Record<string, string> = {
    "{user}": member.displayName,
    "{mention}": `@${member.user.username}`,
    "{server}": member.guild.name,
    "{membercount}": member.guild.memberCount.toLocaleString("en-US"),
    "{count}": member.guild.memberCount.toLocaleString("en-US"),
    "{inviter}": context.inviter?.username ?? "someone",
    "{created}": member.user.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  };

  return Object.entries(replacements).reduce(
    (result, [variable, replacement]) => result.replaceAll(variable, replacement),
    value
  );
}

function roundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safe = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + safe, y);
  ctx.lineTo(x + width - safe, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safe);
  ctx.lineTo(x + width, y + height - safe);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safe, y + height);
  ctx.lineTo(x + safe, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safe);
  ctx.lineTo(x, y + safe);
  ctx.quadraticCurveTo(x, y, x + safe, y);
  ctx.closePath();
}

async function loadRemoteImage(source: string) {
  if (source.startsWith("data:")) return loadImage(source);
  const response = await fetch(source, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Image request failed with ${response.status}.`);
  return loadImage(Buffer.from(await response.arrayBuffer()));
}

function drawImageFit(
  ctx: SKRSContext2D,
  image: Image,
  rect: DrawRect,
  fit: "cover" | "contain"
) {
  const imageRatio = image.width / image.height;
  const targetRatio = rect.width / rect.height;
  let width: number;
  let height: number;

  if ((fit === "cover" && imageRatio > targetRatio) || (fit === "contain" && imageRatio < targetRatio)) {
    height = rect.height;
    width = height * imageRatio;
  } else {
    width = rect.width;
    height = width / imageRatio;
  }

  ctx.drawImage(
    image,
    rect.x + (rect.width - width) / 2,
    rect.y + (rect.height - height) / 2,
    width,
    height
  );
}

function gradientFromCss(ctx: SKRSContext2D, value: string, width: number, height: number) {
  const colors = value.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/gi) ?? ["#160d21", "#08060b"];
  const angleMatch = value.match(/linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg/i);
  const angle = (((Number(angleMatch?.[1] ?? 135) - 90) * Math.PI) / 180);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle));
  const dx = (Math.cos(angle) * radius) / 2;
  const dy = (Math.sin(angle) * radius) / 2;
  const gradient = ctx.createLinearGradient(centerX - dx, centerY - dy, centerX + dx, centerY + dy);

  colors.forEach((color, index) => {
    gradient.addColorStop(colors.length === 1 ? 0 : index / (colors.length - 1), color);
  });
  return gradient;
}

async function drawBackground(ctx: SKRSContext2D, document: VisualDocument) {
  const { width, height } = document.canvas;
  const background = document.background;

  if (background.type === "image" && background.value) {
    try {
      const image = await loadRemoteImage(background.value);
      ctx.save();
      if (background.blur > 0) ctx.filter = `blur(${background.blur}px)`;
      drawImageFit(ctx, image, { x: 0, y: 0, width, height }, "cover");
      ctx.restore();
    } catch {
      ctx.fillStyle = "#160d21";
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle =
      background.type === "gradient"
        ? gradientFromCss(ctx, background.value, width, height)
        : background.value;
    ctx.fillRect(0, 0, width, height);
  }

  if (background.overlayOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = background.overlayOpacity;
    ctx.fillStyle = background.overlay;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (background.noise > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(background.noise, 0.4);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    for (let y = 1; y < height; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function fontFamily(value: string) {
  if (value.includes("Mono")) return "DejaVu Sans Mono";
  if (value === "Georgia") return "DejaVu Serif";
  return "DejaVu Sans";
}

function wrapText(
  ctx: SKRSContext2D,
  text: string,
  width: number,
  letterSpacing: number
) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      const measured = ctx.measureText(candidate).width + Math.max(0, candidate.length - 1) * letterSpacing;
      if (measured <= width) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawSpacedText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: VisualTextElement["align"]
) {
  if (spacing <= 0) {
    ctx.fillText(text, x, y);
    return;
  }

  const widths = [...text].map((character) => ctx.measureText(character).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, text.length - 1) * spacing;
  let cursor = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  ctx.textAlign = "left";

  [...text].forEach((character, index) => {
    ctx.fillText(character, cursor, y);
    cursor += widths[index] + spacing;
  });
}

function drawText(
  ctx: SKRSContext2D,
  element: VisualTextElement,
  context: WelcomeCardContext
) {
  const text = resolveVariables(element.text, context);
  ctx.font = `${element.fontWeight} ${element.fontSize}px "${fontFamily(element.fontFamily)}"`;
  ctx.fillStyle = element.color;
  ctx.textBaseline = "top";
  ctx.textAlign = element.align;
  ctx.shadowColor = element.shadowColor;
  ctx.shadowBlur = element.shadowBlur;
  const x =
    element.align === "center"
      ? element.width / 2
      : element.align === "right"
        ? element.width
        : 0;
  const lineHeight = element.fontSize * element.lineHeight;
  const lines = wrapText(ctx, text, element.width, element.letterSpacing);

  lines.forEach((line, index) => {
    const y = index * lineHeight;
    if (y + lineHeight > element.height + lineHeight * 0.25) return;
    drawSpacedText(ctx, line, x, y, element.letterSpacing, element.align);
  });
}

function drawShape(ctx: SKRSContext2D, element: VisualShapeElement) {
  roundedRect(ctx, 0, 0, element.width, element.height, element.radius);
  ctx.fillStyle = element.fill;
  ctx.fill();
  if (element.borderWidth > 0) {
    ctx.lineWidth = element.borderWidth;
    ctx.strokeStyle = element.borderColor;
    ctx.stroke();
  }
}

async function drawAvatar(
  ctx: SKRSContext2D,
  element: VisualAvatarElement,
  avatar: Image
) {
  const radius =
    element.shape === "circle"
      ? Math.min(element.width, element.height) / 2
      : element.shape === "rounded"
        ? Math.min(element.width, element.height) * 0.22
        : 0;

  ctx.save();
  ctx.shadowColor = element.glowColor;
  ctx.shadowBlur = element.glowBlur;
  roundedRect(ctx, 0, 0, element.width, element.height, radius);
  ctx.fillStyle = element.glowColor;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, 0, 0, element.width, element.height, radius);
  ctx.clip();
  drawImageFit(ctx, avatar, { x: 0, y: 0, width: element.width, height: element.height }, "cover");
  ctx.restore();

  if (element.borderWidth > 0) {
    roundedRect(ctx, 0, 0, element.width, element.height, radius);
    ctx.lineWidth = element.borderWidth;
    ctx.strokeStyle = element.borderColor;
    ctx.stroke();
  }
}

async function drawImageElement(ctx: SKRSContext2D, element: VisualImageElement) {
  if (!element.src) return;
  try {
    const image = await loadRemoteImage(element.src);
    ctx.save();
    roundedRect(ctx, 0, 0, element.width, element.height, element.radius);
    ctx.clip();
    drawImageFit(
      ctx,
      image,
      { x: 0, y: 0, width: element.width, height: element.height },
      element.fit
    );
    ctx.restore();
  } catch {
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(0, 0, element.width, element.height);
  }
}

async function drawElement(
  ctx: SKRSContext2D,
  element: VisualElement,
  avatar: Image,
  context: WelcomeCardContext
) {
  if (element.hidden || element.opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = element.opacity;
  ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
  ctx.rotate((element.rotation * Math.PI) / 180);
  ctx.translate(-element.width / 2, -element.height / 2);

  if (element.type === "text") drawText(ctx, element, context);
  if (element.type === "shape") drawShape(ctx, element);
  if (element.type === "avatar") await drawAvatar(ctx, element, avatar);
  if (element.type === "image") await drawImageElement(ctx, element);
  ctx.restore();
}

export async function renderWelcomeCard(
  document: VisualDocument,
  context: WelcomeCardContext
) {
  const canvas = createCanvas(document.canvas.width, document.canvas.height);
  const ctx = canvas.getContext("2d");
  await drawBackground(ctx, document);
  const avatar = await loadRemoteImage(
    context.member.displayAvatarURL({ extension: "png", size: 512, forceStatic: true })
  );

  for (const element of document.elements) {
    await drawElement(ctx, element, avatar, context);
  }

  return canvas.toBuffer("image/png");
}
