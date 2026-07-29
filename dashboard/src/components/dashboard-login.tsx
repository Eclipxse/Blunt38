"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { useEffect } from "react";

import {
  DotShift,
  ParticleWord
} from "@/components/signal-effects";
import { TextGlitch } from "@/components/text-glitch";
import { signal38 } from "@/components/watcher-38";

export function DashboardLogin({ error }: { error: string | null }) {
  useEffect(() => {
    signal38("context", { mode: "login", silent: true });
    const timer = window.setTimeout(() => signal38("login"), 720);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="minimal-login">
      <div className="login-signal-field" aria-hidden="true">
        <DotShift className="login-dot-shift" color="#aaa2ef" spacing={24} />
        <ParticleWord className="login-particle-word" text="BLUNT38" />
      </div>
      <div className="minimal-login-shade" />
      <header className="minimal-login-brand">
        <img src="/brand/blunt38-logo.jpg" alt="" />
        <span>blunt38</span>
      </header>

      <section className="minimal-login-copy">
        <span className="minimal-eyebrow">Signal 38 / Discord operations</span>
        <h1>
          <TextGlitch text="Bitch, do what you want." />
        </h1>
        <p>
          Your server, your rules. Music, AI, roles, chaos. blunt38 handles the
          boring shit.
        </p>

        {error ? <div className="minimal-login-error">{error}</div> : null}

        <a
          className="minimal-login-button"
          href="/api/auth/login"
          onFocus={() => signal38("connect-hover")}
          onMouseEnter={() => signal38("connect-hover")}
        >
          <LockKeyhole size={17} />
          Let me in
          <ArrowRight size={17} />
        </a>

        <div className="minimal-login-status">
          <span />
          Discord is waiting
        </div>
      </section>
    </main>
  );
}
