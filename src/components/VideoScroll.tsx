"use client";

import { useEffect, useRef, useState } from "react";
import { Press_Start_2P } from "next/font/google";
import SectionText from "./SectionText";

const pixelFont = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

// Number of frames pre-extracted from the video.
// 60 frames over 500vh = ~8vh of scroll per frame, smooth on any device.
const FRAME_COUNT = 60;

function drawCover(
  ctx: CanvasRenderingContext2D,
  src: ImageBitmap,
  cw: number,
  ch: number,
) {
  const scale = Math.max(cw / src.width, ch / src.height);
  const dw    = src.width  * scale;
  const dh    = src.height * scale;
  ctx.drawImage(src, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

export default function VideoScroll() {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  // GPU-resident frames — drawImage from ImageBitmap is near zero cost
  const framesRef  = useRef<ImageBitmap[]>([]);
  const lastIdxRef = useRef(-1);

  const ticking    = useRef(false);
  const prevSecRef = useRef(0);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loadedCount, setLoadedCount] = useState(0);
  const [framesReady, setFramesReady] = useState(false);
  const [sectionIdx,  setSectionIdx]  = useState(0);
  const [isExiting,   setIsExiting]   = useState(false);

  // ── Canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
      lastIdxRef.current = -1; // force redraw after resize
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Frame extraction ───────────────────────────────────────────────────────
  // Seek forward through the video sequentially (fastest decode path for H.264),
  // capture each position as an ImageBitmap (GPU-resident, instant drawImage).
  // After this, scrubbing never touches the video decoder again.
  useEffect(() => {
    let cancelled = false;

    const extract = async () => {
      const video = document.createElement("video");
      video.muted      = true;
      video.playsInline = true;
      video.preload    = "auto";
      video.src        = "/scroll-video.mp4";

      // Wait for metadata so duration is available
      await new Promise<void>(res => {
        if (video.readyState >= 1) { res(); return; }
        video.addEventListener("loadedmetadata", () => res(), { once: true });
      });

      const duration = video.duration;
      const bitmaps: ImageBitmap[] = [];

      for (let i = 0; i < FRAME_COUNT; i++) {
        if (cancelled) return;

        // Always seek forward — fastest decode pattern for H.264
        video.currentTime = (i / (FRAME_COUNT - 1)) * duration;

        await new Promise<void>(res =>
          video.addEventListener("seeked", () => res(), { once: true }),
        );

        // createImageBitmap copies the decoded frame into GPU memory
        const bmp = await createImageBitmap(video);
        bitmaps.push(bmp);

        setLoadedCount(i + 1);

        // Draw first frame to canvas immediately so there's no blank flash
        if (i === 0) {
          const c = canvasRef.current;
          if (c) {
            const ctx = c.getContext("2d", { alpha: false })!;
            ctx.fillStyle = "#040408";
            ctx.fillRect(0, 0, c.width, c.height);
            drawCover(ctx, bmp, c.width, c.height);
          }
        }
      }

      if (cancelled) return;
      framesRef.current = bitmaps;
      video.src = ""; // release video resources
      setFramesReady(true);
    };

    extract();
    return () => { cancelled = true; };
  }, []);

  // ── Scroll → frame index + section detection ──────────────────────────────
  useEffect(() => {
    if (!framesReady) return;

    const canvas     = canvasRef.current;
    const scrollHint = scrollHintRef.current;
    if (!canvas) return;

    // alpha:false = skip per-pixel alpha blend on composite
    // desynchronized:true = draw as soon as ready, not locked to page vsync
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";

    const update = () => {
      const scrollH = document.body.scrollHeight - window.innerHeight;
      const f = scrollH > 0 ? Math.min(Math.max(window.scrollY / scrollH, 0), 1) : 0;

      // Direct index — no decode, no latency
      const idx = Math.min(Math.round(f * (FRAME_COUNT - 1)), FRAME_COUNT - 1);
      const bmp = framesRef.current[idx];

      if (bmp && idx !== lastIdxRef.current) {
        lastIdxRef.current = idx;
        const cw = canvas.width, ch = canvas.height;
        ctx.fillStyle = "#040408";
        ctx.fillRect(0, 0, cw, ch);
        drawCover(ctx, bmp, cw, ch);
      }

      if (scrollHint) {
        scrollHint.style.opacity = f < 0.05 ? String(1 - f / 0.05) : "0";
      }

      const next = f < 0.334 ? 0 : f < 0.667 ? 1 : 2;
      if (next !== prevSecRef.current) {
        prevSecRef.current = next;
        setIsExiting(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setSectionIdx(next);
          setIsExiting(false);
        }, 560);
      }

      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [framesReady]);

  return (
    <>
      {/* Scroll space */}
      <div style={{ height: "500vh" }} />

      {/* Canvas — only output surface, no video element visible */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw", height: "100vh",
          zIndex: 0,
          backgroundColor: "#040408",
          opacity: framesReady ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      />

      {/* Vignette */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 28%, rgba(4,4,8,0.50) 100%), " +
            "linear-gradient(to top, rgba(4,4,8,0.80) 0%, transparent 42%, rgba(4,4,8,0.26) 100%)",
        }}
      />

      {/* Section text */}
      {framesReady && (
        <div
          style={{
            position: "fixed",
            bottom: "15vh",
            left: "8%",
            maxWidth: "calc(100vw - 16%)",
            zIndex: 2,
            pointerEvents: "none",
            willChange: "transform, opacity",
          }}
        >
          <SectionText key={sectionIdx} sectionIdx={sectionIdx} isExiting={isExiting} />

          {sectionIdx === 2 && !isExiting && (
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
      )}

      {/* Section progress dots */}
      {framesReady && (
        <div
          style={{
            position: "fixed",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0, bottom: 0, left: "50%",
              width: 1,
              transform: "translateX(-50%)",
              background:
                "linear-gradient(to bottom, transparent, rgba(200,255,0,0.18) 20%, rgba(200,255,0,0.18) 80%, transparent)",
            }}
          />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
              }}
            >
              {i === sectionIdx && (
                <div
                  style={{
                    position: "absolute",
                    width: 7, height: 7,
                    borderRadius: "50%",
                    border: "1px solid #C8FF00",
                    animation: "dotPing 1.6s ease-out infinite",
                  }}
                />
              )}
              <div
                style={{
                  width:           i === sectionIdx ? 7 : 4,
                  height:          i === sectionIdx ? 7 : 4,
                  borderRadius:    "50%",
                  backgroundColor: i === sectionIdx ? "#C8FF00" : "rgba(200,255,0,0.28)",
                  transition:      "all 0.35s ease",
                  boxShadow:       i === sectionIdx
                    ? "0 0 8px #C8FF00, 0 0 16px rgba(200,255,0,0.4)"
                    : "none",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Scroll hint — section 0 only, opacity via DOM ref */}
      {framesReady && sectionIdx === 0 && (
        <div
          ref={scrollHintRef}
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingBottom: 4,
            pointerEvents: "none",
            willChange: "opacity",
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(200,255,0,0.65)",
              marginBottom: 8,
            }}
          >
            scroll
          </span>
          <div style={{ position: "relative", width: 1, height: 52 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, rgba(200,255,0,0.55), rgba(200,255,0,0.08))",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%", top: 0,
                width: 3, height: 3,
                borderRadius: "50%",
                backgroundColor: "#C8FF00",
                boxShadow: "0 0 6px #C8FF00, 0 0 12px rgba(200,255,0,0.5)",
                transform: "translateX(-50%)",
                animation: "scrollDot 2.2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      )}

      {/* Loading screen with real frame extraction progress */}
      {!framesReady && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10,
            backgroundColor: "#040408",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "#C8FF00",
                animation: "loadingPulse 1.8s ease-in-out infinite",
              }}
            >
              Loading
            </div>
            <div
              style={{
                height: 1,
                backgroundColor: "rgba(200,255,0,0.15)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0, top: 0,
                  height: "100%",
                  width: `${(loadedCount / FRAME_COUNT) * 100}%`,
                  backgroundColor: "#C8FF00",
                  boxShadow: "0 0 10px #C8FF00, 0 0 20px rgba(200,255,0,0.4)",
                  transition: "width 0.1s linear",
                }}
              />
            </div>
            <div
              className="tabular-nums text-xs font-mono"
              style={{ color: "rgba(240,237,230,0.3)" }}
            >
              {String(loadedCount).padStart(2, "0")} / {FRAME_COUNT}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
