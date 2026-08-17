"use client";

import { useEffect, useId, useRef, useState } from "react";

type LiquidPreloaderProps = {
  onComplete?: () => void;
};

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 200;

function loadingProgress(elapsed: number) {
  if (elapsed < 420) return 0;
  if (elapsed < 3250) return ((elapsed - 420) / 2830) * 28;
  if (elapsed < 4850) return 28 + ((elapsed - 3250) / 1600) * 52;
  return 80 + Math.min(1, (elapsed - 4850) / 750) * 20;
}

function wavePath(progress: number, phase: number, still = false) {
  const level = 210 - progress * 2.15;
  const amplitude = still ? 0 : 10.5;
  const points = 64;
  let path = "";

  for (let index = 0; index <= points; index += 1) {
    const x = (index / points) * VIEWBOX_WIDTH;
    const y =
      level +
      Math.sin(x / 92 + phase) * amplitude +
      Math.sin(x / 41 - phase * 0.72) * amplitude * 0.18;
    path += `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }

  return `${path}L${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT + 24} L0 ${
    VIEWBOX_HEIGHT + 24
  } Z`;
}

export function LiquidPreloader({ onComplete }: LiquidPreloaderProps) {
  const clipId = `liquid-word-${useId().replaceAll(":", "")}`;
  const waveRef = useRef<SVGPathElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [exiting, setExiting] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const duration = reducedMotion ? 280 : 5600;
    const exitDelay = reducedMotion ? 40 : 260;
    const exitDuration = reducedMotion ? 40 : 820;
    const startedAt = performance.now();
    let frame = 0;
    let displayedProgress = -1;
    let exitTimer: number | undefined;
    let completeTimer: number | undefined;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = reducedMotion
        ? Math.min(100, (elapsed / duration) * 100)
        : Math.min(100, loadingProgress(elapsed));
      const nextDisplayedProgress = Math.floor(progress);

      waveRef.current?.setAttribute(
        "d",
        wavePath(progress, elapsed * 0.0022, reducedMotion)
      );

      if (nextDisplayedProgress !== displayedProgress) {
        displayedProgress = nextDisplayedProgress;
        if (counterRef.current) {
          counterRef.current.textContent = String(nextDisplayedProgress);
        }
      }

      if (elapsed < duration) {
        frame = window.requestAnimationFrame(tick);
        return;
      }

      exitTimer = window.setTimeout(() => setExiting(true), exitDelay);
      completeTimer = window.setTimeout(() => {
        setComplete(true);
        onComplete?.();
      }, exitDelay + exitDuration);
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      if (exitTimer) window.clearTimeout(exitTimer);
      if (completeTimer) window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (complete) return null;

  return (
    <div
      className="liquid-preloader"
      data-exiting={exiting}
      aria-hidden="true"
    >
      <div className="liquid-preloader-center">
        <svg
          className="liquid-preloader-mark"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="presentation"
        >
          <defs>
            <clipPath id={clipId}>
              <path ref={waveRef} d={wavePath(0, 0)} />
            </clipPath>
          </defs>
          <text
            className="liquid-preloader-wordmark liquid-preloader-wordmark-ghost"
            x="500"
            y="190"
            textAnchor="middle"
            textLength="960"
            lengthAdjust="spacingAndGlyphs"
          >
            BLUNT38
          </text>
          <text
            className="liquid-preloader-wordmark liquid-preloader-wordmark-fill"
            x="500"
            y="190"
            textAnchor="middle"
            textLength="960"
            lengthAdjust="spacingAndGlyphs"
            clipPath={`url(#${clipId})`}
          >
            BLUNT38
          </text>
        </svg>

        <div className="liquid-preloader-counter">
          loading... <span ref={counterRef}>0</span>%
        </div>
      </div>
    </div>
  );
}
