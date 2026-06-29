"use client";

import { useEffect, useRef, useState } from "react";
import { Press_Start_2P } from "next/font/google";
import SectionText from "./SectionText";

const pixelFont = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  cw: number,
  ch: number,
) {
  const vw    = video.videoWidth  || cw;
  const vh    = video.videoHeight || ch;
  const scale = Math.max(cw / vw, ch / vh);
  const dw    = vw * scale;
  const dh    = vh * scale;
  ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

export default function VideoScroll() {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  const ticking    = useRef(false);
  const prevSecRef = useRef(0);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [videoReady, setVideoReady] = useState(false);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [isExiting,  setIsExiting]  = useState(false);

  // ── Canvas resize ────────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Frame rendering via requestVideoFrameCallback (rVFC) ────────────────────
  // rVFC fires exactly when a newly decoded frame is ready — no stale draws,
  // no blank frames between keyframes. Falls back to RAF for older browsers.
  useEffect(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // alpha:false = no per-pixel alpha compositing → faster GPU blit
    // desynchronized:true = canvas updates decouple from page frame budget → lower latency
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";

    let rVFCHandle: number | null = null;
    let rafHandle:  number | null = null;
    let active = true;

    const draw = () => {
      if (!active || video.readyState < 2) return;
      const cw = canvas.width, ch = canvas.height;
      ctx.fillStyle = "#040408";
      ctx.fillRect(0, 0, cw, ch);
      drawCover(ctx, video, cw, ch);
    };

    const hasRVFC = "requestVideoFrameCallback" in video;

    if (hasRVFC) {
      // rVFC path: draw only when the browser signals a new decoded frame
      const onFrame = () => {
        draw();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rVFCHandle = (video as any).requestVideoFrameCallback(onFrame);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rVFCHandle = (video as any).requestVideoFrameCallback(onFrame);
    } else {
      // RAF fallback for browsers without rVFC (Safari < 15.4, Firefox < 132)
      const loop = () => {
        if (!active) return;
        draw();
        rafHandle = requestAnimationFrame(loop);
      };
      rafHandle = requestAnimationFrame(loop);
    }

    const onReady = () => setVideoReady(true);
    video.addEventListener("canplaythrough", onReady);
    if (video.readyState >= 4) onReady();

    return () => {
      active = false;
      video.removeEventListener("canplaythrough", onReady);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (rVFCHandle !== null) (video as any).cancelVideoFrameCallback(rVFCHandle);
      if (rafHandle  !== null) cancelAnimationFrame(rafHandle);
    };
  }, []);

  // ── Scroll → currentTime + section detection ─────────────────────────────────
  useEffect(() => {
    const video      = videoRef.current;
    const scrollHint = scrollHintRef.current;

    const update = () => {
      const scrollH = document.body.scrollHeight - window.innerHeight;
      const f = scrollH > 0 ? Math.min(Math.max(window.scrollY / scrollH, 0), 1) : 0;

      // Direct seek — no lerp
      if (video && video.duration) {
        video.currentTime = f * video.duration;
      }

      // Scroll hint fade via direct DOM write — no React re-render
      if (scrollHint) {
        scrollHint.style.opacity = f < 0.05 ? String(1 - f / 0.05) : "0";
      }

      // Section: three equal thirds
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

    // RAF debounce — one update per frame, no matter how many scroll events fire
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
  }, []);

  return (
    <>
      {/* Scroll space: 500vh */}
      <div style={{ height: "500vh" }} />

      {/* Hidden video — decode engine only, never painted directly */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        style={{ display: "none" }}
      >
        <source src="/scroll-video.mp4" type="video/mp4" />
      </video>

      {/* Canvas — receives decoded frames via rVFC, GPU-composited */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw", height: "100vh",
          zIndex: 0,
          backgroundColor: "#040408",
          opacity: videoReady ? 1 : 0,
          transition: "opacity 0.7s ease",
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
      {videoReady && (
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
      {videoReady && (
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

      {/* Scroll hint — only on section 0, opacity via DOM ref */}
      {videoReady && sectionIdx === 0 && (
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
                left: "50%",
                top: 0,
                width: 3,
                height: 3,
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

      {/* Loading screen */}
      {!videoReady && (
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
                  top: 0,
                  height: "100%",
                  width: "60%",
                  backgroundColor: "#C8FF00",
                  boxShadow: "0 0 10px #C8FF00, 0 0 20px rgba(200,255,0,0.4)",
                  animation: "loadingBar 1.4s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
