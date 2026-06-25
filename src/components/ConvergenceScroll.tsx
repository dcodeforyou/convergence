"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Press_Start_2P } from "next/font/google";
import SectionText from "./SectionText";

const pixelFont = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

const TOTAL_FRAMES  = 20;
const SCROLL_HEIGHT = "280vh";

const SECTIONS = [
  { start: 0,  end: 5,  text: "Every pixel has a purpose.", sub: null  },
  { start: 6,  end: 13, text: "Every project, a reason.",   sub: null  },
  { start: 14, end: 19, text: "This is the work.",          sub: "cta" },
] as const;
type Section = (typeof SECTIONS)[number];

function getSectionForFrame(idx: number): Section {
  return SECTIONS.find((s) => idx >= s.start && idx <= s.end) ?? SECTIONS[0];
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) {
  const scale = Math.max(cw / (img.naturalWidth || cw), ch / (img.naturalHeight || ch));
  const dw    = (img.naturalWidth  || cw) * scale;
  const dh    = (img.naturalHeight || ch) * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

export default function ConvergenceScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const imagesRef    = useRef<HTMLImageElement[]>([]);

  const smoothProgressRef = useRef(0);
  const rawProgressRef    = useRef(0);
  const rafRef            = useRef<number | null>(null);
  const prevSectionRef    = useRef<Section>(SECTIONS[0]);
  const textTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loadedCount,      setLoadedCount]      = useState(0);
  const [allLoaded,        setAllLoaded]         = useState(false);
  const [activeSection,    setActiveSection]     = useState<Section>(SECTIONS[0]);
  const [activeSectionIdx, setActiveSectionIdx]  = useState(0);
  const [sectionExiting,   setSectionExiting]    = useState(false);

  // ── Preload ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const images: HTMLImageElement[] = Array.from({ length: TOTAL_FRAMES });
    let count = 0;
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img  = new Image();
      img.src    = `/frames/frame_${String(i + 1).padStart(2, "0")}.webp`;
      const done = () => { count++; setLoadedCount(count); if (count === TOTAL_FRAMES) setAllLoaded(true); };
      img.onload = done; img.onerror = done;
      images[i]  = img;
    }
    imagesRef.current = images;
  }, []);

  // ── Resize ─────────────────────────────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.width  = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
  }, []);
  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // ── Scroll ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => {
      const el  = containerRef.current; if (!el) return;
      const max = el.scrollHeight - window.innerHeight;
      rawProgressRef.current = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── RAF: frame render + section detection ──────────────────────────────────
  useEffect(() => {
    if (!allLoaded) return;
    let prevTs = 0, active = true;

    const tick = (ts: number) => {
      if (!active) return;
      const dt = Math.min((ts - prevTs) / 1000, 0.05);
      prevTs   = ts;

      // Exponential lerp for butter-smooth scroll
      const sl = 1 - Math.pow(0.01, dt * 6);
      smoothProgressRef.current += (rawProgressRef.current - smoothProgressRef.current) * sl;

      // ── Draw frame ──
      const raw   = smoothProgressRef.current * (TOTAL_FRAMES - 1);
      const fA    = Math.min(Math.floor(raw), TOTAL_FRAMES - 2);
      const blend = raw - fA;
      const mc = canvasRef.current, imgA = imagesRef.current[fA], imgB = imagesRef.current[fA + 1];
      if (mc && imgA && imgB) {
        const ctx = mc.getContext("2d")!;
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
        const cw = mc.width, ch = mc.height;
        ctx.fillStyle = "#040408"; ctx.fillRect(0, 0, cw, ch);
        ctx.globalAlpha = 1;     drawCover(ctx, imgA, cw, ch);
        if (blend > 0.005 && imgB.complete) {
          ctx.globalAlpha = blend; drawCover(ctx, imgB, cw, ch);
          ctx.globalAlpha = 1;
        }
      }

      // ── Section ──
      const si = getSectionForFrame(Math.round(raw));
      if (si !== prevSectionRef.current) {
        prevSectionRef.current = si;
        setSectionExiting(true);
        if (textTimerRef.current) clearTimeout(textTimerRef.current);
        textTimerRef.current = setTimeout(() => {
          setActiveSection(si);
          setActiveSectionIdx(SECTIONS.indexOf(si));
          setSectionExiting(false);
        }, 560);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [allLoaded]);

  const loadProgress = loadedCount / TOTAL_FRAMES;
  const isSection1   = activeSectionIdx === 0;

  return (
    <div ref={containerRef} style={{ height: SCROLL_HEIGHT, backgroundColor: "#040408" }}>
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">

        {/* Frame canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: allLoaded ? 1 : 0, transition: "opacity 0.7s ease" }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at center, transparent 28%, rgba(4,4,8,0.50) 100%), linear-gradient(to top, rgba(4,4,8,0.80) 0%, transparent 42%, rgba(4,4,8,0.26) 100%)",
        }} />

        {/* Loading bar */}
        {!allLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: "#040408" }}>
            <div className="flex flex-col gap-5" style={{ width: 260 }}>
              <div className="text-xs tracking-[0.26em] uppercase"
                style={{ color: "#C8FF00", animation: "pulse 2s ease-in-out infinite" }}>
                Loading
              </div>
              <div className="relative w-full overflow-hidden" style={{ height: 1, backgroundColor: "rgba(200,255,0,0.15)" }}>
                <div className="absolute left-0 top-0 h-full" style={{
                  width: `${loadProgress * 100}%`, backgroundColor: "#C8FF00",
                  boxShadow: "0 0 10px #C8FF00, 0 0 20px rgba(200,255,0,0.4)",
                  transition: "width 0.12s linear",
                }} />
              </div>
              <div className="tabular-nums text-xs font-mono" style={{ color: "rgba(240,237,230,0.3)" }}>
                {String(loadedCount).padStart(2, "0")} / {TOTAL_FRAMES}
              </div>
            </div>
          </div>
        )}

        {/* Section text — word-level scatter in/out */}
        {allLoaded && (
          <div className="absolute inset-0 flex flex-col justify-end pointer-events-none" style={{ padding: "0 6vw 9vh" }}>
            <div>
              <SectionText key={activeSectionIdx} sectionIdx={activeSectionIdx} isExiting={sectionExiting} />
              {activeSection.sub === "cta" && (
                <a
                  href="/studio"
                  className={pixelFont.className}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 28,
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#C8FF00",
                    textDecoration: "none",
                    textShadow: "0 0 8px #C8FF00, 0 0 22px rgba(200,255,0,0.45)",
                    pointerEvents: "auto",
                    animation: "wordIn 0.6s cubic-bezier(0.22,1,0.36,1) 0.5s both",
                  }}
                >
                  Take me to Studio
                  <span style={{ animation: "arrowBounce 1.3s ease-in-out infinite" }}>→</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Section progress dots */}
        {allLoaded && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none" style={{ gap: 0 }}>
            <div style={{
              position: "absolute", top: 0, bottom: 0, left: "50%", width: 1,
              transform: "translateX(-50%)",
              background: "linear-gradient(to bottom, transparent, rgba(200,255,0,0.18) 20%, rgba(200,255,0,0.18) 80%, transparent)",
            }} />
            {SECTIONS.map((_, i) => (
              <div key={i} className="relative flex items-center justify-center" style={{ width: 20, height: 20 }}>
                {i === activeSectionIdx && (
                  <div style={{
                    position: "absolute", width: 7, height: 7, borderRadius: "50%",
                    border: "1px solid #C8FF00",
                    animation: "dotPing 1.6s ease-out infinite",
                  }} />
                )}
                <div style={{
                  width:  i === activeSectionIdx ? 7 : 4,
                  height: i === activeSectionIdx ? 7 : 4,
                  borderRadius: "50%",
                  backgroundColor: i === activeSectionIdx ? "#C8FF00" : "rgba(200,255,0,0.28)",
                  transition: "all 0.35s ease",
                  boxShadow: i === activeSectionIdx ? "0 0 8px #C8FF00, 0 0 16px rgba(200,255,0,0.4)" : "none",
                }} />
              </div>
            ))}
          </div>
        )}

        {/* Scroll hint */}
        {allLoaded && (
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none pb-1"
            style={{ transition: "opacity 0.5s ease", opacity: isSection1 ? 1 : 0 }}
          >
            <span className="text-[10px] tracking-[0.25em] uppercase mb-2"
              style={{ color: "rgba(200,255,0,0.65)" }}>scroll</span>
            <div className="relative" style={{ width: 1, height: 52 }}>
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, rgba(200,255,0,0.55), rgba(200,255,0,0.08))",
              }} />
              <div style={{
                position: "absolute", left: "50%", top: 0,
                width: 3, height: 3, borderRadius: "50%",
                backgroundColor: "#C8FF00",
                boxShadow: "0 0 6px #C8FF00, 0 0 12px rgba(200,255,0,0.5)",
                transform: "translateX(-50%)",
                animation: "scrollDot 2.2s ease-in-out infinite",
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
