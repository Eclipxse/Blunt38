"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WatcherMode =
  | "loading"
  | "login"
  | "dashboard"
  | "automations"
  | "music"
  | "studio"
  | "studio-focus"
  | "empty";

export type WatcherAction =
  | "context"
  | "login"
  | "connect-hover"
  | "return"
  | "idle"
  | "navigate"
  | "guild-change"
  | "discard"
  | "save-success"
  | "save-error"
  | "studio-open"
  | "studio-exit"
  | "studio-undo"
  | "studio-save"
  | "hover-face"
  | "hover-leave"
  | "stare"
  | "poke"
  | "poke-again"
  | "chase";

type WatcherExpression =
  | "idle"
  | "curious"
  | "pleased"
  | "doubt"
  | "startled"
  | "annoyed"
  | "glitch"
  | "sleeping";

type WatcherSignalDetail = {
  action: WatcherAction;
  mode?: WatcherMode;
  subject?: string;
  silent?: boolean;
};

type Reaction = {
  expression: WatcherExpression;
  lines: string[];
  urgent?: boolean;
  duration?: number;
};

type MotionValue = {
  value: number;
  velocity: number;
};

const SIGNAL_NAME = "blunt38:watcher";
const INK = "#34213f";
const SKIN = "#cdb9ca";
const LIGHT = "#eadce5";

const reactions: Record<
  Exclude<WatcherAction, "context" | "navigate">,
  Reaction
> = {
  login: {
    expression: "curious",
    lines: ["you took long enough.", "oh. it's you again."]
  },
  "connect-hover": {
    expression: "curious",
    lines: ["go on. i'll wait.", "the button won't bite."]
  },
  return: {
    expression: "pleased",
    lines: ["i kept your place.", "oh. you're back."],
    urgent: true
  },
  idle: {
    expression: "sleeping",
    lines: ["wake me when something happens.", "you went quiet."],
    duration: 0
  },
  "guild-change": {
    expression: "curious",
    lines: ["new room. same habits.", "who lives here?"]
  },
  discard: {
    expression: "doubt",
    lines: ["pretend that never happened.", "back to the beginning."]
  },
  "save-success": {
    expression: "pleased",
    lines: ["acceptable.", "saved. act natural.", "fine. i'll remember it."],
    urgent: true
  },
  "save-error": {
    expression: "glitch",
    lines: ["you broke it.", "don't look at me.", "that was embarrassing."],
    urgent: true,
    duration: 2200
  },
  "studio-open": {
    expression: "curious",
    lines: ["make it worth staring at.", "try not to overthink it."]
  },
  "studio-exit": {
    expression: "idle",
    lines: ["leave it there.", "done staring?"]
  },
  "studio-undo": {
    expression: "doubt",
    lines: ["you liked it two versions ago.", "again?"]
  },
  "studio-save": {
    expression: "pleased",
    lines: ["this one can stay.", "keep that version."],
    urgent: true
  },
  "hover-face": {
    expression: "annoyed",
    lines: [
      "ew. move your cursor, perv.",
      "you're standing suspiciously close.",
      "my face is not a button."
    ],
    urgent: true,
    duration: 5200
  },
  "hover-leave": {
    expression: "pleased",
    lines: ["better.", "good choice.", "that's what i thought."],
    urgent: true
  },
  stare: {
    expression: "doubt",
    lines: ["do you need something or...", "the staring is getting weird."],
    urgent: true,
    duration: 5600
  },
  poke: {
    expression: "startled",
    lines: ["did you just poke me?", "personal space?", "rude."],
    urgent: true,
    duration: 2600
  },
  "poke-again": {
    expression: "annoyed",
    lines: ["okay. hands off.", "once was already too many.", "seriously?"],
    urgent: true,
    duration: 6200
  },
  chase: {
    expression: "curious",
    lines: ["pick a direction.", "your cursor has issues."]
  }
};

