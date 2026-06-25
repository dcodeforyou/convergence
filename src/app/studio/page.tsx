"use client";

import { useEffect, useRef, useState } from "react";
import { Press_Start_2P } from "next/font/google";

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

// ── Card data ─────────────────────────────────────────────────────────────────
const CARDS = [
  {
    index: "01", title: "Helix", category: "Brand Identity", year: "2024",
    desc: "A complete visual system for a biotech startup. Typography-first identity built around transformation and growth.",
    tags: ["Identity", "Motion", "Web"],   accent: "#C8FF00",
  },
  {
    index: "02", title: "Apex Motion", category: "Animation Studio", year: "2024",
    desc: "Title sequences and motion graphics for a production house. Cinematic dark palette, frame-perfect timing.",
    tags: ["Motion", "Film", "VFX"],       accent: "#FF6B9D",
  },
  {
    index: "03", title: "Cipher Dark", category: "Digital Experience", year: "2023",
    desc: "Scroll-driven narrative for a cybersecurity firm. Live data visualization meets editorial precision.",
    tags: ["Web", "UX", "Data"],           accent: "#FFE566",
  },
  {
    index: "04", title: "Void Signal", category: "Installation", year: "2023",
    desc: "Interactive light installation responding to ambient sound. 2 400 addressable LED nodes, real-time processing.",
    tags: ["Installation", "Hardware"],    accent: "#C8FF00",
  },
] as const;

// ── Scroll layout ─────────────────────────────────────────────────────────────
const INTRO_VH = 55;
const ZONE_VH  = 130;   // scroll height per card
const TOTAL_VH = INTRO_VH + CARDS.length * ZONE_VH + 80;

