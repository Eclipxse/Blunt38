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
  | "studio-save";

type WatcherExpression =
  | "idle"
  | "curious"
  | "pleased"
  | "doubt"
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
};

type Cell = {
  character: string;
  x: number;
  y: number;
  alpha: number;
  accent: boolean;
};

const SIGNAL_NAME = "blunt38:watcher";
const asciiRamp = ".,:;+*#@";

const reactions: Record<
  Exclude<WatcherAction, "context" | "navigate">,
  Reaction
> = {
  login: {
    expression: "curious",
    lines: ["you took long enough.", "back already?"]
  },
  "connect-hover": {
    expression: "curious",
    lines: ["go on. i'll wait.", "you can click it."]
  },
  return: {
    expression: "pleased",
    lines: ["i kept your place.", "i saw you come back."]
  },
  idle: {
    expression: "sleeping",
    lines: ["still here.", "you went quiet."]
  },
  "guild-change": {
    expression: "curious",
    lines: ["new room. same habits.", "this one feels different."]
  },
  discard: {
    expression: "doubt",
    lines: ["you liked the first version.", "pretend that never happened."]
  },
  "save-success": {
    expression: "pleased",
    lines: ["saved. pretend it was intentional.", "fine. i'll remember it."],
    urgent: true
  },
  "save-error": {
    expression: "glitch",
    lines: ["don't look at me.", "that wasn't supposed to happen."],
    urgent: true
  },
  "studio-open": {
    expression: "curious",
    lines: ["make it look accidental.", "try not to overthink it."]
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

function createBasePortrait(
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const base = document.createElement("canvas");
  base.width = Math.max(1, Math.round(width));
  base.height = Math.max(1, Math.round(height));
  const context = base.getContext("2d");
  if (!context) return base;

  const cellWidth = width < 320 ? 7 : width < 520 ? 8 : 9;
  const cellHeight = cellWidth * 1.35;
  const columns = Math.max(32, Math.floor(width / cellWidth));
  const rows = Math.max(38, Math.floor(height / cellHeight));
  const sample = document.createElement("canvas");
  sample.width = columns;
  sample.height = rows;
  const sampleContext = sample.getContext("2d", {
    willReadFrequently: true
  });
  if (!sampleContext) return base;

  const sourceX = image.naturalWidth * 0.52;
  const sourceY = image.naturalHeight * 0.015;
  const sourceWidth = image.naturalWidth * 0.455;
  const sourceHeight = image.naturalHeight * 0.965;
  sampleContext.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    columns,
    rows
  );

  const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
  const cells: Cell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = (row * columns + column) * 4;
      const luminance =
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;
      const darkness = Math.max(0, Math.min(1, (194 - luminance) / 170));
      if (darkness < 0.11) continue;

      const rampIndex = Math.min(
        asciiRamp.length - 1,
        Math.floor(darkness * asciiRamp.length)
      );
      cells.push({
        character: asciiRamp[rampIndex],
        x: (column + 0.5) * cellWidth,
        y: (row + 0.82) * cellHeight,
        alpha: 0.28 + darkness * 0.72,
        accent:
          darkness > 0.42 && (column * 17 + row * 29) % 113 === 0
      });
    }
  }

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${Math.max(7, cellHeight * 0.92)}px "Courier New", monospace`;

  for (const cell of cells) {
    context.fillStyle = cell.accent
      ? `rgba(219, 115, 158, ${cell.alpha * 0.9})`
      : `rgba(205, 187, 215, ${cell.alpha})`;
    context.fillText(cell.character, cell.x, cell.y);
  }

  return base;
}

export function Watcher38() {
  const hostRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const expressionRef = useRef<WatcherExpression>("idle");
  const lastSpokenAt = useRef(0);
  const previousLine = useRef("");
  const expressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visits = useRef(1);
  const [mode, setMode] = useState<WatcherMode>("loading");
  const [expression, setExpression] =
    useState<WatcherExpression>("idle");
  const [line, setLine] = useState("");
  const [typedLine, setTypedLine] = useState("");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  const react = useCallback((detail: WatcherSignalDetail) => {
    if (detail.mode) setMode(detail.mode);
    if (detail.silent || detail.action === "context") return;

    const reaction =
      detail.action === "navigate"
        ? navigationReactions[detail.subject ?? "home"]
        : reactions[detail.action];
    if (!reaction) return;

    const now = Date.now();
    if (!reaction.urgent && now - lastSpokenAt.current < 3600) return;
    const nextLine = chooseLine(reaction.lines, previousLine.current);

    previousLine.current = nextLine;
    lastSpokenAt.current = now;
    setExpression(reaction.expression);
    setLine(nextLine);

    if (expressionTimer.current) clearTimeout(expressionTimer.current);
    expressionTimer.current = setTimeout(() => {
      setExpression("idle");
    }, reaction.expression === "glitch" ? 1900 : 4200);
  }, []);

  useEffect(() => {
    try {
      const stored = Number.parseInt(
        window.localStorage.getItem("blunt38:visits") ?? "0",
        10
      );
      visits.current = Number.isFinite(stored) ? stored + 1 : 1;
      window.localStorage.setItem(
        "blunt38:visits",
        String(visits.current)
      );
    } catch {
      visits.current = 1;
    }

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
        const delay = /[.,?]/.test(character) ? 105 : 33;
        timer = window.setTimeout(type, delay);
      } else {
        timer = window.setTimeout(() => setSpeaking(false), 650);
      }
    };

    timer = window.setTimeout(type, 120);
    return () => window.clearTimeout(timer);
  }, [line]);

  useEffect(() => {
    let idleTimer = 0;
    let hiddenAt = 0;

    const resetIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => signal38("idle"), 48_000);
    };

    const visibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else {
        if (hiddenAt && Date.now() - hiddenAt > 12_000) {
          signal38("return");
        }
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
    const pointerTarget = { x: 0, y: 0 };
    const pointerCurrent = { x: 0, y: 0 };
    let base = document.createElement("canvas");
    let width = 1;
    let height = 1;
    let frame = 0;
    let blink = false;
    let blinkTimer = 0;
    let blinkCloseTimer = 0;
    let lastFrame = 0;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      if (!image.naturalWidth) return;
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.35);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      base = createBasePortrait(image, width, height);
      draw(performance.now());
    };

    const featureText = (
      value: string,
      x: number,
      y: number,
      size: number,
      color = "rgba(219, 115, 158, 0.92)"
    ) => {
      context.font = `600 ${size}px "Courier New", monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      context.fillText(value, x, y);
    };

    const draw = (time: number) => {
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);
      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.075;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.075;

      const pulse = reducedMotion ? 0.86 : 0.84 + Math.sin(time / 1500) * 0.04;
      context.globalAlpha = pulse;
      const currentExpression = expressionRef.current;

      if (currentExpression === "glitch") {
        context.globalAlpha = 0.28;
        context.drawImage(base, -3, 1, width, height);
        context.globalAlpha = 0.34;
        context.drawImage(base, 4, -1, width, height);
      }

      context.globalAlpha = pulse;
      context.drawImage(base, 0, 0, width, height);
      context.globalAlpha = 1;

      const eyeY = height * 0.385;
      const eyeXs = [width * 0.445, width * 0.6];
      const eyeWidth = width * 0.1;
      const eyeHeight = height * 0.055;
      const eyeOffsetX = pointerCurrent.x * Math.min(4, width * 0.008);
      const eyeOffsetY = pointerCurrent.y * Math.min(3, height * 0.006);

      if (blink || currentExpression === "sleeping") {
        for (const eyeX of eyeXs) {
          context.clearRect(
            eyeX - eyeWidth / 2,
            eyeY - eyeHeight / 2,
            eyeWidth,
            eyeHeight
          );
          featureText(
            "-----",
            eyeX,
            eyeY,
            Math.max(9, width * 0.022),
            "rgba(205, 187, 215, 0.9)"
          );
        }
      } else {
        for (const eyeX of eyeXs) {
          featureText(
            "*",
            eyeX + eyeOffsetX,
            eyeY + eyeOffsetY,
            Math.max(8, width * 0.018)
          );
        }
      }

      if (currentExpression !== "idle") {
        const mouthX = width * 0.525;
        const mouthY = height * 0.515;
        context.clearRect(
          mouthX - width * 0.09,
          mouthY - height * 0.025,
          width * 0.18,
          height * 0.05
        );
        const mouths: Record<WatcherExpression, string> = {
          idle: "",
          curious: ". .",
          pleased: "\\___/",
          doubt: "-----",
          glitch: "/?/",
          sleeping: "___"
        };
        featureText(
          mouths[currentExpression],
          mouthX,
          mouthY,
          Math.max(9, width * 0.021),
          "rgba(205, 187, 215, 0.94)"
        );
      }
    };

    const animate = (time: number) => {
      if (time - lastFrame > 1000 / 28) {
        draw(time);
        lastFrame = time;
      }
      if (!reducedMotion) frame = requestAnimationFrame(animate);
    };

    const pointerMove = (event: PointerEvent) => {
      pointerTarget.x = Math.max(
        -1,
        Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2)
      );
      pointerTarget.y = Math.max(
        -1,
        Math.min(1, (event.clientY / window.innerHeight - 0.5) * 2)
      );
      if (reducedMotion) draw(0);
    };

    const scheduleBlink = () => {
      const delay = 3800 + Math.random() * 5200;
      blinkTimer = window.setTimeout(() => {
        blink = true;
        if (reducedMotion) draw(0);
        blinkCloseTimer = window.setTimeout(() => {
          blink = false;
          if (reducedMotion) draw(0);
          scheduleBlink();
        }, 135);
      }, delay);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    image.addEventListener("load", resize);
    window.addEventListener("pointermove", pointerMove, { passive: true });
    image.src = "/brand/blunt38-banner.jpg";
    scheduleBlink();

    if (!reducedMotion) {
      frame = requestAnimationFrame(animate);
    } else {
      image.addEventListener("load", () => draw(0), { once: true });
    }

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(blinkTimer);
      window.clearTimeout(blinkCloseTimer);
      resizeObserver.disconnect();
      image.removeEventListener("load", resize);
      window.removeEventListener("pointermove", pointerMove);
    };
  }, []);

  return (
    <aside
      ref={hostRef}
      className="watcher38"
      data-mode={mode}
      data-expression={expression}
      data-speaking={speaking ? "true" : "false"}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="watcher38-caption" aria-live="polite">
        <span>38</span>
        <p>{typedLine}</p>
      </div>
    </aside>
  );
}
