"use client";

import {
  CakeSlice,
  ChevronLeft,
  ChevronRight,
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
import { useEffect, useMemo, useState } from "react";

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

export function StudioHub({
  guildId,
  guildName,
  onFocusChange
}: {
  guildId: string;
  guildName: string;
  onFocusChange?: (focused: boolean) => void;
}) {
  const [selectedType, setSelectedType] = useState<VisualStudioType | null>(
    null
  );
  const selected = useMemo(
    () => (selectedType ? getVisualStudioDefinition(selectedType) : null),
    [selectedType]
  );

  useEffect(() => {
    onFocusChange?.(Boolean(selectedType));
    return () => onFocusChange?.(false);
  }, [onFocusChange, selectedType]);

  if (selected) {
    return (
      <div className="minimal-studio-editor">
        <header>
          <button type="button" onClick={() => setSelectedType(null)}>
            <ChevronLeft size={17} />
            Exit studio
          </button>
          <div>
            <span>Focus mode / {selected.eyebrow}</span>
            <strong>{selected.label}</strong>
          </div>
        </header>
        <VisualStudio
          guildId={guildId}
          guildName={guildName}
          studioType={selected.type}
        />
      </div>
    );
  }

  return (
    <div className="minimal-page minimal-studio-index">
      <header className="minimal-page-heading">
        <span className="minimal-eyebrow">Studio</span>
        <h1>Message design</h1>
        <p>Choose one Discord surface to edit.</p>
      </header>

      <section className="studio-module-list">
        {visualStudioCatalog.map((studio) => {
          const Icon = icons[studio.type];
          return (
            <button
              key={studio.type}
              type="button"
              onClick={() => setSelectedType(studio.type)}
            >
              <Icon size={18} />
              <span>
                <strong>{studio.label}</strong>
                <small>{studio.description}</small>
              </span>
              <code>{studio.format}</code>
              <ChevronRight size={17} />
            </button>
          );
        })}
      </section>
    </div>
  );
}
