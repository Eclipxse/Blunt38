"use client";

import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { LiquidWordmark } from "./liquid-wordmark";
import styles from "./dashboard-login.module.css";

const INTRO_KEY = "blunt38:login-intro:v3";
const FILL_DURATION = 3000;
const EXIT_DURATION = 700;

type Props = {
  onComplete?: (restoreFocus?: boolean) => void;
  skip?: boolean;
  replay?: boolean;
  destinationRef: RefObject<SVGSVGElement | null>;
};

export function LiquidPreloader({ onComplete, skip = false, replay = false, destinationRef }: Props) {
  const [complete, setComplete] = useState(false);
  const [exiting, setExiting] = useState(false);
  const markRef = useRef<SVGSVGElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const finishRef = useRef<(immediate?: boolean, focus?: boolean) => void>(() => {});
  const skipIntro = useCallback(() => finishRef.current(true, true), []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let seen = false;
    try { seen = sessionStorage.getItem(INTRO_KEY) === "seen"; } catch { /* Private storage is optional. */ }
    let finished = false;
    let disposed = false;
    let counterTimer: number | undefined;
    let fillTimer: number | undefined;
    let exitTimer: number | undefined;
    let travel: Animation | undefined;
    let releaseScroll: ((interrupted?: boolean) => void) | undefined;
    const startedAt = performance.now();

    const done = (focus: boolean) => {
      if (disposed) return;
      releaseScroll?.();
      setComplete(true);
      onComplete?.(focus);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); finish(true, true); }
    };
    const onMotion = () => { if (motion.matches) finish(true, replay); };
    const finish = (immediate = false, focus = false) => {
      if (finished) return;
      finished = true;
      window.clearInterval(counterTimer);
      window.clearTimeout(fillTimer);
      motion.removeEventListener("change", onMotion);
      window.removeEventListener("keydown", onKey);
      try { sessionStorage.setItem(INTRO_KEY, "seen"); } catch { /* Login still works. */ }
      const restoreFocus = focus || replay || document.activeElement === skipRef.current;
      if (immediate) { done(restoreFocus); return; }
      if (counterRef.current) counterRef.current.textContent = "100";
      const from = markRef.current?.getBoundingClientRect();
      const to = destinationRef.current?.getBoundingClientRect();
      if (from && to && from.width > 0 && to.width > 0) {
        travel = markRef.current?.animate([
          { transform: "translate(0, 0) scale(1)" },
          { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})` }
        ], { duration: EXIT_DURATION, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" });
      }
      setExiting(true);
      exitTimer = window.setTimeout(() => done(restoreFocus), EXIT_DURATION);
    };
    finishRef.current = finish;

    if (skip || (!replay && seen) || motion.matches) finish(true, replay);
    else {
      // inert does not stop document scrolling. A fixed body also blocks an
      // already-running smooth-scroll animation from moving the destination.
      const root = document.documentElement;
      const body = document.body;
      const previous = {
        position: body.style.position, top: body.style.top,
        left: body.style.left, right: body.style.right,
        overflow: root.style.overflow, gutter: root.style.scrollbarGutter,
        behavior: root.style.scrollBehavior, x: window.scrollX, y: window.scrollY
      };
      root.style.overflow = "hidden";
      root.style.scrollbarGutter = "stable";
      root.style.scrollBehavior = "auto";
      body.style.position = "fixed";
      body.style.top = "0";
      body.style.left = "0";
      body.style.right = "0";
      window.scrollTo(0, 0);
      let released = false;
      releaseScroll = (interrupted = false) => {
        if (released) return;
        released = true;
        body.style.position = previous.position;
        body.style.top = previous.top;
        body.style.left = previous.left;
        body.style.right = previous.right;
        root.style.overflow = previous.overflow;
        root.style.scrollbarGutter = previous.gutter;
        // A completed/replayed intro lands at its masthead. Only an interrupted
        // unmount restores the earlier position (for example route navigation).
        window.scrollTo(interrupted ? previous.x : 0, interrupted ? previous.y : 0);
        root.style.scrollBehavior = previous.behavior;
      };
      if (replay) skipRef.current?.focus({ preventScroll: true });
      // The waves are CSS-driven; this is intro progress, not network progress.
      counterTimer = window.setInterval(() => {
        const progress = Math.min(100, Math.floor((performance.now() - startedAt) / FILL_DURATION * 100));
        if (counterRef.current) counterRef.current.textContent = String(progress).padStart(3, "0");
      }, 50);
      fillTimer = window.setTimeout(() => finish(), FILL_DURATION);
      motion.addEventListener("change", onMotion);
      window.addEventListener("keydown", onKey);
    }

    return () => {
      disposed = true;
      releaseScroll?.(true);
      window.clearInterval(counterTimer);
      window.clearTimeout(fillTimer);
      window.clearTimeout(exitTimer);
      travel?.cancel();
      motion.removeEventListener("change", onMotion);
      window.removeEventListener("keydown", onKey);
      finishRef.current = () => {};
    };
  }, [destinationRef, onComplete, replay, skip]);

  if (complete) return null;
  return (
    <div className={styles.preloader} data-native-scroll data-exiting={exiting} aria-label="blunt38 opening animation" inert={exiting}>
      <div className={styles.introHeader}><span>blunt38 / opening sequence</span><span>Your server. Your rules.</span></div>
      <div className={styles.introCenter}>
        <LiquidWordmark ref={markRef} liquid />
        <div className={styles.introReadout} aria-hidden="true"><span>Filling up. Hold your shit.</span><span><b ref={counterRef}>000</b><span className={styles.percent}> / 100</span></span></div>
      </div>
      <div className={styles.introFooter}><span>38 reasons. None explained.</span><button ref={skipRef} type="button" onClick={skipIntro}>Skip intro<ArrowUpRight size={18} aria-hidden="true" /></button></div>
    </div>
  );
}
