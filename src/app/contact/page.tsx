"use client";

import { useState, useEffect, useRef } from "react";
import { Cormorant_Garamond, Space_Grotesk, Press_Start_2P } from "next/font/google";

const cormorant = Cormorant_Garamond({ weight: ["300", "500"], style: ["normal", "italic"], subsets: ["latin"], display: "swap" });
const spaceG    = Space_Grotesk({ weight: ["300", "400"], subsets: ["latin"], display: "swap" });
const pixel     = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

// ── Typewriter sequence ────────────────────────────────────────────────────────
type LineType = "code" | "display" | "body" | "body-dim" | "break";

interface TypeLine {
  text:       string;
  type:       LineType;
  speed:      number;   // ms per char
  pauseAfter: number;   // ms after line completes
}

const SEQUENCE: TypeLine[] = [
  { text: "// connection established", type: "code",     speed: 22,  pauseAfter: 140 },
  { text: "// direct line open",       type: "code",     speed: 22,  pauseAfter: 800 },
  { text: "",                          type: "break",    speed: 0,   pauseAfter: 0   },
  { text: "Hey.",                      type: "display",  speed: 115, pauseAfter: 560 },
  { text: "",                          type: "break",    speed: 0,   pauseAfter: 0   },
  { text: "Got a project worth building?",               type: "body",     speed: 40, pauseAfter: 200 },
  { text: "A wild idea or just want to say hello —",     type: "body",     speed: 37, pauseAfter: 200 },
  { text: "either way, I read every message.",           type: "body-dim", speed: 42, pauseAfter: 1100 },
];

