"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WatcherMode =
  | "loading"
  | "login"
  | "dashboard"
  | "automations"
  | "music"
  | "studio"
  | "studio-focus"
  | "empty";

export type WatcherAction =
  | "context"
  | "login"
  | "connect-hover"
  | "return"
  | "idle"
  | "navigate"
  | "guild-change"
  | "discard"
  | "save-success"
  | "save-error"
  | "studio-open"
  | "studio-exit"
  | "studio-undo"
  | "studio-save"
  | "hover-face"
  | "hover-leave"
  | "stare"
  | "poke"
  | "poke-again"
  | "chase";

type WatcherSignalDetail = {
  action: WatcherAction;
  mode?: WatcherMode;
  subject?: string;
  silent?: boolean;
};

type SignalChannel = "watcher" | "afterimage" | "static";
type SignalMood = "quiet" | "awake" | "pleased" | "warning" | "sleeping";

type Reaction = {
  channel?: SignalChannel;
  mood: SignalMood;
  lines: string[];
  duration?: number;
  sticky?: boolean;
};

const SIGNAL_NAME = "blunt38:watcher";

const CHANNELS: Array<{
  id: SignalChannel;
  index: string;
  label: string;
  source: string;
}> = [
  {
    id: "watcher",
    index: "01",
    label: "watcher",
    source: "/brand/blunt38-banner.jpg"
  },
  {
    id: "afterimage",
    index: "02",
    label: "afterimage",
    source: "/brand/drugs-dont-work.jpg"
  },
  {
    id: "static",
    index: "03",
    label: "dead signal",
    source: "/brand/blunt38-logo.jpg"
  }
];

const reactions: Record<
  Exclude<WatcherAction, "context" | "navigate">,
  Reaction
> = {
  login: {
    channel: "watcher",
    mood: "awake",
    lines: ["you came back. cute.", "oh. it's you again."]
  },
  "connect-hover": {
    channel: "watcher",
    mood: "awake",
    lines: ["permissions first. trust issues later.", "go on. i'm watching."]
  },
  return: {
    mood: "pleased",
    lines: ["i kept your place.", "missed me already?"]
  },
  idle: {
    channel: "afterimage",
    mood: "sleeping",
    lines: ["the signal gets lonely too.", "come back when you're interesting."],
    sticky: true
  },
  "guild-change": {
    channel: "static",
    mood: "awake",
    lines: ["new room. same secrets.", "who lives here?"]
  },
  discard: {
    channel: "static",
    mood: "warning",
    lines: ["deleted from memory. probably.", "pretend that never happened."]
  },
  "save-success": {
    channel: "watcher",
    mood: "pleased",
    lines: ["saved. don't ruin it.", "fine. i'll remember this version."]
  },
  "save-error": {
    channel: "static",
    mood: "warning",
    lines: ["signal lost. probably your fault.", "that was embarrassing."],
    duration: 4200
  },
  "studio-open": {
    channel: "afterimage",
    mood: "awake",
    lines: ["make something worth remembering.", "give it a pulse."]
  },
  "studio-exit": {
    channel: "watcher",
    mood: "quiet",
    lines: ["done staring?", "leave it there."]
  },
  "studio-undo": {
    channel: "static",
    mood: "warning",
    lines: ["you liked it two versions ago.", "again? bold strategy."]
  },
  "studio-save": {
    channel: "afterimage",
    mood: "pleased",
    lines: ["this one gets to live.", "keep that version."]
  },
  "hover-face": {
    mood: "warning",
    lines: [
      "ew. move your cursor, perv.",
      "you're standing suspiciously close.",
      "personal space is still a thing."
    ],
    duration: 5200
  },
  "hover-leave": {
    mood: "pleased",
    lines: ["better.", "good choice.", "that's what i thought."]
  },
  stare: {
    channel: "static",
    mood: "awake",
    lines: ["do you need something or...", "the staring is getting weird."],
    duration: 5600
  },
  poke: {
    mood: "warning",
    lines: ["did you just poke the signal?", "rude.", "hands."]
  },
  "poke-again": {
    channel: "static",
    mood: "warning",
    lines: ["okay. now you're annoying.", "once was already too many."],
    duration: 6200
  },
  chase: {
    channel: "afterimage",
    mood: "awake",
    lines: ["pick a direction.", "your cursor has commitment issues."]
  }
};

