"use client";

import { ArrowUpRight, AudioLines, Bot, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LiquidPreloader } from "@/components/liquid-preloader";
import { LiquidWordmark } from "@/components/liquid-wordmark";
import { signal38 } from "@/components/watcher-38";
import styles from "./dashboard-login.module.css";

const CAPABILITIES = [
  { name: "Music", icon: AudioLines, title: "Good music. Zero committee.", copy: "Queue tracks, build playlists, and take over the voice channel.", detail: "Music & playlists" },
  { name: "AI", icon: Bot, title: "Let the bot do the talking.", copy: "Configure AI replies and give your server a voice of its own.", detail: "AI replies & automations" },
  { name: "Server", icon: ShieldCheck, title: "Your rules. Actually enforced.", copy: "Manage roles, tickets, levels, and moderation without the busywork.", detail: "Roles & moderation" }
] as const;

export function DashboardLogin({ error }: { error: string | null }) {
  const [booted, setBooted] = useState(false);
  const [introRun, setIntroRun] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const loginRef = useRef<HTMLAnchorElement>(null);
  const markRef = useRef<SVGSVGElement>(null);
  const focusAfterBoot = useRef(false);

  useEffect(() => {
    signal38("context", { mode: "login", silent: true });
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!booted) return;
    document.documentElement.classList.add("login-hijack-ready");
    signal38("login");
    if (focusAfterBoot.current) loginRef.current?.focus({ preventScroll: true });
    return () => document.documentElement.classList.remove("login-hijack-ready");
  }, [booted]);

  const finishBoot = useCallback((restoreFocus = false) => {
    focusAfterBoot.current = restoreFocus;
    setBooted(true);
  }, []);

  function replayIntro() {
    focusAfterBoot.current = true;
    setBooted(false);
    setIntroRun((run) => run + 1);
  }

  return (
    <>
      <LiquidPreloader key={introRun} onComplete={finishBoot} skip={Boolean(error) && introRun === 0} replay={introRun > 0} destinationRef={markRef} />
      <main className={styles.page} data-ready={booted} inert={!booted} aria-busy={!booted}>
        <a className={styles.skipLink} href="#login-entry">Skip to Discord sign-in</a>
        <header className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.brand} role="img" aria-label="blunt38"><LiquidWordmark ref={markRef} /></div>
            <span className={styles.identityCaption}>Discord control panel</span>
          </div>
          <nav className={styles.navigation} aria-label="Landing page">
            <a href="#capabilities">What it does</a>
            <button className={styles.replay} onClick={replayIntro} disabled={reducedMotion} title={reducedMotion ? "Intro disabled by your reduced-motion preference" : undefined}><RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" /><span>Replay intro</span></button>
          </nav>
        </header>

        <section className={styles.takeover} aria-labelledby="login-heading">
          <h1 id="login-heading" className={styles.takeoverTitle}>
            <span className={styles.titleFirst}>Your server.</span>
            <span className={styles.titleSecond}>Your rules.</span>
          </h1>
          <aside className={styles.watcher} aria-label="The blunt38 watcher">
            <div id="login-watcher-slot" className={styles.watcherSlot} />
            <p>oh. it’s you again.</p>
          </aside>
          <div className={styles.manifesto}>
            <p className={styles.voice}>Bitch, do what you want.</p>
            <p>Music, AI, roles, chaos.<br />We handle the boring shit. You keep the keys.</p>
          </div>
          <div className={styles.entry}>
            {error && <div className={styles.error} role="alert"><strong>Couldn’t get you in.</strong><span>{error}</span><span>Try Discord sign-in again below.</span></div>}
            <a id="login-entry" ref={loginRef} className={styles.loginButton} href="/api/auth/login" onFocus={() => signal38("connect-hover")} onMouseEnter={() => signal38("connect-hover")}>
              <span className={styles.buttonCopy}><span className={styles.buttonLabel}>Let me the fuck in</span><span className={styles.buttonDetail}>Continue with Discord</span></span>
              <ArrowUpRight className={styles.entryArrow} size={48} strokeWidth={1.5} aria-hidden="true" />
            </a>
          </div>
        </section>

        <section id="capabilities" className={styles.capabilities} aria-labelledby="capabilities-heading">
          <div className={styles.capabilitiesIntro}><h2 id="capabilities-heading">The boring shit.{" "}<br />Handled.</h2></div>
          <div className={styles.featureList}>
            {CAPABILITIES.map(({ name, icon: Icon, title, copy, detail }, index) => {
              const open = expanded === index;
              const id = `capability-${name.toLowerCase()}`;
              return (
                <div key={name} className={styles.feature} data-expanded={open}>
                  <h3>
                    <button id={`${id}-trigger`} className={styles.featureTrigger} type="button" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setExpanded(open ? null : index)}>
                      <span className={styles.featureName}><Icon size={21} strokeWidth={1.5} aria-hidden="true" />{name}</span>
                      <span className={styles.featureSummary}>{detail}</span>
                      <Plus className={styles.featurePlus} size={23} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={`${id}-body`} className={styles.featureBody} role="region" aria-labelledby={`${id}-trigger`} hidden={!open}>
                    <p className={styles.featureTitle}>{title}</p>
                    <p>{copy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <footer className={styles.footer}><span>Built for your corner of Discord.</span><span>38 reasons. None explained.</span></footer>
      </main>
    </>
  );
}
