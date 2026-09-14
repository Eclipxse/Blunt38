"use client";

import { forwardRef, useId } from "react";
import styles from "./dashboard-login.module.css";

const WAVE = "M-400 0 C-350 -22 -300 -22 -250 0 S-150 22 -100 0 S0 -22 50 0 S150 22 200 0 S300 -22 350 0 S450 22 500 0 S600 -22 650 0 S750 22 800 0 S900 -22 950 0 S1050 22 1100 0 S1200 -22 1250 0 S1350 22 1400 0 L1400 500 L-400 500 Z";

// Shared glyph geometry keeps the intro-to-masthead handoff registered.
export const LiquidWordmark = forwardRef<SVGSVGElement, { liquid?: boolean; className?: string }>(
  function LiquidWordmark({ liquid = false, className = "" }, ref) {
    const id = useId().replaceAll(":", "");
    const wordId = `word-${id}`;
    const waterId = `water-${id}`;
    const glyph = <text x="500" y="213" textAnchor="middle" textLength="980" lengthAdjust="spacingAndGlyphs">BLUNT38</text>;

    return (
      <svg ref={ref} className={`${styles.wordArt} ${className}`} viewBox="0 0 1000 240" aria-hidden="true" data-liquid={liquid}>
        {liquid ? <>
          <defs>
            <clipPath id={wordId}>{glyph}</clipPath>
            <clipPath id={waterId}>
              <g className={styles.waterRise}><path className={styles.waveFront} d={WAVE} /></g>
            </clipPath>
          </defs>
          <g className={styles.emptyWord}>{glyph}</g>
          <g clipPath={`url(#${wordId})`}>
            <g className={styles.waterRise}>
              <path className={styles.waveBack} d={WAVE} />
              <path className={styles.waveFront} d={WAVE} />
            </g>
            <g clipPath={`url(#${waterId})`} className={styles.bubbles}>
              {[84, 238, 405, 561, 731, 899].map((x, index) => (
                <circle key={x} cx={x} cy="245" r={index % 2 === 0 ? 3 : 5} style={{ animationDelay: `${index * 170}ms` }} />
              ))}
            </g>
          </g>
        </> : glyph}
      </svg>
    );
  }
);