const navigationReactions: Record<string, Reaction> = {
  home: {
    expression: "idle",
    lines: ["everything is where you left it."]
  },
  automations: {
    expression: "curious",
    lines: ["make it happen while no one's looking."]
  },
  music: {
    expression: "pleased",
    lines: ["don't skip the good part.", "too loud. keep it."]
  },
  studio: {
    expression: "curious",
    lines: ["make it worth staring at."]
  },
  ai: {
    expression: "doubt",
    lines: ["teach it something worth repeating."]
  },
  welcome: {
    expression: "idle",
    lines: ["first impressions stay longer."]
  },
  roles: {
    expression: "curious",
    lines: ["everyone wants a label."]
  },
  tickets: {
    expression: "idle",
    lines: ["someone always needs something."]
  },
  levels: {
    expression: "pleased",
    lines: ["numbers make people behave strangely."]
  },
  voice: {
    expression: "curious",
    lines: ["listen before you speak."]
  },
  logs: {
    expression: "doubt",
    lines: ["nothing really disappears."]
  }
};

export function signal38(
  action: WatcherAction,
  detail: Omit<WatcherSignalDetail, "action"> = {}
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WatcherSignalDetail>(SIGNAL_NAME, {
      detail: { action, ...detail }
    })
  );
}

function chooseLine(lines: string[], previous: string) {
  if (lines.length === 1) return lines[0];
  const available = lines.filter((line) => line !== previous);
  return available[Math.floor(Math.random() * available.length)] ?? lines[0];
}

function ellipseMask(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  feather = 0.035
) {
  const distance = Math.hypot(
    (x - centerX) / radiusX,
    (y - centerY) / radiusY
  );
  return Math.max(0, Math.min(1, (1 + feather - distance) / feather));
}

function pointInPolygon(
  x: number,
  y: number,
  points: Array<[number, number]>
) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const [currentX, currentY] = points[index];
    const [previousX, previousY] = points[previous];
    const intersects =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) /
          (previousY - currentY || 1) +
          currentX;
    if (intersects) inside = !inside;
  }
  return inside;
}

function createPixelPortrait(image: HTMLImageElement) {
  const width = 720;
  const height = 760;
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sourceContext = source.getContext("2d", {
    willReadFrequently: true
  });
  if (!sourceContext) return source;

  sourceContext.imageSmoothingEnabled = true;
  sourceContext.drawImage(
    image,
    image.naturalWidth * 0.57,
    image.naturalHeight * 0.055,
    image.naturalWidth * 0.39,
    image.naturalHeight * 0.88,
    0,
    0,
    width,
    height
  );

  const sourceImage = sourceContext.getImageData(0, 0, width, height);
  const output = sourceContext.createImageData(width, height);
  const torso = [
    [0.31, 0.59],
    [0.18, 0.7],
    [0.075, 0.85],
    [0.025, 1],
    [0.76, 1],
    [0.72, 0.84],
    [0.65, 0.69],
    [0.61, 0.59],
    [0.51, 0.67],
    [0.38, 0.66]
  ] as Array<[number, number]>;
  const darkPixels = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  let largestComponent: number[] = [];

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    const x = (pixel % width) / width;
    const y = Math.floor(pixel / width) / height;
    const red = sourceImage.data[offset];
    const green = sourceImage.data[offset + 1];
    const blue = sourceImage.data[offset + 2];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const headArea = ellipseMask(x, y, 0.5, 0.345, 0.49, 0.36, 0.045);
    if (luminance < 166 && headArea > 0.08) darkPixels[pixel] = 1;
  }

  const queue = new Int32Array(width * height);
  for (let start = 0; start < darkPixels.length; start += 1) {
    if (!darkPixels[start] || visited[start]) continue;
    const component: number[] = [];
    let read = 0;
    let write = 0;
    queue[write++] = start;
    visited[start] = 1;

    while (read < write) {
      const current = queue[read++];
      component.push(current);
      const column = current % width;
      const row = Math.floor(current / width);
      const neighbours = [
        column > 0 ? current - 1 : -1,
        column + 1 < width ? current + 1 : -1,
        row > 0 ? current - width : -1,
        row + 1 < height ? current + width : -1
      ];

      for (const neighbour of neighbours) {
        if (
          neighbour >= 0 &&
          darkPixels[neighbour] &&
          !visited[neighbour]
        ) {
          visited[neighbour] = 1;
          queue[write++] = neighbour;
        }
      }
    }

    if (component.length > largestComponent.length) {
      largestComponent = component;
    }
  }

  const connectedHair = new Uint8Array(width * height);
  for (const pixel of largestComponent) connectedHair[pixel] = 1;

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    const x = (pixel % width) / width;
    const y = Math.floor(pixel / width) / height;
    const red = sourceImage.data[offset];
    const green = sourceImage.data[offset + 1];
    const blue = sourceImage.data[offset + 2];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const ink = Math.max(0, Math.min(1, (174 - luminance) / 62));
    const face = ellipseMask(x, y, 0.5, 0.405, 0.285, 0.245, 0.045);
    const neck = pointInPolygon(x, y, [
      [0.38, 0.56],
      [0.63, 0.56],
      [0.69, 0.73],
      [0.31, 0.73]
    ])
      ? 1
      : 0;
    const body = pointInPolygon(x, y, torso) ? 1 : 0;
    const silhouette = Math.max(
      connectedHair[pixel] ? Math.max(0.55, ink) : 0,
      face,
      neck,
      body
    );

    output.data[offset] = red;
    output.data[offset + 1] = green;
    output.data[offset + 2] = blue;
    output.data[offset + 3] = Math.round(
      255 * Math.max(0, Math.min(1, silhouette))
    );
  }

  sourceContext.clearRect(0, 0, width, height);
  sourceContext.putImageData(output, 0, 0);
  return source;
}

