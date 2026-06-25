"use client";

import { useEffect, useRef, useCallback } from "react";

// ── Hex membrane constants ────────────────────────────────────────────────────
const HEX_R         = 34;
const HEX_INFLUENCE = HEX_R * 10;
const BASE_ALPHA    = 0.038;
const PEAK_ALPHA    = 0.52;
const PEAK_FILL     = 0.018;
const SHIMMER_AMP   = 0.011;
const SPRING        = 0.14;
const DAMP          = 0.70;
const NUM_PARTICLES = 62;

type Hex   = { cx: number; cy: number };
type Glow  = { drawX: number; drawY: number; r: number; glow: number };
type Ptcl  = { x: number; y: number; vx: number; vy: number; r: number; ba: number; a: number; col: string };
type Burst = { x: number; y: number; startTs: number };

function buildGrid(w: number, h: number): Hex[] {
  const cs = Math.sqrt(3) * HEX_R, rs = HEX_R * 1.5;
  const out: Hex[] = [];
  for (let r = -1; r < Math.ceil(h / rs) + 3; r++)
    for (let c = -1; c < Math.ceil(w / cs) + 3; c++)
      out.push({ cx: c * cs + (r % 2 === 0 ? 0 : cs * 0.5), cy: r * rs });
  return out;
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k - Math.PI / 6;
    k === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
            : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
}

function mkP(w: number, h: number): Ptcl {
  const cols = ["rgba(200,255,0,", "rgba(220,255,100,", "rgba(200,255,0,", "rgba(240,237,230,"];
  const ba   = 0.055 + Math.random() * 0.18;
  return {
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.20,
    vy: -0.035 - Math.random() * 0.12,
    r: 0.6 + Math.random() * 1.8,
    ba, a: ba,
    col: cols[Math.floor(Math.random() * cols.length)],
  };
}

