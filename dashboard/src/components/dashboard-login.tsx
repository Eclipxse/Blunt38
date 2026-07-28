"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";

import {
  AsciiBanner,
  DotShift,
  ParticleWord
} from "@/components/signal-effects";

export function DashboardLogin({ error }: { error: string | null }) {
  return (
    <main className="minimal-login">
      <div className="login-signal-field" aria-hidden="true">
        <DotShift className="login-dot-shift" color="#aaa2ef" spacing={24} />
        <AsciiBanner className="login-ascii-banner" />
        <ParticleWord className="login-particle-word" text="BLUNT38" />
      </div>
      <div className="minimal-login-shade" />
      <header className="minimal-login-brand">
        <img src="/brand/blunt38-logo.jpg" alt="" />
        <span>blunt38</span>
      </header>

      <section className="minimal-login-copy">
        <span className="minimal-eyebrow">Signal 38 / Discord operations</span>
        <h1>Control your server.</h1>
        <p>
          Configure the bot, keep automations tidy, and publish every change from
          one quiet place.
        </p>

        {error ? <div className="minimal-login-error">{error}</div> : null}

        <a className="minimal-login-button" href="/api/auth/login">
          <LockKeyhole size={17} />
          Connect Discord
          <ArrowRight size={17} />
        </a>

        <div className="minimal-login-status">
          <span />
          OAuth ready
        </div>
      </section>
    </main>
  );
}
