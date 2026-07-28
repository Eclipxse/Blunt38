"use client";

import Lenis from "lenis";
import type { ReactNode } from "react";
import { useEffect } from "react";

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
    }

    return () => {
      lenis?.destroy();
    };
  }, []);

  return children;
}