const navigationReactions: Record<string, Reaction> = {
  home: {
    channel: "watcher",
    mood: "quiet",
    lines: ["everything is listening."]
  },
  automations: {
    channel: "static",
    mood: "awake",
    lines: ["set it once. haunt it forever."]
  },
  music: {
    channel: "afterimage",
    mood: "pleased",
    lines: ["play it like you mean it.", "don't skip the good part."]
  },
  studio: {
    channel: "afterimage",
    mood: "awake",
    lines: ["make something worth remembering."]
  },
  ai: {
    channel: "static",
    mood: "awake",
    lines: ["teach it better lies."]
  },
  welcome: {
    channel: "watcher",
    mood: "quiet",
    lines: ["first impressions leave fingerprints."]
  },
  roles: {
    channel: "watcher",
    mood: "awake",
    lines: ["everyone wants a label."]
  },
  tickets: {
    channel: "static",
    mood: "quiet",
    lines: ["someone always needs something."]
  },
  levels: {
    channel: "watcher",
    mood: "pleased",
    lines: ["numbers make people behave."]
  },
  voice: {
    channel: "afterimage",
    mood: "awake",
    lines: ["listen before you speak."]
  },
  logs: {
    channel: "static",
    mood: "warning",
    lines: ["nothing really disappears."]
  }
};

export function signal38(
  action: WatcherAction,
  detail: Omit<WatcherSignalDetail, "action"> = {}
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WatcherSignalDetail>(SIGNAL_NAME, {
      detail: { action, ...detail }
    })
  );
}

function chooseLine(lines: string[], previous: string) {
  if (lines.length === 1) return lines[0];
  const available = lines.filter((line) => line !== previous);
  return available[Math.floor(Math.random() * available.length)] ?? lines[0];
}

function channelForMode(mode: WatcherMode): SignalChannel {
  if (mode === "music" || mode === "studio" || mode === "studio-focus") {
    return "afterimage";
  }
  if (mode === "automations" || mode === "empty") return "static";
  return "watcher";
}

function channelPosition(channel: SignalChannel) {
  return CHANNELS.findIndex((entry) => entry.id === channel);
}