export default function GlobalEffects() {
  const particleRef  = useRef<HTMLCanvasElement>(null);
  const membraneRef  = useRef<HTMLCanvasElement>(null);
  const hexesRef     = useRef<Hex[]>([]);
  const ptclsRef     = useRef<Ptcl[]>([]);
  const rafRef       = useRef<number | null>(null);

  const mouseRawRef    = useRef({ x: -9999, y: -9999 });
  const mouseSmoothRef = useRef({ x: -9999, y: -9999 });
  const mouseVelRef    = useRef({ x: 0, y: 0 });
  const touchBurstsRef = useRef<Burst[]>([]);

  const resize = useCallback(() => {
    const w = window.innerWidth, h = window.innerHeight;
    if (particleRef.current)  { particleRef.current.width  = w; particleRef.current.height  = h; }
    if (membraneRef.current)  { membraneRef.current.width  = w; membraneRef.current.height  = h; }
    hexesRef.current  = buildGrid(w, h);
    ptclsRef.current  = Array.from({ length: NUM_PARTICLES }, () => mkP(w, h));
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  // ── Pointer tracking (mouse + touch) ─────────────────────────────────────────
  useEffect(() => {
    const onMove  = (e: MouseEvent) => { mouseRawRef.current = { x: e.clientX,       y: e.clientY       }; };
    const onLeave = ()               => { mouseRawRef.current = { x: -9999,           y: -9999           }; };
    const onTouch  = (e: TouchEvent) => {
      if (e.touches.length > 0) mouseRawRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTStart = (e: TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        mouseRawRef.current = { x: t.clientX, y: t.clientY };
        touchBurstsRef.current.push({ x: t.clientX, y: t.clientY, startTs: performance.now() });
      }
    };
    const onTEnd   = () => { mouseRawRef.current = { x: -9999, y: -9999 }; };

    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchmove",  onTouch,  { passive: true });
    window.addEventListener("touchstart", onTStart, { passive: true });
    window.addEventListener("touchend",   onTEnd,   { passive: true });
    return () => {
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchmove",  onTouch);
      window.removeEventListener("touchstart", onTStart);
      window.removeEventListener("touchend",   onTEnd);
    };
  }, []);

  // ── Combined RAF: particles + membrane ───────────────────────────────────────
  useEffect(() => {
    let active = true, prevTs = 0;

    const tick = (ts: number) => {
      if (!active) return;
      const dt = Math.min((ts - prevTs) / 16.67, 3);
      prevTs = ts;

      // spring mouse
      const mr = mouseRawRef.current, ms = mouseSmoothRef.current, mv = mouseVelRef.current;
      mv.x = mv.x * DAMP + (mr.x - ms.x) * SPRING;
      mv.y = mv.y * DAMP + (mr.y - ms.y) * SPRING;
      ms.x += mv.x; ms.y += mv.y;
      const speed      = Math.hypot(mv.x, mv.y);
      const speedBoost = Math.min(speed / 22, 1.0);

      // ── particles ──
      const pc = particleRef.current;
      if (pc) {
        const ctx = pc.getContext("2d");
        if (ctx) {
          const w = pc.width, h = pc.height;
          ctx.clearRect(0, 0, w, h);
          for (const p of ptclsRef.current) {
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.x < -4) p.x = w + 4;
            if (p.x > w + 4) p.x = -4;
            if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
            p.a = p.ba * (0.6 + 0.4 * Math.sin(ts * 0.00065 + p.x * 0.022));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `${p.col}${p.a.toFixed(2)})`;
            ctx.fill();
          }
        }
      }

      // ── hex membrane ──
      const mc = membraneRef.current;
      if (mc) {
        const ctx = mc.getContext("2d");
        if (ctx) {
          const cw = mc.width, ch = mc.height;
          ctx.clearRect(0, 0, cw, ch);
          const mx = ms.x, my = ms.y, hexes = hexesRef.current;
          const innerR = HEX_R - 1.8;
          const glowBatch: Glow[] = [];

          ctx.lineWidth = 0.5; ctx.shadowBlur = 0;
          for (const { cx, cy } of hexes) {
            const ddx  = cx - mx, ddy = cy - my;
            const dist = Math.hypot(ddx, ddy);
            const shimmer = Math.sin(ts * 0.00026 + cx * 0.011 + cy * 0.0073) * 0.5 + 0.5;

            if (dist >= HEX_INFLUENCE) {
              hexPath(ctx, cx, cy, innerR);
              ctx.strokeStyle = `rgba(200,255,0,${(BASE_ALPHA + shimmer * SHIMMER_AMP).toFixed(3)})`;
              ctx.stroke(); continue;
            }

            const t   = 1 - dist / HEX_INFLUENCE;
            const glow = t * t * t;
            const total = Math.min(glow + glow * speedBoost * 0.6, 1.0);

            if (total < 0.04) {
              hexPath(ctx, cx, cy, innerR);
              ctx.strokeStyle = `rgba(200,255,0,${(BASE_ALPHA + shimmer * SHIMMER_AMP).toFixed(3)})`;
              ctx.stroke();
            } else {
              const angle = dist > 0.1 ? Math.atan2(ddy, ddx) : 0;
              const push  = total * total * HEX_R * 0.85;
              const drawR = innerR * (1 + total * 0.16);
              glowBatch.push({
                drawX: cx + Math.cos(angle) * push,
                drawY: cy + Math.sin(angle) * push,
                r: drawR, glow: total,
              });
            }
          }

          if (glowBatch.length > 0) {
            ctx.shadowColor = "rgba(200,255,0,1)";
            for (const { drawX, drawY, r, glow } of glowBatch) {
              const sa = BASE_ALPHA + glow * (PEAK_ALPHA - BASE_ALPHA);
              const fa = glow * PEAK_FILL;
              ctx.shadowBlur = glow * 16;
              hexPath(ctx, drawX, drawY, r);
              if (fa > 0.003) { ctx.fillStyle = `rgba(200,255,0,${fa.toFixed(3)})`; ctx.fill(); }
              ctx.strokeStyle = `rgba(200,255,0,${sa.toFixed(3)})`;
              ctx.lineWidth   = 0.5 + glow * 0.55;
              ctx.stroke();
            }
            ctx.shadowBlur = 0;
          }

          // ── Touch press burst rings (mobile shield-press effect) ──────────────
          touchBurstsRef.current = touchBurstsRef.current.filter(b => ts - b.startTs < 660);
          if (touchBurstsRef.current.length > 0) {
            ctx.shadowColor = "rgba(200,255,0,1)";
            for (const burst of touchBurstsRef.current) {
              const age = Math.max(0, ts - burst.startTs);
              const p   = Math.min(age / 580, 1);
              const ep  = 1 - (1 - p) * (1 - p); // ease-out quad
              // outer expanding ring
              ctx.shadowBlur = 18;
              ctx.lineWidth  = 1.5;
              ctx.beginPath();
              ctx.arc(burst.x, burst.y, ep * 115, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(200,255,0,${((1 - p) * 0.55).toFixed(3)})`;
              ctx.stroke();
              // inner ring (80 ms delayed start)
              const age2 = Math.max(0, age - 80);
              const p2   = Math.min(age2 / 580, 1);
              if (p2 > 0) {
                const ep2 = 1 - (1 - p2) * (1 - p2);
                ctx.shadowBlur = 10;
                ctx.lineWidth  = 1;
                ctx.beginPath();
                ctx.arc(burst.x, burst.y, ep2 * 70, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(200,255,0,${((1 - p2) * 0.28).toFixed(3)})`;
                ctx.stroke();
              }
            }
            ctx.shadowBlur = 0;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      <canvas
        ref={particleRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "screen" }}
      />
      <canvas
        ref={membraneRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "screen" }}
      />
    </div>
  );
}
