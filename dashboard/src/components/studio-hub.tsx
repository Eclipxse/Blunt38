"use client";

import {
  CakeSlice,
  ChevronLeft,
  CirclePlay,
  DoorOpen,
  Headphones,
  Megaphone,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Star,
  Ticket,
  Trophy
} from "lucide-react";
import { animate, stagger } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";

import { VisualStudio } from "@/components/welcome-studio";
import {
  getVisualStudioDefinition,
  visualStudioCatalog,
  type VisualStudioType
} from "@/lib/visual-document";

const icons = {
  welcome: Sparkles,
  goodbye: DoorOpen,
  ticket: Ticket,
  music: Headphones,
  rank: Trophy,
  "level-up": CirclePlay,
  starboard: Star,
  birthday: CakeSlice,
  announcement: Megaphone,
  logging: MessageSquareText,
  moderation: ShieldAlert
} satisfies Record<VisualStudioType, typeof Sparkles>;

const artByStudio: Partial<Record<VisualStudioType, string>> = {
  welcome: "/brand/blunt38-banner.jpg",
  goodbye: "/brand/kitty-is-not-okay.jpg",
  music: "/brand/drugs-dont-work.jpg",
  rank: "/brand/blunt38-banner.jpg",
  "level-up": "/brand/kitty-is-not-okay.jpg",
  birthday: "/brand/kitty-is-not-okay.jpg",
  announcement: "/brand/blunt38-banner.jpg",
  moderation: "/brand/drugs-dont-work.jpg"
};

export function StudioHub({
  guildId,
  guildName
}: {
  guildId: string;
  guildName: string;
}) {
  const hubRef = useRef<HTMLDivElement | null>(null);
  const [selectedType, setSelectedType] = useState<VisualStudioType | null>(null);
  const selected = useMemo(
    () => (selectedType ? getVisualStudioDefinition(selectedType) : null),
    [selectedType]
  );

  useEffect(() => {
    const root = hubRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = selectedType
      ? root.querySelectorAll<HTMLElement>(".studio-hub-return, .visual-studio")
      : root.querySelectorAll<HTMLElement>(".studio-index-hero, .studio-index-card");
    const entrance = animate(targets, {
      opacity: [0, 1],
      y: [16, 0],
      scale: [0.99, 1],
      delay: stagger(selectedType ? 70 : 42),
      duration: 560,
      ease: "outExpo"
    });

    return () => {
      entrance.revert();
    };
  }, [selectedType]);

  if (selected) {
    return (
      <div className="studio-hub editor-open" ref={hubRef}>
        <div className="studio-hub-return">
          <button type="button" onClick={() => setSelectedType(null)}>
            <ChevronLeft size={17} />
            Studio index
          </button>
          <div>
            <span>{selected.eyebrow}</span>
            <strong>{selected.label} Studio</strong>
          </div>
          <small>{selected.description}</small>
        </div>
        <VisualStudio
          guildId={guildId}
          guildName={guildName}
          studioType={selected.type}
        />
      </div>
    );
  }

  return (
    <div className="studio-hub" ref={hubRef}>
      <section className="studio-index-hero">
        <div className="studio-index-copy">
          <span className="pixel-kicker">VISUAL SYSTEM / 11 MODULES</span>
          <h3>Make every bot message feel like it came from the same little universe.</h3>
          <p>
            Pick a surface, use a preset, or build it from layers. Every publish is
            versioned per server.
          </p>
          <div className="studio-index-status">
            <span>SUPABASE SYNC</span>
            <span>VARIABLES LIVE</span>
            <span>PNG RENDERER</span>
          </div>
          <div className="studio-signal-line" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <figure className="studio-index-art">
          <img src="/brand/drugs-dont-work.jpg" alt="Pixel girl artwork" />
          <figcaption>signal 038 / graphics online</figcaption>
        </figure>
      </section>

      <section className="studio-index-grid">
        {visualStudioCatalog.map((studio, index) => {
          const Icon = icons[studio.type];
          const art = artByStudio[studio.type];
          return (
            <button
              className={`studio-index-card tone-${(index % 4) + 1}`}
              key={studio.type}
              type="button"
              onClick={() => setSelectedType(studio.type)}
            >
              <span className="studio-card-number">{String(index + 1).padStart(2, "0")}</span>
              {art ? <img src={art} alt="" /> : <span className="studio-card-pattern" />}
              <span className="studio-card-icon">
                <Icon size={19} />
              </span>
              <span className="studio-card-copy">
                <small>{studio.eyebrow}</small>
                <strong>{studio.label}</strong>
                <span>{studio.description}</span>
              </span>
              <span className="studio-card-format">{studio.format}</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