function charDelay(char: string, base: number): number {
  if (char === "." || char === "?" || char === "—") return base + 90;
  if (char === ",")                                  return base + 50;
  if (char === " ")                                  return base - 8;
  return base;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ContactPage() {
  const [lineIdx,        setLineIdx]        = useState(0);
  const [charIdx,        setCharIdx]        = useState(0);
  const [completedLines, setCompletedLines] = useState<TypeLine[]>([]);
  const [inputVisible,   setInputVisible]   = useState(false);
  const [message,        setMessage]        = useState("");
  const [submitted,      setSubmitted]      = useState(false);
  const [started,        setStarted]        = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Brief boot delay before typing starts
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 600);
    return () => clearTimeout(t);
  }, []);

  // ── Typewriter state machine ───────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;

    const line = SEQUENCE[lineIdx];
    if (!line) {
      // All lines done → show input
      const t = setTimeout(() => {
        setInputVisible(true);
        setTimeout(() => inputRef.current?.focus(), 400);
      }, 300);
      return () => clearTimeout(t);
    }

    if (charIdx < line.text.length) {
      const delay = charDelay(line.text[charIdx], line.speed);
      const t = setTimeout(() => setCharIdx(c => c + 1), delay);
      return () => clearTimeout(t);
    }

    // Line complete → pause then advance
    const t = setTimeout(() => {
      if (line.type !== "break") {
        setCompletedLines(prev => [...prev, line]);
      }
      setLineIdx(l => l + 1);
      setCharIdx(0);
    }, line.pauseAfter);
    return () => clearTimeout(t);
  }, [started, lineIdx, charIdx]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    // Open email client with pre-filled message
    window.open(
      `mailto:dcodeforyou@gmail.com?subject=Hello from Convergence&body=${encodeURIComponent(message)}`,
      "_blank"
    );
    setMessage("");
  };

  const currentLine = SEQUENCE[lineIdx];
  const isTyping    = !inputVisible && currentLine && currentLine.type !== "break";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#040408",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0 clamp(24px, 6vw, 80px) clamp(10vh, 12vh, 120px)",
        zIndex: 10,
      }}
    >
      {/* Scan-line overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 8,
          background: "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.032) 3px, rgba(0,0,0,0.032) 4px)",
        }}
      />
      {/* CRT edge vignette */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 8,
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(4,4,8,0.72) 100%)",
        }}
      />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 760, width: "100%", position: "relative", zIndex: 10 }}>

        {/* Completed lines */}
        {completedLines.map((line, i) => (
          <LinePart key={i} line={line} done />
        ))}

        {/* Currently typing line */}
        {isTyping && (
          <LinePart
            line={currentLine}
            partial={currentLine.text.slice(0, charIdx)}
            showCursor
          />
        )}

        {/* Input area */}
        {inputVisible && !submitted && (
          <form
            onSubmit={handleSubmit}
            style={{ animation: "inputReveal 0.65s cubic-bezier(0.22,1,0.36,1) both", marginTop: "clamp(28px,4vh,48px)" }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              paddingBottom: 10,
              borderBottom: "1px solid rgba(200,255,0,0.45)",
              boxShadow: "0 2px 14px rgba(200,255,0,0.18), 0 3px 28px rgba(200,255,0,0.07)",
            }}>
              {/* Terminal prompt */}
              <span
                className={pixel.className}
                style={{ color: "rgba(200,255,0,0.55)", fontSize: 9, flexShrink: 0 }}
              >
                &gt;
              </span>

              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="type here..."
                maxLength={280}
                className={spaceG.className}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#C8FF00",
                  fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                  fontWeight: 300,
                  letterSpacing: "0.04em",
                  caretColor: "#C8FF00",
                }}
              />

              {/* Send ↵ */}
              <button
                type="submit"
                className={pixel.className}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0 4px",
                  fontSize: 10,
                  color:       message.trim() ? "#C8FF00"            : "rgba(200,255,0,0.25)",
                  textShadow:  message.trim() ? "0 0 8px #C8FF00, 0 0 20px rgba(200,255,0,0.45)" : "none",
                  transition: "color 0.2s ease, text-shadow 0.2s ease",
                  flexShrink: 0,
                  letterSpacing: "0.05em",
                }}
              >
                ↵
              </button>
            </div>

            <p
              className={spaceG.className}
              style={{
                marginTop: 10,
                fontSize: "0.62rem",
                letterSpacing: "0.14em",
                color: "rgba(200,255,0,0.3)",
                textTransform: "uppercase",
              }}
            >
              press enter or click ↵ to send
            </p>
          </form>
        )}

        {/* Success message */}
        {submitted && (
          <div
            className={pixel.className}
            style={{
              marginTop: "clamp(28px,4vh,48px)",
              fontSize: 9,
              letterSpacing: "0.16em",
              animation: "successIn 0.5s ease both",
            }}
          >
            <div style={{ color: "#C8FF00", textShadow: "0 0 8px #C8FF00, 0 0 20px rgba(200,255,0,0.45)" }}>
              // message received.
            </div>
            <div style={{ color: "rgba(200,255,0,0.5)", marginTop: 10 }}>
              // talk soon.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Line renderer ──────────────────────────────────────────────────────────────
function LinePart({
  line,
  partial,
  showCursor = false,
  done = false,
}: {
  line: TypeLine;
  partial?: string;
  showCursor?: boolean;
  done?: boolean;
}) {
  const text = partial ?? (done ? line.text : "");

  if (line.type === "break") return <div style={{ height: "clamp(12px,2vh,24px)" }} />;

  if (line.type === "code") {
    return (
      <div
        className={pixel.className}
        style={{
          fontSize: "clamp(7px, 1.2vw, 9px)",
          letterSpacing: "0.14em",
          color: "rgba(200,255,0,0.4)",
          marginBottom: 4,
          lineHeight: 1.8,
        }}
      >
        {text}
        {showCursor && <Cursor />}
      </div>
    );
  }

  if (line.type === "display") {
    return (
      <div
        className={cormorant.className}
        style={{
          fontSize: "clamp(4.5rem, 11vw, 9.5rem)",
          fontWeight: 300,
          fontStyle: "italic",
          lineHeight: 0.92,
          marginBottom: "0.12em",
          color: "#C8FF00",
          animation: done ? "glitchShift 5s linear 1s infinite" : "none",
          display: "inline-block",
        }}
      >
        {text}
        {showCursor && <Cursor />}
      </div>
    );
  }

  // body / body-dim
  const dim = line.type === "body-dim";
  return (
    <div
      className={spaceG.className}
      style={{
        fontSize: "clamp(1rem, 2.2vw, 1.45rem)",
        fontWeight: 300,
        letterSpacing: "0.01em",
        lineHeight: 1.55,
        color: dim ? "rgba(240,237,230,0.42)" : "rgba(240,237,230,0.72)",
        marginBottom: 2,
      }}
    >
      {text}
      {showCursor && <Cursor />}
    </div>
  );
}

// Blinking block cursor
function Cursor() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        marginLeft: 2,
        width: "0.55em",
        height: "1.05em",
        verticalAlign: "text-bottom",
        backgroundColor: "#C8FF00",
        boxShadow: "0 0 6px #C8FF00, 0 0 14px rgba(200,255,0,0.6)",
        animation: "cursorBlink 0.75s step-start infinite",
      }}
    />
  );
}
