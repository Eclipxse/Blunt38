"use client";

import { useEffect } from "react";

const bootTitle = "blunt38 // signal acquired";

function adaptiveTitle(signal: string | undefined) {
  if (signal?.startsWith("studio:")) {
    const studio = signal.slice("studio:".length).replaceAll("-", " ");
    return `${studio} studio // blunt38`;
  }

  const titles: Record<string, string> = {
    login: "blunt38 // awaiting login",
    syncing: "blunt38 // syncing...",
    lost: "blunt38 // signal lost",
    publishing: "blunt38 // publishing...",
    unsaved: "* unsaved // blunt38",
    home: "blunt38 // signal live",
    automations: "automations // blunt38",
    music: "music deck // blunt38",
    studio: "studio // blunt38"
  };

  return titles[signal ?? ""] ?? "blunt38 // control signal";
}

export function TitleSignal() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    let booting = !reducedMotion.matches;
    let character = 0;
    let timeout = 0;

    const applyAdaptiveTitle = () => {
      if (!booting) {
        document.title = adaptiveTitle(root.dataset.titleSignal);
      }
    };

    const observer = new MutationObserver(applyAdaptiveTitle);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-title-signal"]
    });

    if (!booting) {
      applyAdaptiveTitle();
      return () => observer.disconnect();
    }

    const typeNextCharacter = () => {
      character += 1;
      document.title = `${bootTitle.slice(0, character)}_`;

      if (character < bootTitle.length) {
        timeout = window.setTimeout(typeNextCharacter, 58);
        return;
      }

      document.title = bootTitle;
      timeout = window.setTimeout(() => {
        booting = false;
        applyAdaptiveTitle();
      }, 420);
    };

    document.title = "_";
    timeout = window.setTimeout(typeNextCharacter, 180);

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return null;
}
