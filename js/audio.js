/* ============================================================
 * Billiards · audio.js
 * 音效：WebAudio 合成的击球、碰库、落袋、UI 音效与胜负音。
 * 无外部音频资源，懒加载 AudioContext，可整体开关。
 * ============================================================ */
(function (global) {
  'use strict';
  const B = global.Billiards = global.Billiards || {};

  let ctx = null, master = null, enabled = false;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }

  /* 基础音：振荡器 + 指数衰减包络 */
  function tone(freq, dur, vol, type, slideTo) {
    if (!enabled || !ensure()) return;
    try {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur);
    } catch (e) {}
  }

  /* 噪声音：缓冲噪声 + 低通（撞击感） */
  function noise(dur, vol, cutoff) {
    if (!enabled || !ensure()) return;
    try {
      const t = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t);
    } catch (e) {}
  }

  const SFX = {
    hit: p => { const v = Math.min(0.22, 0.05 + p * 0.012); noise(0.05, v, 1600); tone(p > 13 ? 150 : 100, 0.06, v * 0.8, 'triangle'); },
    rail: p => tone(220, 0.045, Math.min(0.1, 0.02 + p * 0.01), 'square'),
    ball: () => tone(1900, 0.025, 0.06, 'sine'),
    pocket: () => { noise(0.12, 0.16, 700); tone(90, 0.16, 0.14, 'sine', 45); },
    place: () => tone(500, 0.05, 0.08, 'sine', 300),
    ui: () => tone(660, 0.05, 0.06, 'sine', 880),
    win: () => { tone(523, 0.14, 0.12, 'sine'); setTimeout(() => tone(659, 0.14, 0.12, 'sine'), 140); setTimeout(() => tone(784, 0.3, 0.14, 'sine'), 280); },
    lose: () => { tone(392, 0.16, 0.11, 'sine'); setTimeout(() => tone(330, 0.16, 0.11, 'sine'), 160); setTimeout(() => tone(262, 0.34, 0.12, 'sine'), 320); },
  };

  B.Audio = {
    play: name => { const fn = SFX[name]; if (fn) fn(); },
    hit: p => SFX.hit(p),
    setEnabled: v => { enabled = !!v; if (enabled) ensure(); },
    isEnabled: () => enabled,
  };
})(typeof window !== 'undefined' ? window : globalThis);