export function Watcher38() {
  const hostRef = useRef<HTMLElement>(null);
  const lineRef = useRef("");
  const modeRef = useRef<WatcherMode>("loading");
  const channelRef = useRef<SignalChannel>("watcher");
  const moodRef = useRef<SignalMood>("quiet");
  const reactionTimerRef = useRef<number | null>(null);
  const typeTimerRef = useRef<number | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const hoverRef = useRef(false);
  const pokeCountRef = useRef(0);

  const [mode, setMode] = useState<WatcherMode>("loading");
  const [channel, setChannel] = useState<SignalChannel>("watcher");
  const [mood, setMood] = useState<SignalMood>("quiet");
  const [line, setLine] = useState("");
  const [typedLine, setTypedLine] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const changeChannel = useCallback((next: SignalChannel) => {
    if (next === channelRef.current) return;
    channelRef.current = next;
    setTransitioning(true);
    window.setTimeout(() => setChannel(next), 85);
    window.setTimeout(() => setTransitioning(false), 520);
  }, []);

  const say = useCallback((nextLine: string) => {
    lineRef.current = nextLine;
    setLine(nextLine);
    setTypedLine("");
    setSpeaking(true);
  }, []);

  const react = useCallback(
    (reaction: Reaction, silent = false) => {
      if (reactionTimerRef.current) {
        window.clearTimeout(reactionTimerRef.current);
      }

      if (reaction.channel) changeChannel(reaction.channel);
      setMood(reaction.mood);

      if (!silent) {
        say(chooseLine(reaction.lines, lineRef.current));
      }

      if (!reaction.sticky) {
        reactionTimerRef.current = window.setTimeout(() => {
          setMood("quiet");
          setSpeaking(false);
          changeChannel(channelForMode(modeRef.current));
        }, reaction.duration ?? 3600);
      }
    },
    [changeChannel, say]
  );

  useEffect(() => {
    if (typeTimerRef.current) window.clearInterval(typeTimerRef.current);
    if (!line) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedLine(line);
      return;
    }

    let index = 0;
    typeTimerRef.current = window.setInterval(() => {
      index += 1;
      setTypedLine(line.slice(0, index));
      if (index >= line.length && typeTimerRef.current) {
        window.clearInterval(typeTimerRef.current);
      }
    }, 27);

    return () => {
      if (typeTimerRef.current) window.clearInterval(typeTimerRef.current);
    };
  }, [line]);

  useEffect(() => {
    function handleSignal(event: Event) {
      const detail = (event as CustomEvent<WatcherSignalDetail>).detail;
      if (!detail) return;

      if (detail.mode) {
        modeRef.current = detail.mode;
        setMode(detail.mode);
        if (detail.action === "context") {
          changeChannel(channelForMode(detail.mode));
        }
      }

      if (detail.action === "context") {
        if (!detail.silent && detail.mode) {
          const contextReaction =
            navigationReactions[detail.mode] ?? navigationReactions.home;
          react(contextReaction);
        }
        return;
      }

      if (detail.action === "navigate") {
        react(
          navigationReactions[detail.subject ?? "home"] ??
            navigationReactions.home
        );
        return;
      }

      react(reactions[detail.action], detail.silent);
    }

    window.addEventListener(SIGNAL_NAME, handleSignal);
    return () => window.removeEventListener(SIGNAL_NAME, handleSignal);
  }, [changeChannel, react]);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    let idleTimer: number | null = null;

    const resetIdle = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      if (moodRef.current === "sleeping") signal38("return");
      idleTimer = window.setTimeout(() => signal38("idle"), 48_000);
    };

    resetIdle();
    window.addEventListener("pointermove", resetIdle, { passive: true });
    window.addEventListener("keydown", resetIdle);

    return () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      window.removeEventListener("pointermove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
    };
  }, []);

  useEffect(
    () => () => {
      if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
      if (typeTimerRef.current) window.clearInterval(typeTimerRef.current);
    },
    []
  );

  useEffect(() => {
    let animationFrame = 0;
    let stareTimer: number | null = null;

    const updatePointer = (event: PointerEvent) => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const host = hostRef.current;
        if (!host) return;

        const bounds = host.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const relativeX = Math.max(
          -1,
          Math.min(1, (event.clientX - centerX) / (window.innerWidth * 0.45))
        );
        const relativeY = Math.max(
          -1,
          Math.min(1, (event.clientY - centerY) / (window.innerHeight * 0.45))
        );
        host.style.setProperty("--signal-x", relativeX.toFixed(3));
        host.style.setProperty("--signal-y", relativeY.toFixed(3));

        const inside =
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom;

        if (inside === hoverRef.current) return;
        hoverRef.current = inside;
        setHovered(inside);

        if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
        if (stareTimer) window.clearTimeout(stareTimer);

        if (inside) {
          hoverTimerRef.current = window.setTimeout(
            () => signal38("hover-face"),
            380
          );
          stareTimer = window.setTimeout(() => signal38("stare"), 4600);
        } else {
          signal38("hover-leave");
        }
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const host = hostRef.current;
      if (!host) return;
      const bounds = host.getBoundingClientRect();
      const inside =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;
      if (!inside) return;

      pokeCountRef.current += 1;
      const nextIndex = (channelPosition(channelRef.current) + 1) % CHANNELS.length;
      changeChannel(CHANNELS[nextIndex].id);
      signal38(pokeCountRef.current >= 3 ? "poke-again" : "poke");
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
      if (stareTimer) window.clearTimeout(stareTimer);
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [changeChannel]);

  const activeChannel =
    CHANNELS.find((entry) => entry.id === channel) ?? CHANNELS[0];

  return (
    <aside
      ref={hostRef}
      className="girl-signal"
      data-channel={channel}
      data-hovered={hovered}
      data-mode={mode}
      data-mood={mood}
      data-speaking={speaking}
      data-transitioning={transitioning}
      aria-live="polite"
    >
      <div className="girl-signal-frame" aria-hidden="true">
        <div className="girl-signal-viewport">
          {CHANNELS.map((entry) => (
            <div
              className="girl-signal-channel"
              data-active={entry.id === channel}
              data-channel={entry.id}
              key={entry.id}
              style={{ "--channel-image": `url("${entry.source}")` } as React.CSSProperties}
            />
          ))}
          <div className="girl-signal-scan" />
          <div className="girl-signal-noise" />
        </div>

        <div className="girl-signal-meta">
          <span>{activeChannel.index} / 03</span>
          <strong>{activeChannel.label}</strong>
          <i />
        </div>
      </div>

      <div className="girl-signal-caption" aria-atomic="true">
        <span>38</span>
        <p>
          {typedLine || line || "still watching."}
          <i aria-hidden="true" />
        </p>
      </div>
    </aside>
  );
}
