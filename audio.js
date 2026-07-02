/* ============================================================
   audio.js — CLAWD's voice box. Tiny WebAudio synth, no assets.
   Sounds grow more "intelligent" with the era: era 0 is a dull
   garage clunk; by the Singularity it's crystalline arpeggios.
   Loads before game.js; game.js calls Sfx.* at event points.
   ============================================================ */
'use strict';

const Sfx = (() => {
  let ctx = null, master = null;
  let enabled = true;
  let lastClickAt = 0;
  let hum = null;

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { enabled = false; return null; }
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  /* browsers require a user gesture before audio — arm once */
  const arm = () => { ensure(); };
  document.addEventListener('pointerdown', arm, { once: true, capture: true });
  document.addEventListener('keydown', arm, { once: true, capture: true });

  function tone(opts) {
    if (!enabled || !ctx) return;
    const {
      f = 440, at = 0, dur = 0.12, type = 'sine', vol = 0.07,
      slide = 0, detune = 0, filter = 0,
    } = opts;
    const t0 = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + dur);
    if (detune) o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let head = o;
    if (filter) {
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = filter;
      o.connect(fl);
      head = fl;
    }
    head.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.08);
  }

  function phrase(notes, { spacing = 0.05, ...opts } = {}) {
    notes.forEach((n, i) => tone({ f: n, at: i * spacing, ...opts }));
  }

  /* per-era click voices: more notes, purer waves, wider intervals */
  const CLICK_VOICES = [
    { type: 'square',   notes: [180],                  dur: 0.05, vol: 0.045, filter: 900  },
    { type: 'square',   notes: [262],                  dur: 0.05, vol: 0.045, filter: 1500 },
    { type: 'triangle', notes: [330],                  dur: 0.06, vol: 0.055, filter: 2600 },
    { type: 'triangle', notes: [392, 523],             dur: 0.06, vol: 0.05 },
    { type: 'sine',     notes: [523, 659, 784],        dur: 0.07, vol: 0.05 },
    { type: 'sine',     notes: [523, 622, 784],        dur: 0.09, vol: 0.05,  detune: 9 },
    { type: 'sine',     notes: [659, 831, 988, 1319],  dur: 0.10, vol: 0.042, detune: 5 },
  ];

  function click(era) {
    if (!enabled || !ctx) return;
    const t = performance.now();
    if (t - lastClickAt < 70) return; /* don't shred ears during click storms */
    lastClickAt = t;
    const v = CLICK_VOICES[Math.min(era, CLICK_VOICES.length - 1)];
    const jit = 0.97 + Math.random() * 0.06;
    v.notes.forEach((n, i) => tone({
      f: n * jit, at: i * 0.028, dur: v.dur, type: v.type,
      vol: v.vol, filter: v.filter || 0, detune: v.detune || 0,
    }));
  }

  function buy(era) {
    if (!ensure()) return;
    if (era < 2) phrase([196, 262], { type: 'square', dur: 0.07, vol: 0.05, filter: 1600, spacing: 0.06 });
    else if (era < 4) phrase([262, 330, 392], { type: 'triangle', dur: 0.07, vol: 0.05, spacing: 0.045 });
    else phrase([392, 494, 587, 784], { type: 'sine', dur: 0.08, vol: 0.045, spacing: 0.04 });
  }

  function upgrade(era) {
    if (!ensure()) return;
    phrase(era < 3 ? [330, 415, 494] : [523, 659, 784, 1047], { type: 'triangle', dur: 0.1, vol: 0.05, spacing: 0.05 });
  }

  function gold(era) {
    if (!ensure()) return;
    const notes = era < 4 ? [392, 523, 659, 784] : [392, 523, 659, 784, 1047];
    phrase(notes, { type: 'triangle', dur: 0.16, vol: 0.065, spacing: 0.055 });
  }

  function achieve() {
    if (!ensure()) return;
    phrase([659, 988], { type: 'sine', dur: 0.14, vol: 0.05, spacing: 0.07 });
  }

  /* era transitions literally gain a note per era */
  const SCALE = [262, 294, 330, 392, 440, 523, 587, 659, 784];
  function eraUp(idx) {
    if (!ensure()) return;
    phrase(SCALE.slice(0, Math.min(idx + 2, SCALE.length)), { type: 'sine', dur: 0.22, vol: 0.06, spacing: 0.085 });
    tone({ f: 131, dur: 0.9, type: 'sine', vol: 0.035, slide: 1.5 });
  }

  function prestige() {
    if (!ensure()) return;
    tone({ f: 65, dur: 1.4, type: 'sine', vol: 0.06, slide: 0.5 });
    phrase(SCALE.concat([1047]), { type: 'sine', dur: 0.3, vol: 0.05, spacing: 0.07 });
  }

  /* facility ambience: a clean hum that goes dissonant in late eras */
  function humStart(mood) {
    if (!ensure() || hum) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(mood >= 2 ? 0.028 : 0.02, ctx.currentTime + 0.8);
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = 220;
    fl.connect(g);
    g.connect(master);
    const base = mood === 3 ? 41 : 55;
    const ratios = mood >= 2 ? [1, 1.059] : [1, 1.005]; /* minor second = unease */
    const oscs = ratios.map((r) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = base * r;
      o.connect(fl);
      o.start();
      return o;
    });
    hum = { oscs, g };
  }
  function humStop() {
    if (!hum || !ctx) return;
    const h = hum;
    hum = null;
    h.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
    setTimeout(() => h.oscs.forEach((o) => { try { o.stop(); } catch (_) {} }), 700);
  }

  function setEnabled(on) {
    enabled = on;
    if (!on) { humStop(); if (master) master.gain.value = 0; }
    else { if (master) master.gain.value = 0.5; ensure(); }
  }

  return { click, buy, upgrade, gold, achieve, eraUp, prestige, humStart, humStop, setEnabled, isEnabled: () => enabled };
})();
