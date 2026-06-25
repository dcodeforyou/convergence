"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Synthetic impulse response (spacious hall reverb) ─────────────────────────
function makeIR(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

// ── Assemble the ambient C-minor drone ────────────────────────────────────────
// Notes: C1 sub + C2 bass + G2 fifth + C3 octave + G3 fifth + C4 shimmer
// Staggered fade-ins give a gradual emergence over ~30 seconds.
function buildSynth(ctx: AudioContext): { muteGain: GainNode } {
  // Mute layer — faded by the toggle button
  const muteGain = ctx.createGain();
  muteGain.gain.value = 1;
  muteGain.connect(ctx.destination);

  // Master gain — fades in from 0 over 5 seconds
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.36, ctx.currentTime + 5);
  master.connect(muteGain);

  // LFO breathing — 0.045 Hz ≈ 22-second cycle, ±0.08 amplitude
  const lfo    = ctx.createOscillator();
  const lfoAmp = ctx.createGain();
  lfo.type            = "sine";
  lfo.frequency.value = 0.045;
  lfoAmp.gain.value   = 0.08;
  lfo.connect(lfoAmp);
  lfoAmp.connect(master.gain); // summed into master gain
  lfo.start();

  // Reverb (6 s exponential-decay convolver → huge hall)
  const reverb = ctx.createConvolver();
  reverb.buffer = makeIR(ctx, 6, 1.8);
  reverb.connect(master);

  // Low-pass to keep it soft and airy
  const lpf = ctx.createBiquadFilter();
  lpf.type            = "lowpass";
  lpf.frequency.value = 2000;
  lpf.Q.value         = 0.5;

  // Wet/dry split
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  wet.gain.value = 0.90;
  dry.gain.value = 0.10;
  wet.connect(reverb);
  dry.connect(master);
  lpf.connect(wet);
  lpf.connect(dry);

  // C-minor power voicing: C1 · C2 · G2 · C3 · G3 · C4
  // detune in cents creates "choir" richness; staggered delays let texture emerge
  const layers: { freq: number; detune: number; gain: number; delay: number; fadeIn: number }[] = [
    { freq: 32.703,  detune:  0, gain: 0.042, delay:  0, fadeIn: 14 }, // C1 sub
    { freq: 65.406,  detune: +5, gain: 0.160, delay:  0, fadeIn:  9 }, // C2 bass
    { freq: 98.000,  detune: -4, gain: 0.110, delay:  3, fadeIn: 11 }, // G2 fifth
    { freq: 130.813, detune: +9, gain: 0.080, delay:  6, fadeIn: 13 }, // C3 octave
    { freq: 196.000, detune: -7, gain: 0.055, delay:  9, fadeIn: 13 }, // G3 fifth
    { freq: 261.626, detune:+12, gain: 0.030, delay: 14, fadeIn: 16 }, // C4 shimmer
  ];

  for (const layer of layers) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type            = "sine";
    osc.frequency.value = layer.freq;
    osc.detune.value    = layer.detune;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(
      layer.gain,
      ctx.currentTime + layer.delay + layer.fadeIn
    );
    osc.connect(gain);
    gain.connect(lpf);
    osc.start(ctx.currentTime + layer.delay);
  }

  return { muteGain };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AmbientAudio() {
  const ctxRef   = useRef<AudioContext | null>(null);
  const synthRef = useRef<{ muteGain: GainNode } | null>(null);
  const [playing, setPlaying] = useState(false);

  const startAudio = useCallback(() => {
    if (ctxRef.current) return;
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      synthRef.current = buildSynth(ctx);
      setPlaying(true);
    } catch {
      // Audio not supported
    }
  }, []);

  // Auto-start on first user interaction (scroll, click, or touch)
  useEffect(() => {
    const handler = () => startAudio();
    window.addEventListener("scroll",     handler, { once: true, passive: true });
    window.addEventListener("click",      handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true, passive: true });
    return () => {
      window.removeEventListener("scroll",     handler);
      window.removeEventListener("click",      handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [startAudio]);

  useEffect(() => {
    return () => { ctxRef.current?.close(); };
  }, []);

  const toggle = () => {
    if (!ctxRef.current) { startAudio(); return; }
    const mg = synthRef.current?.muteGain;
    if (!mg) return;
    if (playing) {
      mg.gain.cancelScheduledValues(ctxRef.current.currentTime);
      mg.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.8);
      setPlaying(false);
    } else {
      ctxRef.current.resume();
      mg.gain.cancelScheduledValues(ctxRef.current.currentTime);
      mg.gain.linearRampToValueAtTime(1, ctxRef.current.currentTime + 0.8);
      setPlaying(true);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Mute ambient audio" : "Unmute ambient audio"}
      style={{
        position:         "fixed",
        bottom:           28,
        right:            28,
        width:            40,
        height:           40,
        borderRadius:     "50%",
        backgroundColor:  "rgba(4,4,8,0.72)",
        backdropFilter:   "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border:           playing
          ? "1px solid rgba(200,255,0,0.45)"
          : "1px solid rgba(200,255,0,0.14)",
        display:          "flex",
        alignItems:       "center",
        justifyContent:   "center",
        zIndex:           100,
        transition:       "border-color 0.35s ease",
        animation:        playing ? "audioPulse 3.5s ease-in-out infinite" : "none",
      }}
    >
      <SpeakerIcon on={playing} />
    </button>
  );
}

// ── Speaker SVG icon ──────────────────────────────────────────────────────────
function SpeakerIcon({ on }: { on: boolean }) {
  const col = on ? "#C8FF00" : "rgba(200,255,0,0.32)";
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ overflow: "visible" }}
    >
      {/* Speaker body */}
      <polygon points="1,5.5 5,5.5 9,2.5 9,13.5 5,10.5 1,10.5" fill={col} />
      {on ? (
        <>
          {/* Close wave */}
          <path
            d="M11 5a3.5 3.5 0 0 1 0 6"
            stroke={col}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Far wave */}
          <path
            d="M13 3a5.5 5.5 0 0 1 0 10"
            stroke={col}
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
        </>
      ) : (
        <>
          <line x1="11.5" y1="5.5" x2="14.5" y2="10.5" stroke={col} strokeWidth="1.3" strokeLinecap="round" />
          <line x1="14.5" y1="5.5" x2="11.5" y2="10.5" stroke={col} strokeWidth="1.3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
