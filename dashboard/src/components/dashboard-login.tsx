"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { LiquidPreloader } from "@/components/liquid-preloader";
import {
  DotShift,
  ParticleWord
} from "@/components/signal-effects";
import { TextGlitch } from "@/components/text-glitch";
import { signal38 } from "@/components/watcher-38";

export function DashboardLogin({ error }: { error: string | null }) {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    signal38("context", { mode: "login", silent: true });
    const timer = window.setTimeout(() => signal38("login"), 720);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!booted) return;
    document.documentElement.classList.add("login-hijack-ready");
    return () => document.documentElement.classList.remove("login-hijack-ready");
  }, [booted]);

  const finishBoot = useCallback(() => setBooted(true), []);

  return (
    <main
      className="minimal-login signal-login"
      data-ready={booted}
      inert={!booted}
      aria-busy={!booted}
    >
      <LiquidPreloader onComplete={finishBoot} />
      <div className="login-signal-field" aria-hidden="true">
        <DotShift className="login-dot-shift" color="#b8b8b4" spacing={24} />
        <ParticleWord className="login-particle-word" text="BLUNT38" />
      </div>
      <div className="minimal-login-shade" />
      <header className="minimal-login-brand">
        <img src="/brand/blunt38-logo.jpg" alt="" />
        <span className="login-brand-name">blunt38</span>
        <span className="login-brand-tag">private control</span>
      </header>

      <div className="login-top-status" aria-label="Discord OAuth status">
        <span className="signal-pulse" />
        <span>Discord OAuth / ready</span>
      </div>

      <section className="minimal-login-copy">
        <h1>
          <TextGlitch text="Bitch, do what you want." enableShadows={false} />
        </h1>
        <p>
          Your server, your rules. Music, AI, roles, chaos. blunt38 handles the
          boring shit while you keep the keys.
        </p>

        {error ? (
          <div className="minimal-login-error" role="alert">
            {error}
          </div>
        ) : null}

        <a
          className="minimal-login-button"
          href="/api/auth/login"
          onFocus={() => signal38("connect-hover")}
          onMouseEnter={() => signal38("connect-hover")}
        >
          <LockKeyhole size={17} />
          Let me the fuck in
          <ArrowRight size={17} />
        </a>

        <div className="minimal-login-status">
          <span />
          Discord is waiting. Try not to break anything.
        </div>
      </section>

      <div className="login-channel-note" aria-hidden="true">
        <span>38 / SIGNAL HIJACK</span>
        <i />
        <span>the boring shit ends here</span>
      </div>

      <nav className="login-status-rail" aria-label="blunt38 capabilities">
        <span><i /> music route / armed</span>
        <span><i /> automations / listening</span>
        <span><i /> discord gateway / awake</span>
      </nav>
    </main>
  );
}
