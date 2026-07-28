"use client";

import { useEffect } from "react";

const titleFrames = [
  "blunt38 [....]",
  "blunt38 [=...]",
  "blunt38 [.==.]",
  "blunt38 [...=]",
  "blunt38 [LIVE]",
  "blunt38 // watching"
];

export function TitleSignal() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (reducedMotion.matches) {
      document.title = "blunt38 // control signal";
      return;
    }

    let frame = 0;
    document.title = titleFrames[frame];

    const interval = window.setInterval(() => {
      frame = (frame + 1) % titleFrames.length;
      document.title = titleFrames[frame];
    }, 720);

    return () => window.clearInterval(interval);
  }, []);

  return null;
}
