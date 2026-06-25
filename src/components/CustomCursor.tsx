"use client";

import { useEffect, useRef, useState } from "react";

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"]';

export default function CustomCursor() {
  const outerRef  = useRef<HTMLDivElement>(null);
  const posRef    = useRef({ x: -200, y: -200 });
  const velRef    = useRef({ x: 0,    y: 0    });
  const targetRef = useRef({ x: -200, y: -200 });
  const rafRef    = useRef<number | null>(null);

  const [visible,  setVisible]  = useState(false);
  const [hovering, setHovering] = useState(false);
  const [isFine,   setIsFine]   = useState(false);

  // Only show on mouse devices
  useEffect(() => {
    setIsFine(window.matchMedia("(pointer: fine)").matches);
  }, []);

  // Mouse tracking + interactive-element detection
  useEffect(() => {
    if (!isFine) return;

    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
      // Detect interactive parent without re-querying DOM per frame
      const el = e.target as HTMLElement;
      setHovering(!!el.closest(INTERACTIVE));
    };
    const onLeave = () => { setVisible(false); setHovering(false); };

    window.addEventListener("mousemove",  onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove",  onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [isFine, visible]);

  // Spring-physics RAF — only updates `transform` on the outer div (no layout)
  useEffect(() => {
    if (!isFine) return;
    let active = true;

    const tick = () => {
      if (!active) return;
      const p = posRef.current, v = velRef.current, t = targetRef.current;
      v.x = v.x * 0.68 + (t.x - p.x) * 0.26;
      v.y = v.y * 0.68 + (t.y - p.y) * 0.26;
      p.x += v.x;
      p.y += v.y;
      if (outerRef.current) {
        outerRef.current.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isFine]);

  if (!isFine) return null;

  return (
    /*
     * Outer: zero-size anchor, positioned instantly by RAF via transform.
     * Inner: the visible orb, scaled by CSS transition (smooth, no RAF jank).
     */
    <div
      ref={outerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        pointerEvents: "none",
        zIndex: 9999,
        willChange: "transform",
      }}
    >
      <div
        style={{
          position: "absolute",
          // Center the orb on the anchor point
          top:  -5,
          left: -5,
          width:  10,
          height: 10,
          borderRadius: "50%",
          // 3-D sphere shading: bright specular highlight top-left
          background: hovering
            ? "radial-gradient(circle at 32% 30%, rgba(255,255,255,0.6) 0%, rgba(200,255,0,0.55) 45%, rgba(138,184,0,0.4) 100%)"
            : "radial-gradient(circle at 32% 30%, rgba(255,255,255,0.92) 0%, #C8FF00 48%, #8AB800 100%)",
          boxShadow: hovering
            ? [
                "0 0 0  1px rgba(200,255,0,0.45)",
                "0 0  6px rgba(200,255,0,0.5)",
                "0 0 18px rgba(200,255,0,0.35)",
                "0 0 40px rgba(200,255,0,0.18)",
              ].join(", ")
            : [
                "0 0  4px rgba(200,255,0,1)",
                "0 0 14px rgba(200,255,0,0.75)",
                "0 0 30px rgba(200,255,0,0.45)",
                "0 0 60px rgba(200,255,0,0.20)",
              ].join(", "),
          // Scale: grows + opens a ring gap when over interactive elements
          transform: `scale(${hovering ? 2.6 : 1})`,
          // Springy cubic-bezier gives a satisfying "snap" feel on grow
          transition: [
            "transform 0.24s cubic-bezier(0.34,1.56,0.64,1)",
            "background 0.18s ease",
            "box-shadow 0.18s ease",
            "opacity 0.25s ease",
          ].join(", "),
          opacity: visible ? 1 : 0,
        }}
      />
      {/* Outer ring — visible only when hovering over interactive elements */}
      <div
        style={{
          position: "absolute",
          top:  -13,
          left: -13,
          width:  26,
          height: 26,
          borderRadius: "50%",
          border: "1px solid rgba(200,255,0,0.35)",
          boxShadow: "0 0 8px rgba(200,255,0,0.15)",
          transform: `scale(${hovering ? 1 : 0.3})`,
          opacity:   hovering ? 1 : 0,
          transition: [
            "transform 0.28s cubic-bezier(0.34,1.56,0.64,1)",
            "opacity 0.18s ease",
          ].join(", "),
        }}
      />
    </div>
  );
}
