/**
 * Pessimistic Pals — Hyper-Interactive Feedback Layer
 *
 * Global sensory helpers: haptic, SFX, screen shake, particle eruption,
 * screen tint, bar flash, animated counters, button spring + ripple.
 *
 * All helpers respect:
 *   - state.meta.uiSoundsEnabled (gates audio)
 *   - state.meta.reduceMotion + prefers-reduced-motion (gates visual movement)
 *   - Haptic + audio remain ON under reduced-motion (only visuals are stripped)
 */
(function () {
  'use strict';

  // ---------- preference accessors ----------
  function readMeta() {
    try {
      const state = typeof getState === 'function' ? getState() : null;
      return (state && state.meta) || {};
    } catch (err) {
      return {};
    }
  }
  function audioOn() {
    const meta = readMeta();
    return meta.uiSoundsEnabled !== false;
  }
  function uiVolumeScale() {
    const meta = readMeta();
    const v = typeof meta.uiVolume === 'number' ? meta.uiVolume : 0.6;
    return Math.max(0, Math.min(1, v));
  }
  function motionOn() {
    const meta = readMeta();
    if (meta.reduceMotion) return false;
    if (typeof window.matchMedia === 'function') {
      try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      } catch (err) { /* noop */ }
    }
    return true;
  }

  // ---------- haptic ----------
  const HAPTIC_PATTERNS = {
    tap: 8,
    select: 12,
    deselect: 6,
    toggle: 10,
    success: [12, 40, 22],
    deny: [40, 30, 40],
    warning: [22, 60, 22],
    tabSwitch: 6,
    error: [60, 40, 60, 40, 60],
    achievement: [30, 50, 30, 50, 80],
  };
  function buzz(pattern) {
    if (!('vibrate' in navigator)) return;
    const resolved = typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;
    if (!resolved) return;
    try { navigator.vibrate(resolved); } catch (err) { /* noop */ }
  }

  // ---------- audio (Web Audio synth, separate from BGM) ----------
  let sfxCtx = null;
  function ctx() {
    if (sfxCtx) return sfxCtx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try { sfxCtx = new Ctor(); } catch (err) { sfxCtx = null; }
    return sfxCtx;
  }
  // Resume on first user gesture (autoplay policy)
  function primeSfx() {
    const c = ctx();
    if (c && c.state === 'suspended') {
      c.resume().catch(() => { /* noop */ });
    }
  }
  document.addEventListener('pointerdown', primeSfx, { once: true, passive: true });
  document.addEventListener('keydown', primeSfx, { once: true });

  function tone(freq, dur, type, vol) {
    if (!audioOn()) return;
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq || 440, t);
    const peak = (vol == null ? 0.12 : vol) * uiVolumeScale();
    if (peak <= 0) return;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.1));
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + (dur || 0.1) + 0.02);
  }
  function chord(freqs, dur, type, vol) {
    (freqs || []).forEach((f) => tone(f, dur, type, vol));
  }
  function sweep(fromFreq, toFreq, dur, type, vol) {
    if (!audioOn()) return;
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(fromFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), t + dur);
    const peak = (vol == null ? 0.1 : vol) * uiVolumeScale();
    if (peak <= 0) return;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const SFX = {
    tap()      { tone(880, 0.05, 'square', 0.06); },
    select()   { tone(660, 0.07, 'square', 0.08); },
    deselect() { tone(440, 0.06, 'square', 0.05); },
    toggle()   { tone(520, 0.06, 'square', 0.07); },
    success()  { setTimeout(() => tone(523, 0.08, 'triangle', 0.1), 0);
                 setTimeout(() => tone(659, 0.08, 'triangle', 0.1), 70);
                 setTimeout(() => tone(784, 0.14, 'triangle', 0.12), 140); },
    deny()     { tone(180, 0.18, 'sawtooth', 0.12); },
    warning()  { sweep(440, 220, 0.25, 'sawtooth', 0.1); },
    tabSwitch(){ tone(740, 0.04, 'sine', 0.05); },
    error()    { sweep(300, 90, 0.4, 'sawtooth', 0.14); },
    achievement() {
      [523, 659, 784, 988, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.12), i * 80));
    },
    coin()     { tone(988, 0.05, 'square', 0.08);
                 setTimeout(() => tone(1318, 0.1, 'square', 0.08), 50); },
  };

  // ---------- screen shake ----------
  const SHAKE_LEVELS = { light: 'ppals-shake-light', mid: 'ppals-shake-mid', hard: 'ppals-shake-hard' };
  function shakeScreen(level) {
    if (!motionOn()) return;
    const cls = SHAKE_LEVELS[level] || SHAKE_LEVELS.light;
    const target = document.querySelector('main') || document.body;
    target.classList.remove(cls);
    // restart animation
    void target.offsetWidth; // eslint-disable-line no-unused-expressions
    target.classList.add(cls);
    const dur = level === 'hard' ? 600 : level === 'mid' ? 360 : 220;
    setTimeout(() => target.classList.remove(cls), dur);
  }

  // ---------- particle eruption ----------
  function erupt(chars, count, originEventOrEl) {
    if (!motionOn()) return;
    const list = Array.isArray(chars) && chars.length ? chars : ['◆', '▪', '✦'];
    const n = Math.max(1, Math.min(40, count || 8));
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (originEventOrEl) {
      if (originEventOrEl.clientX != null) {
        x = originEventOrEl.clientX; y = originEventOrEl.clientY;
      } else if (originEventOrEl.getBoundingClientRect) {
        const r = originEventOrEl.getBoundingClientRect();
        x = r.left + r.width / 2; y = r.top + r.height / 2;
      }
    }
    const layer = ensureLayer();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'ppals-particle';
      p.textContent = list[i % list.length];
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      const angle = (Math.PI * 2 * i) / n + (Math.random() * 0.4 - 0.2);
      const dist = 40 + Math.random() * 70;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      layer.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }
  function ensureLayer() {
    let layer = document.getElementById('ppals-fx-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'ppals-fx-layer';
      document.body.appendChild(layer);
    }
    return layer;
  }

  // ---------- screen tint ----------
  function tint(color, durMs) {
    if (!motionOn()) return;
    const layer = ensureLayer();
    const flash = document.createElement('div');
    flash.className = 'ppals-tint';
    flash.style.background = color || 'rgba(15, 255, 140, 0.18)';
    layer.appendChild(flash);
    const d = durMs || 350;
    flash.style.animationDuration = d + 'ms';
    setTimeout(() => flash.remove(), d + 50);
  }

  // ---------- bar flash ----------
  function flashBar(el, color) {
    if (!el || !motionOn()) return;
    el.classList.remove('ppals-bar-flash');
    void el.offsetWidth; // eslint-disable-line no-unused-expressions
    if (color) el.style.setProperty('--ppals-flash-color', color);
    el.classList.add('ppals-bar-flash');
    setTimeout(() => el.classList.remove('ppals-bar-flash'), 600);
  }

  // ---------- animated counter ----------
  function animateCounter(el, from, to, durMs, formatter) {
    if (!el) return;
    const start = Number(from) || 0;
    const end = Number(to) || 0;
    if (!motionOn() || start === end) {
      el.textContent = formatter ? formatter(end) : String(end);
      return;
    }
    const dur = Math.max(60, durMs || 360);
    const t0 = performance.now();
    function tick(now) {
      const k = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(start + (end - start) * eased);
      el.textContent = formatter ? formatter(v) : String(v);
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- ripple from pointer ----------
  function ripple(el, ev) {
    if (!el || !motionOn()) return;
    const r = el.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'ppals-ripple';
    const size = Math.max(r.width, r.height) * 1.6;
    const x = (ev && ev.clientX != null ? ev.clientX - r.left : r.width / 2) - size / 2;
    const y = (ev && ev.clientY != null ? ev.clientY - r.top : r.height / 2) - size / 2;
    span.style.width = size + 'px';
    span.style.height = size + 'px';
    span.style.left = x + 'px';
    span.style.top = y + 'px';
    // ensure host can position the ripple
    const cs = window.getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.overflow === 'visible') el.style.overflow = 'hidden';
    el.appendChild(span);
    setTimeout(() => span.remove(), 650);
  }

  // ---------- composite tap handler ----------
  function handleTap(el, ev) {
    buzz('tap');
    SFX.tap();
    ripple(el, ev);
    if (el && el.classList) {
      el.classList.remove('ppals-tapped');
      void el.offsetWidth; // restart animation
      el.classList.add('ppals-tapped');
      setTimeout(() => el.classList.remove('ppals-tapped'), 380);
    }
  }

  // ---------- global delegation: every .action-button gets the stack ----------
  document.addEventListener('pointerdown', function (ev) {
    const btn = ev.target && ev.target.closest && ev.target.closest('.action-button, [data-ppals-tap]');
    if (!btn) return;
    if (btn.disabled) return;
    handleTap(btn, ev);
  }, { passive: true });

  // ---------- expose ----------
  window.PPalsFeedback = {
    buzz, tone, chord, sweep, SFX,
    shakeScreen, erupt, tint, flashBar, animateCounter, ripple,
    handleTap,
    audioOn, motionOn,
  };

  // Boot marker so it's easy to verify the module loaded.
  // Open DevTools console and you'll see this on every page.
  // eslint-disable-next-line no-console
  console.log(
    '%c[PPalsFeedback] loaded',
    'background:#0fff8c;color:#04080d;padding:2px 6px;font-family:monospace;border-radius:2px;',
    'try: PPalsFeedback.SFX.success() / .erupt() / .shakeScreen("mid") / .tint("rgba(15,255,140,0.25)")'
  );
})();