// peek offset: how far right the card starts so only ~10% is visible
// = vw/2 + cardW * 0.40  (derived from: card_left = vw - 0.1*cardW)
function peekOffset(vw: number, cardW: number) {
  return vw / 2 + cardW * 0.40;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type CardDOMState = {
  transform: string;
  transformOrigin: string;
  opacity: string;
  visibility: string;
};

function computeCard(
  scrollVH: number,
  idx: number,
  peekPx: number
): CardDOMState {
  // card is "at rest" (fully visible) at the center of its zone
  const zoneCenter = INTRO_VH + idx * ZONE_VH + ZONE_VH * 0.5;
  const half       = ZONE_VH * 0.52;
  const localP     = (scrollVH - zoneCenter) / half; // -2…+2

  if (localP < -2 || localP > 1.6) {
    return { transform: "none", transformOrigin: "center bottom", opacity: "0", visibility: "hidden" };
  }

  if (localP <= 0) {
    // ── ENTERING from bottom-right ──
    // t = 0 → far below (peeking), t = 1 → at rest
    const raw = (localP + 2) / 2;         // 0…1 over the entry window
    const t   = Math.max(0, Math.min(raw, 1));
    const e   = easeInOutCubic(t);

    const tx    = (1 - e) * peekPx;       // translate right → center
    const rxDeg = (1 - e) * 62;           // rotateX 62° (lying down) → 0° (facing viewer)
    const sc    = 0.78 + e * 0.22;
    const op    = Math.min(e * 2.2, 1);   // quick fade-in

    return {
      transform:       `perspective(1100px) translateX(${tx.toFixed(1)}px) rotateX(${rxDeg.toFixed(2)}deg) scale(${sc.toFixed(3)})`,
      transformOrigin: "center bottom",   // card rises from its bottom edge
      opacity:         Math.max(0, op).toFixed(3),
      visibility:      "visible",
    };
  } else {
    // ── EXITING upward ──
    // t = 0 → at rest, t = 1 → fully gone above
    const t = Math.min(localP, 1);
    const e = t * t * (3 - 2 * t);        // smoothstep

    const rxDeg = -e * 60;               // 0° → -60° (tips backward, goes up)
    const sc    = 1 - e * 0.1;
    const op    = Math.max(0, 1 - e * 1.4);

    return {
      transform:       `perspective(1100px) rotateX(${rxDeg.toFixed(2)}deg) scale(${sc.toFixed(3)})`,
      transformOrigin: "center top",     // pivots from its top edge going away/upward
      opacity:         op.toFixed(3),
      visibility:      "visible",
    };
  }
}

// ── Hex RGB helper ────────────────────────────────────────────────────────────
function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const cardRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const peekRef       = useRef(0);
  const [activeDot,   setActiveDot]  = useState(0);
  const lastDotRef    = useRef(0);

  // ── Card scroll drive (direct DOM, no re-renders) ──────────────────────────
  useEffect(() => {
    const onResize = () => {
      const vw = window.innerWidth;
      const cw = Math.min(680, vw * 0.90);
      peekRef.current = peekOffset(vw, cw);
    };
    onResize();
    window.addEventListener("resize", onResize);

    const onScroll = () => {
      const vh = window.innerHeight / 100;
      const scrollVH = window.scrollY / vh;

      for (let i = 0; i < CARDS.length; i++) {
        const el = cardRefs.current[i]; if (!el) continue;
        const s  = computeCard(scrollVH, i, peekRef.current);
        el.style.transform       = s.transform;
        el.style.transformOrigin = s.transformOrigin;
        el.style.opacity         = s.opacity;
        el.style.visibility      = s.visibility;
      }

      // update active dot indicator (low-cost: only when it changes)
      const half = ZONE_VH * 0.52;
      let dot = lastDotRef.current;
      for (let i = 0; i < CARDS.length; i++) {
        const lp = (scrollVH - (INTRO_VH + i * ZONE_VH + ZONE_VH * 0.5)) / half;
        if (lp >= -0.5 && lp <= 0.7) { dot = i; break; }
      }
      if (dot !== lastDotRef.current) { lastDotRef.current = dot; setActiveDot(dot); }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div ref={containerRef} style={{ height: `${TOTAL_VH}vh`, backgroundColor: "#040408" }}>
      <div className="sticky top-0 w-full h-screen overflow-hidden">

        {/* Background: final frame */}
        <div className="absolute inset-0" style={{
          backgroundImage: "url(/frames/frame_20.webp)",
          backgroundSize: "cover", backgroundPosition: "center",
        }} />

        {/* Dark overlay */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 60% 50%, rgba(4,4,8,0.52) 0%, rgba(4,4,8,0.82) 100%)",
        }} />

        {/* ── Card slot (one per card, positioned absolutely) ── */}
        {CARDS.map((card, i) => (
          <div
            key={card.index}
            ref={el => { cardRefs.current[i] = el; }}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              // initial states set by computeCard on first scroll tick
              opacity: i === 0 ? "1" : "0",
              visibility: i === 0 ? "visible" : "hidden",
              transformOrigin: "center bottom",
              willChange: "transform, opacity",
            }}
          >
            <GlassCard card={card} pixelClass={pixel.className} />
          </div>
        ))}

        {/* ── Section label (top-left) ── */}
        <div className="absolute pointer-events-none" style={{ top: "9vh", left: "6vw" }}>
          <p className={`${pixel.className} text-xs`} style={{
            color: "#C8FF00", letterSpacing: "0.22em",
            textShadow: "0 0 10px #C8FF00, 0 0 22px rgba(200,255,0,0.4)",
          }}>
            Studio
          </p>
          <p className="font-light mt-3" style={{
            color: "rgba(240,237,230,0.38)", fontSize: "clamp(0.7rem, 1.4vw, 0.9rem)", letterSpacing: "0.05em",
          }}>
            Selected work
          </p>
        </div>

        {/* ── Progress dots (right) ── */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none" style={{ gap: 0 }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: "50%", width: 1,
            transform: "translateX(-50%)",
            background: "linear-gradient(to bottom, transparent, rgba(200,255,0,0.18) 20%, rgba(200,255,0,0.18) 80%, transparent)",
          }} />
          {CARDS.map((_, i) => (
            <div key={i} className="relative flex items-center justify-center" style={{ width: 20, height: 20 }}>
              {i === activeDot && (
                <div style={{
                  position: "absolute", width: 7, height: 7, borderRadius: "50%",
                  border: "1px solid #C8FF00", animation: "dotPing 1.6s ease-out infinite",
                }} />
              )}
              <div style={{
                width:  i === activeDot ? 7 : 4,
                height: i === activeDot ? 7 : 4,
                borderRadius: "50%",
                backgroundColor: i === activeDot ? "#C8FF00" : "rgba(200,255,0,0.28)",
                transition: "all 0.3s ease",
                boxShadow: i === activeDot ? "0 0 8px #C8FF00" : "none",
              }} />
            </div>
          ))}
        </div>

        {/* ── Scroll hint ── */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none pb-1">
          <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(200,255,0,0.55)" }}>scroll</span>
          <div className="relative" style={{ width: 1, height: 46 }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(200,255,0,0.5), rgba(200,255,0,0.06))" }} />
            <div style={{
              position: "absolute", left: "50%", top: 0,
              width: 3, height: 3, borderRadius: "50%",
              backgroundColor: "#C8FF00", boxShadow: "0 0 6px #C8FF00",
              transform: "translateX(-50%)",
              animation: "scrollDot 2.2s ease-in-out infinite",
            }} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Glass card ────────────────────────────────────────────────────────────────
function GlassCard({ card, pixelClass }: { card: (typeof CARDS)[number]; pixelClass: string }) {
  const { index, title, category, year, desc, tags, accent } = card;
  const rgb = hexRgb(accent);

  return (
    <div style={{
      width: "min(680px, 90vw)",
      background: "rgba(4,4,8,0.38)",
      backdropFilter: "blur(32px) saturate(1.8)",
      WebkitBackdropFilter: "blur(32px) saturate(1.8)",
      border: `1px solid rgba(${rgb},0.22)`,
      borderRadius: 18,
      padding: "clamp(28px, 4.5vw, 52px)",
      boxShadow: `0 8px 60px rgba(4,4,8,0.5), 0 0 0 0.5px rgba(${rgb},0.1), inset 0 1px 0 rgba(255,255,255,0.07)`,
    }}>
      {/* Number + year */}
      <div className="flex items-baseline justify-between" style={{ marginBottom: "1.4em" }}>
        <span className={pixelClass} style={{
          fontSize: 9, color: accent, letterSpacing: "0.18em",
          textShadow: `0 0 10px ${accent}, 0 0 22px ${accent}66`,
        }}>{index}</span>
        <span style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(240,237,230,0.32)" }}>{year}</span>
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: "clamp(2.4rem, 5.5vw, 4rem)", lineHeight: 0.94,
        fontWeight: 300, letterSpacing: "-0.025em",
        color: "#F0EDE6", marginBottom: "0.5em",
        textShadow: "0 0 50px rgba(240,237,230,0.18)",
      }}>{title}</h2>

      {/* Category */}
      <p className={pixelClass} style={{
        fontSize: 8, color: "rgba(240,237,230,0.42)", letterSpacing: "0.16em",
        textTransform: "uppercase", marginBottom: "1.5em",
      }}>{category}</p>

      {/* Divider */}
      <div style={{ height: 1, background: `linear-gradient(to right, rgba(${rgb},0.35), transparent)`, marginBottom: "1.5em" }} />

      {/* Description */}
      <p style={{
        fontSize: "clamp(0.8rem, 1.35vw, 0.94rem)", lineHeight: 1.75,
        color: "rgba(240,237,230,0.58)", letterSpacing: "0.01em",
        marginBottom: "1.8em",
      }}>{desc}</p>

      {/* Tags + CTA */}
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {tags.map(t => (
            <span key={t} style={{
              fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase",
              padding: "4px 11px", borderRadius: 4,
              border: `1px solid rgba(${rgb},0.22)`,
              color: "rgba(240,237,230,0.4)",
            }}>{t}</span>
          ))}
        </div>
        <span className={pixelClass} style={{
          fontSize: 8, color: accent, letterSpacing: "0.14em",
          textShadow: `0 0 8px ${accent}`, cursor: "pointer",
        }}>View →</span>
      </div>
    </div>
  );
}
