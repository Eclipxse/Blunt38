"use client";

import { useEffect, useRef, useState } from "react";

type DotShiftProps = {
  className?: string;
  color?: string;
  spacing?: number;
  speed?: number;
};

type ParticleWordProps = {
  className?: string;
  text: string;
  colors?: string[];
};

type Particle = {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  color: string;
};

const asciiRamp = "  .,:;-=+*#%@";
const defaultParticleColors = [
  "#eee4d7",
  "#aaa2ef",
  "#db739e",
  "#53c9b8"
];

function motionIsReduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DotShift({
  className = "",
  color = "#948ce8",
  spacing = 25,
  speed = 0.5
}: DotShiftProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const hostElement = host;
    const canvasElement = canvas;
    const drawingContext = context;

    const reducedMotion = motionIsReduced();
    const pointer = { x: 0, y: 0, active: false };
    let width = 0;
    let height = 0;
    let visible = true;
    let frame = 0;

    function resize() {
      const bounds = hostElement.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvasElement.width = Math.round(width * dpr);
      canvasElement.height = Math.round(height * dpr);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(0);
    }

    function draw(time: number) {
      drawingContext.clearRect(0, 0, width, height);
      const phase = reducedMotion ? 0 : time * 0.00045 * speed;
      const radius = 110;

      for (let y = -spacing; y < height + spacing; y += spacing) {
        for (let x = -spacing; x < width + spacing; x += spacing) {
          const waveX = Math.sin(phase + y * 0.025) * 4.5;
          const waveY = Math.cos(phase * 0.85 + x * 0.018) * 4.5;
          let dotX = x + waveX;
          let dotY = y + waveY;
          let alpha = 0.14;

          if (pointer.active) {
            const deltaX = dotX - pointer.x;
            const deltaY = dotY - pointer.y;
            const distance = Math.hypot(deltaX, deltaY);
            if (distance < radius && distance > 0) {
              const force = (1 - distance / radius) * 9;
              dotX += (deltaX / distance) * force;
              dotY += (deltaY / distance) * force;
              alpha += (1 - distance / radius) * 0.2;
            }
          }

          drawingContext.globalAlpha = alpha;
          drawingContext.fillStyle = color;
          drawingContext.beginPath();
          drawingContext.arc(dotX, dotY, 1.05, 0, Math.PI * 2);
          drawingContext.fill();
        }
      }

      drawingContext.globalAlpha = 1;
    }

    function animate(time: number) {
      if (visible && !document.hidden) draw(time);
      if (!reducedMotion) frame = requestAnimationFrame(animate);
    }

    function pointerMove(event: PointerEvent) {
      const bounds = hostElement.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active =
        pointer.x >= 0 &&
        pointer.y >= 0 &&
        pointer.x <= bounds.width &&
        pointer.y <= bounds.height;
    }

    function pointerLeave() {
      pointer.active = false;
    }

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });

    resizeObserver.observe(hostElement);
    intersectionObserver.observe(hostElement);
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("blur", pointerLeave);
    resize();
    if (!reducedMotion) frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("blur", pointerLeave);
    };
  }, [color, spacing, speed]);

  return (
    <div
      ref={hostRef}
      className={`dot-shift ${className}`.trim()}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

export function ParticleWord({
  className = "",
  text,
  colors = defaultParticleColors
}: ParticleWordProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const hostElement = host;
    const canvasElement = canvas;
    const drawingContext = context;

    const reducedMotion = motionIsReduced();
    const pointer = { x: 0, y: 0, active: false };
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;

    function rebuild() {
      const bounds = hostElement.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvasElement.width = Math.round(width * dpr);
      canvasElement.height = Math.round(height * dpr);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);

      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = Math.round(width);
      sampleCanvas.height = Math.round(height);
      const sample = sampleCanvas.getContext("2d", {
        willReadFrequently: true
      });
      if (!sample) return;

      const fontSize = Math.min(height * 0.72, width / Math.max(4.7, text.length * 0.56));
      sample.clearRect(0, 0, width, height);
      sample.fillStyle = "#fff";
      sample.font = `900 ${fontSize}px Arial Black, Arial, sans-serif`;
      sample.textAlign = "center";
      sample.textBaseline = "middle";
      sample.fillText(text, width / 2, height / 2);

      const pixels = sample.getImageData(0, 0, width, height).data;
      const gap = width < 680 ? 5 : 4;
      const next: Particle[] = [];

      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          const alpha = pixels[(Math.floor(y) * Math.floor(width) + Math.floor(x)) * 4 + 3];
          if (alpha < 120) continue;
          next.push({
            x: x + (Math.random() - 0.5) * 24,
            y: y + (Math.random() - 0.5) * 24,
            homeX: x,
            homeY: y,
            vx: 0,
            vy: 0,
            color: colors[next.length % colors.length]
          });
        }
      }

      particles = next.slice(0, width < 680 ? 1900 : 4200);
      draw(0);
    }

    function draw(time: number) {
      drawingContext.clearRect(0, 0, width, height);

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        if (!reducedMotion) {
          if (pointer.active) {
            const deltaX = particle.x - pointer.x;
            const deltaY = particle.y - pointer.y;
            const distance = Math.hypot(deltaX, deltaY);
            if (distance < 140 && distance > 0) {
              const force = (1 - distance / 140) * 1.4;
              particle.vx += (deltaX / distance) * force;
              particle.vy += (deltaY / distance) * force;
            }
          }

          particle.vx += (particle.homeX - particle.x) * 0.042;
          particle.vy += (particle.homeY - particle.y) * 0.042;
          particle.vx *= 0.84;
          particle.vy *= 0.84;
          particle.x += particle.vx;
          particle.y += particle.vy;
        } else {
          particle.x = particle.homeX;
          particle.y = particle.homeY;
        }

        const shimmer = reducedMotion
          ? 0.94
          : 0.82 + Math.sin(time * 0.0022 - particle.homeX * 0.026 + index * 0.008) * 0.16;
        drawingContext.globalAlpha = shimmer;
        drawingContext.fillStyle = particle.color;
        drawingContext.beginPath();
        drawingContext.arc(particle.x, particle.y, 1.6, 0, Math.PI * 2);
        drawingContext.fill();
      }

      drawingContext.globalAlpha = 1;
    }

    function animate(time: number) {
      if (visible && !document.hidden) draw(time);
      if (!reducedMotion) frame = requestAnimationFrame(animate);
    }

    function pointerMove(event: PointerEvent) {
      const bounds = hostElement.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active =
        pointer.x >= 0 &&
        pointer.y >= 0 &&
        pointer.x <= bounds.width &&
        pointer.y <= bounds.height;
    }

    const resizeObserver = new ResizeObserver(rebuild);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });

    resizeObserver.observe(hostElement);
    intersectionObserver.observe(hostElement);
    window.addEventListener("pointermove", pointerMove, { passive: true });
    rebuild();
    if (!reducedMotion) frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", pointerMove);
    };
  }, [colors, text]);

  return (
    <div
      ref={hostRef}
      className={`particle-word ${className}`.trim()}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

export function AsciiBanner({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ascii, setAscii] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const hostElement = host;

    const image = new Image();
    image.decoding = "async";

    function render() {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const bounds = hostElement.getBoundingClientRect();
      const columns = Math.max(
        48,
        Math.min(138, Math.floor(bounds.width / 7.1))
      );
      const rows = Math.max(
        16,
        Math.round(
          columns * (image.naturalHeight / image.naturalWidth) * 0.48
        )
      );
      const canvas = document.createElement("canvas");
      canvas.width = columns;
      canvas.height = rows;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      context.drawImage(image, 0, 0, columns, rows);
      const pixels = context.getImageData(0, 0, columns, rows).data;
      const lines: string[] = [];

      for (let y = 0; y < rows; y += 1) {
        let line = "";
        for (let x = 0; x < columns; x += 1) {
          const index = (y * columns + x) * 4;
          const luminance =
            (pixels[index] * 0.2126 +
              pixels[index + 1] * 0.7152 +
              pixels[index + 2] * 0.0722) /
            255;
          const darkness = Math.min(1, Math.max(0, (1 - luminance - 0.08) * 1.35));
          const character =
            asciiRamp[Math.round(darkness * (asciiRamp.length - 1))];
          line += character;
        }
        lines.push(line.trimEnd());
      }

      setAscii(lines.join("\n"));
    }

    const resizeObserver = new ResizeObserver(render);
    image.addEventListener("load", render);
    resizeObserver.observe(hostElement);
    image.src = "/brand/blunt38-banner.jpg";

    return () => {
      image.removeEventListener("load", render);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`ascii-banner ${className}`.trim()}
      aria-hidden="true"
    >
      <pre>{ascii}</pre>
    </div>
  );
}

export function DashboardSignalBackdrop() {
  return (
    <div className="dashboard-signal-backdrop" aria-hidden="true">
      <DotShift className="dashboard-dot-shift" color="#948ce8" />
      <span className="signal-code">38 / NONE EXPLAINED / SIGNAL LIVE</span>
    </div>
  );
}
