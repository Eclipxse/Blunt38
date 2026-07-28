"use client";

import { useEffect } from "react";

const title = "blunt38";

export function TitleSignal() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    if (reducedMotion.matches) {
      document.title = title;
      return;
    }

    let character = 0;
    document.title = "_";

    const interval = window.setInterval(() => {
      character += 1;
      document.title =
        character < title.length
          ? `${title.slice(0, character)}_`
          : title;

      if (character >= title.length) {
        window.clearInterval(interval);
      }
    }, 320);

    return () => window.clearInterval(interval);
  }, []);

  return null;
}
