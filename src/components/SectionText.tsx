"use client";

import { Cormorant_Garamond, Space_Grotesk, Press_Start_2P } from "next/font/google";

const cormorant = Cormorant_Garamond({
  weight: ["300", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const spaceG = Space_Grotesk({
  weight: ["300", "400", "600"],
  subsets: ["latin"],
  display: "swap",
});

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// ── Deterministic pseudo-random (avoids React hydration mismatch) ─────────
function pr(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// ── Per-word scatter CSS vars ─────────────────────────────────────────────
// Each word unit gets a unique seed. Enter and exit go to different directions.
type ScatterVars = { [key: string]: string };

function enterVars(seed: number): ScatterVars {
  return {
    "--dx": `${(pr(seed)     * 110 - 55).toFixed(1)}px`,  // ±55px horizontal
    "--dy": `${(-(pr(seed+1) * 55  + 12)).toFixed(1)}px`, // -12 to -67px (from above)
    "--dr": `${(pr(seed+2)   * 22  - 11).toFixed(1)}deg`, // ±11°
  };
}

function exitVars(seed: number): ScatterVars {
  const s = seed + 500;
  return {
    "--ex": `${(pr(s)     * 130 - 65).toFixed(1)}px`, // ±65px
    "--ey": `${(pr(s+1)   * 90  - 30).toFixed(1)}px`, // -30 to +60px (all directions)
    "--er": `${(pr(s+2)   * 26  - 13).toFixed(1)}deg`,
  };
}

function letterEnterVars(idx: number): ScatterVars {
  return {
    "--dx": `${(pr(idx * 3)     * 80  - 40).toFixed(1)}px`,
    "--dy": `${(-(pr(idx*3+1)   * 50  + 12)).toFixed(1)}px`,
    "--dr": `${(pr(idx * 3 + 2) * 28  - 14).toFixed(1)}deg`,
  };
}

function letterExitVars(idx: number): ScatterVars {
  const s = idx + 50;
  return {
    "--ex": `${(pr(s * 3)     * 140 - 70).toFixed(1)}px`,
    "--ey": `${(pr(s * 3 + 1) * 100 - 30).toFixed(1)}px`,
    "--er": `${(pr(s * 3 + 2) * 40  - 20).toFixed(1)}deg`,
  };
}

// ── Animation string helpers ──────────────────────────────────────────────
const ENTER_DUR   = 0.58;  // seconds
const EXIT_DUR    = 0.33;  // seconds (faster — things leave quickly)
const ENTER_EASE  = "cubic-bezier(0.22,1,0.36,1)";
const EXIT_EASE   = "cubic-bezier(0.55,0,0.45,1)";

function scatterIn(delay: number, dur = ENTER_DUR): string {
  return `wordScatterIn ${dur}s ${ENTER_EASE} ${delay.toFixed(3)}s both`;
}
function scatterOut(delay: number, dur = EXIT_DUR): string {
  return `wordScatterOut ${dur}s ${EXIT_EASE} ${delay.toFixed(3)}s forwards`;
}
function letIn(delay: number): string {
  return `letterIn 0.65s ${ENTER_EASE} ${delay.toFixed(3)}s both`;
}
function letOut(delay: number): string {
  return `letterOut ${EXIT_DUR}s ${EXIT_EASE} ${delay.toFixed(3)}s forwards`;
}

// ── PixelLetter ───────────────────────────────────────────────────────────
// Each letter of "pixel" enters with scatter, then sequentially neon-flashes.
// On exit, each letter scatters out in its own direction.
interface PLProps { ch: string; idx: number; isExiting: boolean }

function PixelLetter({ ch, idx, isExiting }: PLProps) {
  const enterDelay = idx * 0.07;
  // pixelFlash starts after all 5 letters have arrived, then staggered per letter
  const flashDelay = 0.65 + 5 * 0.07 + idx * 0.19; // ≈ 1.0s + stagger
  const exitDelay  = idx * 0.042;

  const anim = isExiting
    ? letOut(exitDelay)
    : [letIn(enterDelay), `pixelFlash 3s ease-in-out ${flashDelay.toFixed(3)}s infinite`].join(", ");

  return (
    <span
      style={{
        display: "inline-block",
        animation: anim,
        ...(letterEnterVars(idx)),
        ...(letterExitVars(idx)),
      } as React.CSSProperties}
    >
      {ch}
    </span>
  );
}

// ── WordSpan — any non-pixel word with scatter in/out ────────────────────
interface WSProps {
  children: React.ReactNode;
  seed: number;
  delay: number;
  isExiting: boolean;
  extraStyle?: React.CSSProperties;
}

function WordSpan({ children, seed, delay, isExiting, extraStyle }: WSProps) {
  const exitDelay = delay * 0.45; // exit stagger slightly tighter than entrance
  const anim = isExiting ? scatterOut(exitDelay) : scatterIn(delay);
  return (
    <span
      style={{
        display: "inline-block",
        animation: anim,
        ...(enterVars(seed)),
        ...(exitVars(seed)),
        ...extraStyle,
      } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

// ── Public component ──────────────────────────────────────────────────────
export interface SectionTextProps {
  sectionIdx: number;
  isExiting: boolean;
}

export default function SectionText({ sectionIdx, isExiting }: SectionTextProps) {
  const shared: React.CSSProperties = {
    lineHeight: 1.08,
    maxWidth: "18ch",
    textShadow: "0 2px 40px rgba(4,4,8,0.6)",
  };

  // ── Section 0: Every [pixel] has a purpose. ──────────────────────────────
  if (sectionIdx === 0) {
    return (
      <div
        style={{
          ...shared,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          columnGap: "0.28em",
          rowGap: "0.18em",
          fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
        }}
      >
        {/* "Every" */}
        <WordSpan seed={1} delay={0} isExiting={isExiting}
          extraStyle={{ fontFamily: spaceG.style.fontFamily, fontWeight: 300, color: "rgba(240,237,230,0.5)" }}>
          Every
        </WordSpan>

        {/* "pixel" — letter-by-letter with sequential neon flash */}
        <span
          className={pixelFont.className}
          style={{
            fontSize: "clamp(1.35rem, 3.6vw, 3.1rem)",
            letterSpacing: "0.04em",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.03em",
          }}
        >
          {"pixel".split("").map((ch, i) => (
            <PixelLetter key={i} ch={ch} idx={i} isExiting={isExiting} />
          ))}
        </span>

        {/* "has a" */}
        <WordSpan seed={2} delay={0.30} isExiting={isExiting}
          extraStyle={{ fontFamily: spaceG.style.fontFamily, fontWeight: 300, color: "rgba(240,237,230,0.45)" }}>
          has a
        </WordSpan>

        {/* "purpose." — Cormorant italic, glow pulse after entrance */}
        <WordSpan seed={3} delay={0.45} isExiting={isExiting}
          extraStyle={{
            fontFamily: cormorant.style.fontFamily,
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: "clamp(2.3rem, 6vw, 5rem)",
            color: "#F0EDE6",
            // glow pulse chains after scatter-in settles
            animationName: isExiting ? "wordScatterOut" : "wordScatterIn, glowPulse",
            animationDuration: isExiting ? `${EXIT_DUR}s` : `${ENTER_DUR}s, 3.8s`,
            animationTimingFunction: isExiting ? EXIT_EASE : `${ENTER_EASE}, ease-in-out`,
            animationDelay: isExiting ? `${(0.45 * 0.45).toFixed(3)}s` : `0.45s, 1.3s`,
            animationFillMode: isExiting ? "forwards" : "both, none",
            animationIterationCount: isExiting ? "1" : "1, infinite",
          }}>
          purpose.
        </WordSpan>
      </div>
    );
  }

  // ── Section 1: Every [project,] a reason. ────────────────────────────────
  if (sectionIdx === 1) {
    return (
      <div
        style={{
          ...shared,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          columnGap: "0.28em",
          rowGap: "0.18em",
          fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
        }}
      >
        {/* "Every" */}
        <WordSpan seed={11} delay={0} isExiting={isExiting}
          extraStyle={{ fontFamily: spaceG.style.fontFamily, fontWeight: 300, color: "rgba(240,237,230,0.5)" }}>
          Every
        </WordSpan>

        {/* "project," — Cormorant italic, colorCycle after entrance */}
        <WordSpan seed={12} delay={0.12} isExiting={isExiting}
          extraStyle={{
            fontFamily: cormorant.style.fontFamily,
            fontWeight: 500,
            fontStyle: "italic",
            fontSize: "clamp(2.3rem, 6vw, 5rem)",
            color: "#FF6B9D",
            animationName: isExiting ? "wordScatterOut" : "wordScatterIn, colorCycle",
            animationDuration: isExiting ? `${EXIT_DUR}s` : `${ENTER_DUR}s, 4.2s`,
            animationTimingFunction: isExiting ? EXIT_EASE : `${ENTER_EASE}, ease-in-out`,
            animationDelay: isExiting ? `${(0.12 * 0.45).toFixed(3)}s` : `0.12s, 0.9s`,
            animationFillMode: isExiting ? "forwards" : "both, none",
            animationIterationCount: isExiting ? "1" : "1, infinite",
          }}>
          project,
        </WordSpan>

        {/* "a" */}
        <WordSpan seed={13} delay={0.28} isExiting={isExiting}
          extraStyle={{ fontFamily: spaceG.style.fontFamily, fontWeight: 300, color: "rgba(240,237,230,0.45)" }}>
          a
        </WordSpan>

        {/* "reason." — Space Grotesk 600, letter-spacing breathe */}
        <WordSpan seed={14} delay={0.42} isExiting={isExiting}
          extraStyle={{
            fontFamily: spaceG.style.fontFamily,
            fontWeight: 600,
            color: "#F0EDE6",
            animationName: isExiting ? "wordScatterOut" : "wordScatterIn, letterDrift",
            animationDuration: isExiting ? `${EXIT_DUR}s` : `${ENTER_DUR}s, 5s`,
            animationTimingFunction: isExiting ? EXIT_EASE : `${ENTER_EASE}, ease-in-out`,
            animationDelay: isExiting ? `${(0.42 * 0.45).toFixed(3)}s` : `0.42s, 1.1s`,
            animationFillMode: isExiting ? "forwards" : "both, none",
            animationIterationCount: isExiting ? "1" : "1, infinite",
          }}>
          reason.
        </WordSpan>
      </div>
    );
  }

  // ── Section 2: This is the [work.] ───────────────────────────────────────
  return (
    <div style={{ ...shared, fontSize: "clamp(2rem, 5.5vw, 4.5rem)" }}>
      {/* "This is the" */}
      <div style={{ marginBottom: "0.06em" }}>
        <WordSpan seed={21} delay={0} isExiting={isExiting}
          extraStyle={{ fontFamily: spaceG.style.fontFamily, fontWeight: 300, color: "rgba(240,237,230,0.45)" }}>
          This is the
        </WordSpan>
      </div>

      {/* "work." — oversized Cormorant italic, lime glow + float */}
      <div>
        <span
          style={{
            fontFamily: cormorant.style.fontFamily,
            fontWeight: 500,
            fontStyle: "italic",
            fontSize: "clamp(3.2rem, 9vw, 7.5rem)",
            color: "#C8FF00",
            display: "inline-block",
            lineHeight: 0.95,
            ...(enterVars(22)),
            ...(exitVars(22)),
            animationName: isExiting
              ? "wordScatterOut"
              : "wordScatterIn, limeGlowPulse, wordFloat",
            animationDuration: isExiting
              ? `${EXIT_DUR}s`
              : `${ENTER_DUR}s, 3s, 4.2s`,
            animationTimingFunction: isExiting
              ? EXIT_EASE
              : `${ENTER_EASE}, ease-in-out, ease-in-out`,
            animationDelay: isExiting
              ? `${(0.18 * 0.45).toFixed(3)}s`
              : `0.18s, 1.1s, 1.1s`,
            animationFillMode: isExiting ? "forwards" : "both, none, none",
            animationIterationCount: isExiting ? "1" : "1, infinite, infinite",
          } as React.CSSProperties}
        >
          work.
        </span>
      </div>
    </div>
  );
}
