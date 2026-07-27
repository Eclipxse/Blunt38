"use client";

import Lenis from "lenis";
import type { ReactNode } from "react";
import { useEffect } from "react";

const spotlightSelector = [
  ".topbar",
  ".panel",
  ".preview-panel",
  ".metric",
  ".studio-index-card",
  ".studio-index-hero",
  ".studio-hub-return",
  ".visual-studio",
  ".auth-login-card",
  ".workbench-hero",
  ".command-console",
  ".live-module-panel"
].join(",");

export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;

    if (!reducedMotion) {
      lenis = new Lenis({
        autoRaf: true,
        anchors: true,
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 0.86,
        prevent: (node) =>
          node instanceof HTMLElement &&
          Boolean(node.closest("[data-native-scroll], select, textarea, input"))
      });

      lenis.on("scroll", (state) => {
        document.documentElement.style.setProperty("--scroll-progress", String(state.progress));
        document.documentElement.style.setProperty("--scroll-velocity", String(Math.min(Math.abs(state.velocity), 18)));
      });
    }

    const onPointerMove = (event: PointerEvent) => {
      const source = event.target;
      if (!(source instanceof Element)) return;

      const surface = source.closest<HTMLElement>(spotlightSelector);
      if (!surface) return;

      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
      surface.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
      surface.dataset.spotlightActive = "true";
    };

    const onPointerOut = (event: PointerEvent) => {
      const source = event.target;
      if (!(source instanceof Element)) return;

      const surface = source.closest<HTMLElement>(spotlightSelector);
      if (!surface || (event.relatedTarget instanceof Node && surface.contains(event.relatedTarget))) return;
      delete surface.dataset.spotlightActive;
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      lenis?.destroy();
      document.documentElement.style.removeProperty("--scroll-progress");
      document.documentElement.style.removeProperty("--scroll-velocity");
    };
  }, []);

  return (
    <>
      <div className="scroll-signal" aria-hidden="true" />
      <div className="viewport-scan" aria-hidden="true" />
      {children}
    </>
  );
}