function spring(
  motion: MotionValue,
  target: number,
  delta: number,
  stiffness = 0.085,
  damping = 0.77
) {
  const frameScale = Math.min(2, delta / 16.67);
  motion.velocity += (target - motion.value) * stiffness * frameScale;
  motion.velocity *= Math.pow(damping, frameScale);
  motion.value += motion.velocity * frameScale;
}

export function Watcher38() {
  const hostRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const expressionRef = useRef<WatcherExpression>("idle");
  const modeRef = useRef<WatcherMode>("loading");
  const speakingRef = useRef(false);
  const lastSpokenAt = useRef(0);
  const previousLine = useRef("");
  const expressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mode, setMode] = useState<WatcherMode>("loading");
  const [expression, setExpression] = useState<WatcherExpression>("idle");
  const [line, setLine] = useState("");
  const [typedLine, setTypedLine] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  const react = useCallback((detail: WatcherSignalDetail) => {
    if (detail.mode) setMode(detail.mode);
    if (detail.silent || detail.action === "context") return;

    const reaction =
      detail.action === "navigate"
        ? navigationReactions[detail.subject ?? "home"]
        : reactions[detail.action];
    if (!reaction) return;

    const now = Date.now();
    if (!reaction.urgent && now - lastSpokenAt.current < 3800) return;
    const nextLine = chooseLine(reaction.lines, previousLine.current);

    previousLine.current = nextLine;
    lastSpokenAt.current = now;
    setExpression(reaction.expression);
    setLine(nextLine);

    if (expressionTimer.current) clearTimeout(expressionTimer.current);
    if (reaction.duration !== 0) {
      expressionTimer.current = setTimeout(() => {
        setExpression("idle");
      }, reaction.duration ?? 4300);
    }
  }, []);

  useEffect(() => {
    const listener = (event: Event) => {
      react((event as CustomEvent<WatcherSignalDetail>).detail);
    };
    window.addEventListener(SIGNAL_NAME, listener);

    return () => {
      window.removeEventListener(SIGNAL_NAME, listener);
      if (expressionTimer.current) clearTimeout(expressionTimer.current);
    };
  }, [react]);

  useEffect(() => {
    if (!line) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setTypedLine("");
    setSpeaking(true);

    if (reducedMotion) {
      setTypedLine(line);
      setSpeaking(false);
      return;
    }

    let index = 0;
    let timer = 0;
    const type = () => {
      index += 1;
      setTypedLine(line.slice(0, index));
      if (index < line.length) {
        const character = line[index - 1];
        timer = window.setTimeout(type, /[.,?]/.test(character) ? 100 : 30);
      } else {
        timer = window.setTimeout(() => setSpeaking(false), 720);
      }
    };

    timer = window.setTimeout(type, 110);
    return () => window.clearTimeout(timer);
  }, [line]);

  useEffect(() => {
    let idleTimer = 0;
    let hiddenAt = 0;

    const resetIdle = () => {
      if (expressionRef.current === "sleeping") signal38("return");
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => signal38("idle"), 52_000);
    };

    const visibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else {
        if (hiddenAt && Date.now() - hiddenAt > 12_000) signal38("return");
        hiddenAt = 0;
        resetIdle();
      }
    };

    window.addEventListener("pointerdown", resetIdle, { passive: true });
    window.addEventListener("keydown", resetIdle);
    window.addEventListener("scroll", resetIdle, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    resetIdle();

    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener("pointerdown", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("scroll", resetIdle);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();
    image.decoding = "async";
    let portrait = document.createElement("canvas");
    let width = 1;
    let height = 1;
    let frame = 0;
    let lastFrame = performance.now();
    let nextBlinkAt = lastFrame + 2200 + Math.random() * 2600;
    let blinkStart = -1;
    let blinkDuration = 180;
    let secondBlinkAt = -1;
    let hoverTimer = 0;
    let stareTimer = 0;
    let leaveTimer = 0;
    let hoveringFace = false;
    let hoverReactionAt = 0;
    let lastChaseAt = 0;
    let lastPointerAt = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let pokeCount = 0;
    let pokeWindowStarted = 0;
    let sleepingWakeAt = 0;
    const pointerTarget = { x: 0, y: 0 };
    const lookX = { value: 0, velocity: 0 };
    const lookY = { value: 0, velocity: 0 };
    const headX = { value: 0, velocity: 0 };
    const headY = { value: 0, velocity: 0 };
    const headTilt = { value: 0, velocity: 0 };
    const hoverLift = { value: 0, velocity: 0 };
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      if (!image.naturalWidth) return;
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.imageSmoothingEnabled = false;
    };

    const withHeadTransform = (
      expressionNow: WatcherExpression,
      callback: () => void
    ) => {
      const pivotX = width * 0.5;
      const pivotY = height * 0.64;
      const startledScale = expressionNow === "startled" ? 1.012 : 1;
      context.save();
      context.translate(
        pivotX + headX.value,
        pivotY + headY.value - hoverLift.value
      );
      context.rotate(headTilt.value);
      context.scale(startledScale, startledScale);
      context.translate(-pivotX, -pivotY);
      callback();
      context.restore();
    };

    const drawEye = (
      centerX: number,
      centerY: number,
      openness: number,
      expressionNow: WatcherExpression
    ) => {
      const eyeWidth = width * 0.065;
      const eyeHeight = height * 0.056;
      const eyeLookX =
        lookX.value * width * (expressionNow === "doubt" ? -0.006 : 0.009);
      const eyeLookY = lookY.value * height * 0.006;
      const narrowed =
        expressionNow === "annoyed" || expressionNow === "doubt" ? 0.55 : 1;
      const open = Math.max(0.035, openness * narrowed);

      if (open < 0.12) {
        context.fillStyle = SKIN;
        context.beginPath();
        context.ellipse(
          centerX,
          centerY,
          eyeWidth * 0.78,
          eyeHeight * 0.72,
          0,
          0,
          Math.PI * 2
        );
        context.fill();
        context.strokeStyle = INK;
        context.lineWidth = Math.max(1.5, width * 0.004);
        context.beginPath();
        context.moveTo(centerX - eyeWidth * 0.48, centerY);
        context.quadraticCurveTo(
          centerX,
          centerY + eyeHeight * 0.15,
          centerX + eyeWidth * 0.48,
          centerY
        );
        context.stroke();
        return;
      }

      if (open < 0.94) {
        context.fillStyle = SKIN;
        context.beginPath();
        context.ellipse(
          centerX,
          centerY,
          eyeWidth * 0.78,
          eyeHeight * 0.72,
          0,
          0,
          Math.PI * 2
        );
        context.fill();

        context.fillStyle = INK;
        context.beginPath();
        context.ellipse(
          centerX,
          centerY,
          eyeWidth * 0.48,
          eyeHeight * 0.48 * open,
          0,
          0,
          Math.PI * 2
        );
        context.fill();
      } else if (narrowed < 0.8) {
        context.fillStyle = SKIN;
        context.fillRect(
          centerX - eyeWidth * 0.67,
          centerY - eyeHeight * 0.72,
          eyeWidth * 1.34,
          eyeHeight * (1 - narrowed) * 0.68
        );
      }

      context.fillStyle = "rgba(118, 86, 129, 0.72)";
      context.beginPath();
      context.ellipse(
        centerX + eyeLookX,
        centerY + eyeLookY,
        eyeWidth * 0.16,
        eyeHeight * 0.2 * open,
        0,
        0,
        Math.PI * 2
      );
      context.fill();

      context.fillStyle = LIGHT;
      context.beginPath();
      context.arc(
        centerX + eyeLookX - eyeWidth * 0.09,
        centerY + eyeLookY - eyeHeight * 0.11,
        Math.max(1.1, width * 0.0048),
        0,
        Math.PI * 2
      );
      context.fill();

      context.strokeStyle = INK;
      context.lineWidth = Math.max(1.4, width * 0.0038);
      context.beginPath();
      const browY = centerY - eyeHeight * 0.75;
      const browTilt =
        expressionNow === "annoyed"
          ? centerX < width * 0.5
            ? 0.14
            : -0.14
          : expressionNow === "curious"
            ? centerX < width * 0.5
              ? -0.1
              : 0.04
            : 0;
      context.moveTo(
        centerX - eyeWidth * 0.42,
        browY - eyeHeight * browTilt
      );
      context.lineTo(
        centerX + eyeWidth * 0.42,
        browY + eyeHeight * browTilt
      );
      context.stroke();
    };

    const drawMouth = (time: number, expressionNow: WatcherExpression) => {
      const centerX = width * 0.485;
      const centerY = height * 0.545;
      const mouthWidth = width * 0.057;
      context.fillStyle = SKIN;
      context.beginPath();
      context.ellipse(
        centerX,
        centerY,
        mouthWidth * 0.9,
        height * 0.025,
        0,
        0,
        Math.PI * 2
      );
      context.fill();

      context.strokeStyle = INK;
      context.fillStyle = INK;
      context.lineWidth = Math.max(1.3, width * 0.0036);
      context.lineCap = "round";
      const talking =
        speakingRef.current &&
        Math.sin(time / 95) > -0.05 &&
        expressionNow !== "sleeping";

      if (talking || expressionNow === "startled") {
        context.beginPath();
        context.ellipse(
          centerX,
          centerY,
          mouthWidth * (expressionNow === "startled" ? 0.38 : 0.48),
          height * (expressionNow === "startled" ? 0.014 : 0.01),
          0,
          0,
          Math.PI * 2
        );
        context.fill();
        return;
      }

      context.beginPath();
      if (expressionNow === "pleased") {
        context.moveTo(centerX - mouthWidth * 0.52, centerY - 1);
        context.quadraticCurveTo(
          centerX,
          centerY + height * 0.018,
          centerX + mouthWidth * 0.52,
          centerY - 1
        );
      } else if (
        expressionNow === "annoyed" ||
        expressionNow === "doubt"
      ) {
        context.moveTo(centerX - mouthWidth * 0.45, centerY + 1);
        context.lineTo(centerX + mouthWidth * 0.45, centerY - 1);
      } else if (expressionNow === "sleeping") {
        context.moveTo(centerX - mouthWidth * 0.38, centerY);
        context.quadraticCurveTo(
          centerX,
          centerY - height * 0.006,
          centerX + mouthWidth * 0.38,
          centerY
        );
      } else {
        context.moveTo(centerX - mouthWidth * 0.34, centerY);
        context.quadraticCurveTo(
          centerX,
          centerY + height * 0.005,
          centerX + mouthWidth * 0.34,
          centerY
        );
      }
      context.stroke();
    };

    const draw = (time: number, delta: number) => {
      if (!portrait.width || !width || !height) return;
      const expressionNow = expressionRef.current;
      const lookingAway =
        expressionNow === "doubt" && hoveringFace ? -1 : 1;
      const sleeping = expressionNow === "sleeping";
      const targetLookX = sleeping ? 0 : pointerTarget.x * lookingAway;
      const targetLookY = sleeping ? 0.65 : pointerTarget.y;
      const tiltBias =
        expressionNow === "pleased"
          ? -0.012
          : expressionNow === "annoyed"
            ? 0.01
            : expressionNow === "curious"
              ? -0.006
              : 0;

      spring(lookX, targetLookX, delta, 0.1, 0.73);
      spring(lookY, targetLookY, delta, 0.1, 0.73);
      spring(headX, lookX.value * width * 0.008, delta, 0.065, 0.8);
      spring(
        headY,
        lookY.value * height * 0.004 + (sleeping ? height * 0.014 : 0),
        delta,
        0.065,
        0.8
      );
      spring(
        headTilt,
        lookX.value * 0.014 + tiltBias,
        delta,
        0.055,
        0.82
      );
      spring(
        hoverLift,
        hoveringFace ? height * 0.008 : 0,
        delta,
        0.07,
        0.78
      );

      let blinkAmount = 0;
      if (blinkStart >= 0) {
        const progress = (time - blinkStart) / blinkDuration;
        if (progress >= 1) {
          blinkStart = -1;
          nextBlinkAt = time + 3000 + Math.random() * 5200;
        } else if (progress >= 0) {
          blinkAmount = Math.sin(progress * Math.PI);
        }
      } else if (secondBlinkAt > 0 && time >= secondBlinkAt) {
        blinkStart = time;
        secondBlinkAt = -1;
      } else if (time >= nextBlinkAt && !sleeping) {
        blinkStart = time;
        blinkDuration = 165 + Math.random() * 45;
        if (Math.random() < 0.2) secondBlinkAt = time + blinkDuration + 105;
      }

      const eyeOpenness = sleeping ? 0 : 1 - blinkAmount;
      const breathing = reducedMotion
        ? 0
        : Math.sin(time / 1550) * height * 0.004;
      const glitch =
        expressionNow === "glitch"
          ? (Math.random() - 0.5) * width * 0.012
          : 0;

      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(glitch, breathing);

      context.save();
      context.beginPath();
      context.rect(0, height * 0.54, width, height * 0.5);
      context.clip();
      context.translate(0, Math.abs(breathing) * 0.35);
      context.drawImage(portrait, 0, 0, width, height);
      context.restore();

      withHeadTransform(expressionNow, () => {
        context.save();
        context.beginPath();
        context.rect(0, 0, width, height * 0.73);
        context.clip();
        context.drawImage(portrait, 0, 0, width, height);
        context.restore();

        drawEye(width * 0.345, height * 0.405, eyeOpenness, expressionNow);
        drawEye(width * 0.602, height * 0.405, eyeOpenness, expressionNow);
        drawMouth(time, expressionNow);

        if (
          expressionNow === "pleased" ||
          expressionNow === "startled" ||
          hoveringFace
        ) {
          const blushAlpha =
            expressionNow === "startled"
              ? 0.42
              : hoveringFace
                ? 0.28
                : 0.2;
          context.fillStyle = `rgba(221, 119, 170, ${blushAlpha})`;
          for (const centerX of [width * 0.31, width * 0.67]) {
            context.beginPath();
            context.ellipse(
              centerX,
              height * 0.49,
              width * 0.026,
              height * 0.009,
              0,
              0,
              Math.PI * 2
            );
            context.fill();
          }
        }
      });

      if (expressionNow === "glitch") {
        context.globalCompositeOperation = "screen";
        context.fillStyle = "rgba(221, 119, 170, 0.14)";
        context.fillRect(0, height * (0.2 + Math.random() * 0.55), width, 2);
        context.globalCompositeOperation = "source-over";
      }
      context.restore();
    };

    const animate = (time: number) => {
      const delta = Math.min(40, time - lastFrame);
      lastFrame = time;
      draw(time, delta);
      if (!reducedMotion) frame = requestAnimationFrame(animate);
    };

    const isOverFace = (event: PointerEvent) => {
      if (modeRef.current === "loading") return false;
      const bounds = host.getBoundingClientRect();
      const localX = (event.clientX - bounds.left) / bounds.width;
      const localY = (event.clientY - bounds.top) / bounds.height;
      return (
        localX >= 0.17 &&
        localX <= 0.84 &&
        localY >= 0.09 &&
        localY <= 0.66
      );
    };

    const pointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      const faceCenterX = bounds.left + bounds.width * 0.5;
      const faceCenterY = bounds.top + bounds.height * 0.38;
      pointerTarget.x = Math.max(
        -1,
        Math.min(1, (event.clientX - faceCenterX) / (window.innerWidth * 0.42))
      );
      pointerTarget.y = Math.max(
        -1,
        Math.min(1, (event.clientY - faceCenterY) / (window.innerHeight * 0.42))
      );

      const now = performance.now();
      const elapsed = Math.max(16, now - lastPointerAt);
      const distance = Math.hypot(
        event.clientX - lastPointerX,
        event.clientY - lastPointerY
      );
      const speed = distance / elapsed;
      const overFace = event.pointerType !== "touch" && isOverFace(event);

      if (overFace && !hoveringFace) {
        hoveringFace = true;
        setHovered(true);
        window.clearTimeout(leaveTimer);
        hoverTimer = window.setTimeout(() => {
          hoverReactionAt = Date.now();
          signal38("hover-face");
        }, 820);
        stareTimer = window.setTimeout(() => signal38("stare"), 4300);
      } else if (!overFace && hoveringFace) {
        hoveringFace = false;
        setHovered(false);
        window.clearTimeout(hoverTimer);
        window.clearTimeout(stareTimer);
        if (Date.now() - hoverReactionAt < 6800) {
          leaveTimer = window.setTimeout(
            () => signal38("hover-leave"),
            360
          );
        }
      }

      if (
        overFace &&
        lastPointerAt > 0 &&
        speed > 1.8 &&
        Date.now() - lastChaseAt > 10_000
      ) {
        lastChaseAt = Date.now();
        signal38("chase");
      }

      if (
        expressionRef.current === "sleeping" &&
        overFace &&
        Date.now() - sleepingWakeAt > 3000
      ) {
        sleepingWakeAt = Date.now();
        signal38("return");
      }

      lastPointerAt = now;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      if (reducedMotion) draw(now, 16.67);
    };

    const pointerDown = (event: PointerEvent) => {
      if (!isOverFace(event)) return;
      const now = Date.now();
      if (now - pokeWindowStarted > 7500) {
        pokeWindowStarted = now;
        pokeCount = 0;
      }
      pokeCount += 1;
      signal38(pokeCount >= 3 ? "poke-again" : "poke");
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    image.addEventListener("load", () => {
      portrait = createPixelPortrait(image);
      resize();
      draw(performance.now(), 16.67);
    });
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("pointerdown", pointerDown, { passive: true });
    image.src = "/brand/blunt38-banner.jpg";

    if (!reducedMotion) frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hoverTimer);
      window.clearTimeout(stareTimer);
      window.clearTimeout(leaveTimer);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerdown", pointerDown);
    };
  }, []);

  return (
    <aside
      ref={hostRef}
      className="watcher38"
      data-mode={mode}
      data-expression={expression}
      data-speaking={speaking ? "true" : "false"}
      data-hovered={hovered ? "true" : "false"}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="watcher38-caption" aria-live="polite">
        <span aria-hidden="true">
          <i />
          38
        </span>
        <p>{typedLine}</p>
      </div>
    </aside>
  );
}
