"use client";

import {
  Bot,
  Copy,
  DoorOpen,
  Home,
  Mic2,
  Music2,
  Palette,
  ScrollText,
  Search,
  Sparkles,
  Ticket,
  Users,
  Workflow
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AutomationKey, PrimaryView } from "@/components/dashboard-types";

type PaletteAction = {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: typeof Search;
  run: () => void | Promise<void>;
};

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onAutomation,
  onCopied
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: PrimaryView) => void;
  onAutomation: (automation: AutomationKey) => void;
  onCopied: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = useMemo<PaletteAction[]>(() => {
    const navigate = (view: PrimaryView) => () => {
      onNavigate(view);
      onClose();
    };
    const automation = (key: AutomationKey) => () => {
      onAutomation(key);
      onClose();
    };
    const copy = (command: string) => async () => {
      try {
        await navigator.clipboard.writeText(command);
        onCopied(`${command} copied`);
      } catch {
        onCopied(`Could not copy ${command}`);
      }
      onClose();
    };

    return [
      { id: "home", label: "Home", description: "Server setup overview", keywords: "dashboard overview", icon: Home, run: navigate("home") },
      { id: "automations", label: "Automations", description: "Open all server workflows", keywords: "settings modules", icon: Workflow, run: navigate("automations") },
      { id: "music", label: "Music", description: "Player defaults and DJ access", keywords: "lavalink audio volume", icon: Music2, run: navigate("music") },
      { id: "studio", label: "Studio", description: "Edit visual message templates", keywords: "design canvas cards", icon: Palette, run: navigate("studio") },
      { id: "ai", label: "AI reply", description: "Channel and personality", keywords: "autoreply chatbot", icon: Bot, run: automation("ai") },
      { id: "welcome", label: "Welcome", description: "Join greeting and birthday route", keywords: "member join", icon: Sparkles, run: automation("welcome") },
      { id: "goodbye", label: "Goodbye", description: "Member departure messages", keywords: "leave exit", icon: DoorOpen, run: automation("goodbye") },
      { id: "roles", label: "Member roles", description: "Autorole and verification", keywords: "permissions verify", icon: Users, run: automation("roles") },
      { id: "tickets", label: "Tickets", description: "Private support routing", keywords: "help desk", icon: Ticket, run: automation("tickets") },
      { id: "voice", label: "Temporary voice", description: "Join-to-create voice rooms", keywords: "vc channel", icon: Mic2, run: automation("voice") },
      { id: "logs", label: "Server logs", description: "Moderation event route", keywords: "audit mod", icon: ScrollText, run: automation("logs") },
      { id: "copy-music", label: "/music search", description: "Copy exact-result music search", keywords: "command song", icon: Copy, run: copy("/music search") },
      { id: "copy-setup", label: "/setup", description: "Copy Discord setup command", keywords: "command configure", icon: Copy, run: copy("/setup") }
    ];
  }, [onAutomation, onClose, onCopied, onNavigate]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return actions;
    return actions.filter((action) => {
      return `${action.label} ${action.description} ${action.keywords}`.toLowerCase().includes(normalized);
    });
  }, [actions, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  function handleKeyDown(event: ReactKeyboardEvent) {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(filtered.length - 1, current + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    }
    if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      void filtered[activeIndex].run();
    }
  }

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <label className="command-search">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Go anywhere or find a command"
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>ESC</kbd>
        </label>
        <div className="command-results" role="listbox">
          {filtered.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                className={index === activeIndex ? "active" : ""}
                key={action.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => void action.run()}
              >
                <Icon size={17} />
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </span>
              </button>
            );
          })}
          {filtered.length === 0 ? <p>No matching control.</p> : null}
        </div>
        <footer>
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
        </footer>
      </section>
    </div>
  );
}
