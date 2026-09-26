// Hollow Crown RPG audio: UI/field SFX and five seamless BGM loops, all synthesized offline.
// Loaded by bake-run.mjs before bake.js (contract: pipeline/RPG_ASSETS.md "Hooks" + "Audio").
// Everything lives inside the hook so nothing leaks into the shared script scope.
window.RPG_AUDIO = async function (BK) {
  const SR = 44100, OUT = {};
  // dev-only knobs (unset in the real bake): render a subset of names / solo the k-th mixer channel of each song
  const ONLY = window.RPG_AUDIO_ONLY, SOLO = window.RPG_AUDIO_SOLO;

  // ------------------------------------------------------------------ buffer utils
  const peakOf = d => { let p = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > p) p = a; } return p; };
  const scaleTo = (d, db) => { const p = peakOf(d) || 1, k = Math.pow(10, db / 20) / p; for (let i = 0; i < d.length; i++) d[i] *= k; return d; };
  const toBuf = d => { const b = new AudioBuffer({ length: d.length, numberOfChannels: 1, sampleRate: SR }); b.copyToChannel(d, 0); return b; };

  // ------------------------------------------------------------------ pitch + harmony
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const acc = a => (a === '#' ? 1 : a === 'b' ? -1 : 0);
  const midi = s => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(s); if (!m) throw new Error('rpg-audio: bad note ' + s); return PC[m[1]] + acc(m[2]) + (+m[3] + 1) * 12; };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 6: [0, 4, 7, 9],
    sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], add9: [0, 4, 7, 14], m9: [0, 3, 7, 10, 14],
  };
  const chordOf = s => { const m = /^([A-G])([#b]?)(.*)$/.exec(s); const iv = QUAL[m[3]]; if (!iv) throw new Error('rpg-audio: bad chord ' + s); return { root: (PC[m[1]] + acc(m[2]) + 12) % 12, iv }; };
  const inWin = (pc, lo) => lo + (((pc - lo) % 12) + 12) % 12; // the midi note of pitch class pc in [lo, lo+11]
  const pcsOf = c => [...new Set(c.iv.map(i => (c.root + i) % 12))];
  // close voicing: the inversion (bottom note in [lo, lo+11]) nearest the window centre that has no semitone
  // clusters, so e.g. maj7 chords stay in root position instead of grinding the 7th against the root
  const voicing = (sym, lo) => {
    const pcs = pcsOf(chordOf(sym)).sort((a, b) => a - b), cands = [];
    for (let r = 0; r < pcs.length; r++) {
      const v = [inWin(pcs[r], lo)];
      for (let k = 1; k < pcs.length; k++) { let m = v[k - 1] + 1; while ((m % 12) !== pcs[(r + k) % pcs.length]) m++; v.push(m); }
      const mean = v.reduce((a, b) => a + b, 0) / v.length, ok = v.every((m, k) => !k || m - v[k - 1] >= 2);
      cands.push({ v, cost: Math.abs(mean - lo - 8) + (ok ? 0 : 100) });
    }
    return cands.sort((a, b) => a.cost - b.cost)[0].v;
  };
  const rootIn = (sym, lo) => inWin(chordOf(sym).root, lo);
  const arpList = (sym, lo) => { // ascending chord tones from the root (placed in [lo, lo+11]) over 3 octaves
    const c = chordOf(sym), r = inWin(c.root, lo), ivs = [...new Set(c.iv.map(i => i % 12))].sort((a, b) => a - b), L = [];
    for (let o = 0; o < 3; o++) for (const i of ivs) L.push(r + i + 12 * o);
    return L;
  };
  const runs = chords => { const g = []; chords.forEach((s, i) => { const l = g[g.length - 1]; if (l && l.sym === s) l.n++; else g.push({ sym: s, bar: i, n: 1 }); }); return g; };

  // "A4 - - C5 | F5 . G5 -": one '|' group per bar, each bar split evenly into its tokens.
  // note = attack, '-' = hold, '.' = rest. Swing delays the off-8ths of 8-step bars.
  function seq(str, barLen, bar0 = 0, swing = 0) {
    const bars = str.split('|').map(b => b.trim().split(/\s+/)), ev = []; let cur = null;
    bars.forEach((toks, bi) => {
      const st = barLen / toks.length;
      toks.forEach((tk, i) => {
        let t = (bar0 + bi) * barLen + i * st; if (swing && toks.length === 8 && i % 2) t += swing * st;
        if (tk === '-') return;
        if (cur) { cur.d = t - cur.t; ev.push(cur); cur = null; }
        if (tk !== '.') cur = { t, m: midi(tk) };
      });
    });
    if (cur) { cur.d = (bar0 + bars.length) * barLen - cur.t; ev.push(cur); }
    return ev;
  }
  const stepT = (barLen, bar, i, n = 8, swing = 0) => bar * barLen + (i + (swing && n === 8 && i % 2 ? swing : 0)) * barLen / n;

  // ------------------------------------------------------------------ instruments (schedule-based envelopes)
  function Inst(ctx) {
    const I = {};
    const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const filt = (type, f, q) => { // k-rate: per-block coefficient updates keep the bake fast
      const b = ctx.createBiquadFilter(); b.type = type; b.frequency.automationRate = 'k-rate'; b.Q.automationRate = 'k-rate';
      b.frequency.value = f; if (q != null) b.Q.value = q; return b;
    };
    const waves = {};
    const pulse = duty => { // band-limited pulse wave
      if (!waves[duty]) { const n = 48, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * duty); waves[duty] = ctx.createPeriodicWave(re, im); }
      return waves[duty];
    };
    const osc = (type, f, t, end) => {
      const o = ctx.createOscillator();
      if (typeof type === 'number') o.setPeriodicWave(pulse(type)); else o.type = type;
      o.frequency.value = f; o.start(t); o.stop(end); return o;
    };
    const vibrato = (o, t, end, cents, rate, delay) => {
      const l = osc('sine', rate, t, end), g = gain(0);
      g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(cents, t + delay + 0.25);
      l.connect(g); g.connect(o.detune);
    };
    const noise = (t, end, off) => { const s = ctx.createBufferSource(); s.buffer = noiseBufFor(ctx); s.loop = end - t > 1.5; s.start(t, off || 0); s.stop(end); return s; };
    // voices register their output node + end time so the song renderer can unhook finished voices
    // (Chrome keeps pulling every connected node for the whole render otherwise, which gets slow)
    I.live = [];
    const out = (node, dst, end) => { node.connect(dst); I.live.push([end, node]); };
    I.gain = gain; I.filt = filt; I.osc = osc; I.noise = noise;

    // plucked lute: saw + triangle through a closing lowpass, fast exponential decay
    I.pluck = (dst, t, f, dur, v, o = {}) => {
      const dec = o.decay || 0.3, end = t + (o.damp ? Math.min(dur, dec * 5) + 0.25 : dec * 6);
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, dec);
      if (o.damp) g.gain.setTargetAtTime(0, t + Math.max(dur, 0.02), 0.03);
      const lp = filt('lowpass', 1000, 0.8);
      lp.frequency.setValueAtTime(Math.min(f * (o.bright || 7), 12000), t); lp.frequency.setTargetAtTime(Math.max(f * 1.3, 180), t, o.fdec || 0.08);
      const a = osc(o.wave || 'sawtooth', f, t, end), b = osc('triangle', f, t, end), bg = gain(0.7);
      a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(g); out(g, dst, end);
    };
    // harp: triangle + soft octave partial, bell-like decay
    I.harp = (dst, t, f, v, o = {}) => {
      const dec = o.decay || 0.55, end = t + dec * 6;
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, dec);
      const g2 = gain(0); g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(v * 0.28, t + 0.003); g2.gain.setTargetAtTime(0, t + 0.003, dec * 0.35);
      const a = osc('triangle', f, t, end), b = osc('sine', f * 2, t, end);
      a.connect(g); b.connect(g2); out(g, dst, end); out(g2, dst, end);
    };
    // ocarina / flute: sine + triangle, soft attack, delayed vibrato
    I.flute = (dst, t, f, dur, v, o = {}) => {
      const rel = o.rel || 0.07, end = t + dur + rel * 7;
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + (o.att || 0.025));
      g.gain.setTargetAtTime(v * 0.78, t + (o.att || 0.025), 0.25); g.gain.setTargetAtTime(0, t + Math.max(dur * 0.94, 0.04), rel);
      const lp = filt('lowpass', o.cut || 3200, 0.5);
      const a = osc('sine', f, t, end), b = osc('triangle', f, t, end), bg = gain(0.35);
      if (dur > 0.3) { vibrato(a, t, end, o.vib || 14, 5.2, 0.18); vibrato(b, t, end, o.vib || 14, 5.2, 0.18); }
      a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(g); out(g, dst, end);
    };
    // pulse lead (chiptune-ish, softened by a lowpass)
    I.lead = (dst, t, f, dur, v, o = {}) => {
      const rel = o.rel || 0.05, end = t + dur + rel * 7;
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006);
      g.gain.setTargetAtTime(v * 0.72, t + 0.006, 0.12); g.gain.setTargetAtTime(0, t + Math.max(dur * (o.leg || 0.9), 0.03), rel);
      const lp = filt('lowpass', o.cut || 2600, 0.7);
      const a = osc(o.duty || 0.25, f, t, end), b = osc('triangle', f, t, end), bg = gain(0.5);
      if (dur > 0.25) { vibrato(a, t, end, o.vib || 12, 5.6, 0.15); vibrato(b, t, end, o.vib || 12, 5.6, 0.15); }
      a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(g); out(g, dst, end);
    };
    // FM bell / music box / glockenspiel
    I.bell = (dst, t, f, v, o = {}) => {
      const dec = o.decay || 0.9, end = t + dec * 6;
      const car = osc('sine', f, t, end), mod = osc('sine', f * (o.ratio || 3.5), t, end), mg = gain(0);
      mg.gain.setValueAtTime(f * (o.index || 2), t); mg.gain.setTargetAtTime(0, t, o.mdec || 0.18);
      mod.connect(mg); mg.connect(car.frequency);
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, dec);
      car.connect(g); out(g, dst, end);
    };
    // warm detuned saw pad
    I.pad = (dst, t, f, dur, v, o = {}) => {
      const r = o.rel || 0.4, end = t + dur + r * 7, det = o.det || 7;
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + (o.att || 0.4)); g.gain.setTargetAtTime(0, t + dur, r);
      const lp = filt('lowpass', o.cut || 900, 0.4);
      for (const d of [-det, det]) { const a = osc(o.wave || 'sawtooth', f, t, end); a.detune.value = d; a.connect(lp); }
      lp.connect(g); out(g, dst, end);
    };
    // bass: wave + sine reinforcement, optional plucky filter envelope
    I.bass = (dst, t, f, dur, v, o = {}) => {
      const end = t + dur + 0.3;
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006);
      g.gain.setTargetAtTime(v * (o.sus || 0.7), t + 0.006, o.dec || 0.25); g.gain.setTargetAtTime(0, t + Math.max(dur, 0.02), 0.03);
      const lp = filt('lowpass', o.cut || 700, 1);
      if (o.env) { lp.frequency.setValueAtTime(f * o.env, t); lp.frequency.setTargetAtTime(Math.max(f * 2, 150), t, 0.06); }
      const a = osc(o.wave || 'triangle', f, t, end), b = osc('sine', f, t, end), bg = gain(o.subMix || 0.8);
      a.connect(lp); b.connect(bg); bg.connect(g); lp.connect(g); out(g, dst, end);
    };
    // brassy saw stab chord
    I.stab = (dst, t, freqs, v, o = {}) => {
      const end = t + 0.8, g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.setTargetAtTime(0, t + 0.005, o.dec || 0.09);
      const lp = filt('lowpass', 3000, 1.2); lp.frequency.setValueAtTime(o.cut || 3200, t); lp.frequency.setTargetAtTime(500, t, 0.07);
      for (const f of freqs) for (const d of [-9, 9]) { const a = osc('sawtooth', f, t, end); a.detune.value = d; a.connect(lp); }
      lp.connect(g); out(g, dst, end);
    };
    // drums
    I.kick = (dst, t, v, o = {}) => {
      const a = osc('sine', 150, t, t + 0.45); a.frequency.setValueAtTime(o.f0 || 150, t); a.frequency.exponentialRampToValueAtTime(o.f1 || 46, t + 0.11);
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.setTargetAtTime(0, t + 0.03, o.dec || 0.08);
      a.connect(g); out(g, dst, t + 0.45);
      const n = noise(t, t + 0.03, 0.3), hp = filt('highpass', 3000), ng = gain(0); ng.gain.setValueAtTime(v * 0.15, t); ng.gain.setTargetAtTime(0, t, 0.004);
      n.connect(hp); hp.connect(ng); out(ng, dst, t + 0.1);
    };
    I.snare = (dst, t, v, o = {}) => {
      const n = noise(t, t + 0.4, o.off || 0.7), bp = filt('bandpass', o.f || 1900, 0.7), g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, o.dec || 0.055);
      n.connect(bp); bp.connect(g); out(g, dst, t + 0.4);
      if (o.body !== 0) {
        const a = osc('triangle', 200, t, t + 0.2); a.frequency.setValueAtTime(210, t); a.frequency.exponentialRampToValueAtTime(150, t + 0.08);
        const ag = gain(0); ag.gain.setValueAtTime(0, t); ag.gain.linearRampToValueAtTime(v * 0.55, t + 0.002); ag.gain.setTargetAtTime(0, t + 0.002, 0.035);
        a.connect(ag); out(ag, dst, t + 0.2);
      }
    };
    I.hat = (dst, t, v, o = {}) => {
      const dec = o.dec || 0.018, n = noise(t, t + dec * 8, o.off || 0), hp = filt('highpass', o.f || 7500, 0.6), g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.001); g.gain.setTargetAtTime(0, t + 0.001, dec);
      n.connect(hp); hp.connect(g); out(g, dst, t + dec * 8);
    };
    I.crash = (dst, t, v) => {
      const n = noise(t, t + 1.9, 1.1), hp = filt('highpass', 4500, 0.5), g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, 0.4);
      n.connect(hp); hp.connect(g); out(g, dst, t + 1.9);
    };
    return I;
  }

  // ------------------------------------------------------------------ song renderer (exact loop by folding the tail)
  function makeIR(ctx, secs, seed) {
    const n = Math.floor(secs * SR), b = ctx.createBuffer(1, n, SR), d = b.getChannelData(0), r = rng(seed); let lp = 0;
    for (let i = 0; i < n; i++) { const x = r() * 2 - 1, tt = i / SR; lp += (x - lp) * 0.4; d[i] = lp * Math.exp(-6.9 * tt / secs) * Math.min(1, tt / 0.012); }
    return b;
  }
  // Circular look-ahead peak limiter for a loop: brings the tracks to a similar loudness (RMS target) while
  // holding the peak ceiling, shaving at most `maxBoost` dB off drum transients. Wraps around, so the loop
  // stays seamless.
  function levelLoop(x, ceilDb, rmsDb, maxBoost) {
    const N = x.length, ceil = Math.pow(10, ceilDb / 20); scaleTo(x, ceilDb);
    let ss = 0; for (let i = 0; i < N; i++) ss += x[i] * x[i];
    const boost = Math.min(maxBoost, Math.max(0, rmsDb - 10 * Math.log10(ss / N))); if (boost < 0.05) return;
    const k = Math.pow(10, boost / 20), W = 128, H = W >> 1, m = new Float32Array(N).fill(1), g = new Float32Array(N);
    for (let i = 0; i < N; i++) { x[i] *= k; const a = Math.abs(x[i]); if (a > ceil) { const r = ceil / a; for (let j = i - W; j <= i + W; j++) { const q = (j + N) % N; if (r < m[q]) m[q] = r; } } }
    const rel = 1 - Math.exp(-1 / (0.06 * SR)); let v = 1;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) { v = Math.min(m[i], v + (1 - v) * rel); g[i] = v; }
    let sum = 0; for (let j = -H; j <= H; j++) sum += g[(j + N) % N];
    for (let i = 0; i < N; i++) { const gi = sum / (2 * H + 1); sum += g[(i + H + 1) % N] - g[(i - H + N) % N]; m[i] = gi; }
    for (let i = 0; i < N; i++) x[i] *= m[i];
  }
  // Render `bars` bars at `bpm`, plus a tail. Everything ringing past the loop point is added back onto the head,
  // which is exactly what repeated playback sounds like, so the loop is sample-accurate with no crossfade smear.
  let chanIx = 0;
  async function song(name, { bpm, bars, beats = 4, tail = 4, db = -12, rms = -25, rev = 2.2, echo = [0.4, 0.3] }, build) {
    if (ONLY && !ONLY.includes(name)) return;
    const N = Math.round(bars * beats * 60 / bpm * SR), L = N / SR;
    const ctx = new OfflineAudioContext(1, N + Math.ceil(tail * SR), SR), I = Inst(ctx);
    const master = I.gain(1); master.connect(ctx.destination);
    const conv = ctx.createConvolver(); conv.buffer = makeIR(ctx, rev, 777); const revIn = I.gain(1); revIn.connect(conv); conv.connect(master);
    const dl = ctx.createDelay(2), fb = I.gain(echo[1]), elp = I.filt('lowpass', 2600, 0.5), echoIn = I.gain(1);
    dl.delayTime.value = echo[0]; echoIn.connect(dl); dl.connect(elp); elp.connect(fb); fb.connect(dl); elp.connect(master); const er = I.gain(0.4); elp.connect(er); er.connect(revIn);
    chanIx = 0;
    const chan = (vol, r = 0, e = 0) => {
      const g = I.gain(SOLO == null || SOLO === chanIx++ ? vol : 0); g.connect(master);
      if (r) { const s = I.gain(r); g.connect(s); s.connect(revIn); }
      if (e) { const s = I.gain(e); g.connect(s); s.connect(echoIn); }
      return g;
    };
    // continuous oscillator: frequency snapped to a whole number of cycles per loop, so it wraps seamlessly
    const drone = (dst, type, f, v, detCents = 0) => {
      const fq = Math.max(1, Math.round(f * Math.pow(2, detCents / 1200) * L)) / L, o = I.osc(type, fq, 0, L), g = I.gain(v);
      o.connect(g); g.connect(dst);
    };
    build({ ctx, I, L, bar: L / bars, beat: L / bars / beats, chan, drone, R: rng(bpm * 31 + bars) });
    // deterministic cleanup: pause the offline render every half second and disconnect voices that have ended
    const live = I.live.sort((a, b) => a[0] - b[0]), total = ctx.length / SR; let li = 0;
    for (let q = Math.round(0.5 * SR / 128); q * 128 / SR < total - 0.1; q += Math.round(0.5 * SR / 128)) {
      const ts = q * 128 / SR;
      ctx.suspend(ts).then(() => { while (li < live.length && live[li][0] + 0.05 < ts) live[li++][1].disconnect(); ctx.resume(); });
    }
    const d = (await ctx.startRendering()).getChannelData(0), loop = new Float32Array(N);
    for (let i = 0; i < d.length; i++) loop[i % N] += d[i];
    levelLoop(loop, db, rms, 5);
    const n = Math.floor(SR * (512 / SR)), ext = new Float32Array(N + n); // BK.wav's crossfade then reduces to an identity
    ext.set(loop); ext.set(loop.subarray(0, n), N);
    OUT[name] = BK.wav(toBuf(ext), n / SR);
  }

  // ================================================================== MUSIC
  // The songs render concurrently (each OfflineAudioContext gets its own render thread).
  const jobs = [];
  // --- bgm_town: F major, 96 bpm, 16 bars (40 s), lightly swung. Plucked arps, warm pad, ocarina melody.
  jobs.push(song('bgm_town', { bpm: 96, bars: 16, tail: 4, echo: [0.469, 0.25] }, S => {
    const { I, bar, chan } = S, SW = 0.16;
    const CH = ['F', 'Am7', 'Bbmaj7', 'C', 'F', 'Dm7', 'Gm7', 'C7', 'Bbmaj7', 'C', 'Am7', 'Dm7', 'Gm7', 'Am7', 'Bbmaj7', 'C7'];
    const MEL =
      'A4 - - C5 F5 - A5 - | G5 - - F5 E5 - C5 - | D5 - - F5 A5 - F5 - | G5 - - - E5 - D5 C5 |' +
      'A4 - - C5 F5 - A5 - | C6 - - A5 F5 - D5 - | Bb5 - A5 - G5 - F5 - | E5 - - - G5 - - . |' +
      'D6 - - C6 Bb5 - A5 - | G5 - - - E5 - C5 - | C6 - - A5 E5 - A5 - | D5 - F5 - A5 - C6 - |' +
      'Bb5 - - A5 G5 - D5 - | C6 - - Bb5 A5 - E5 - | D6 - C6 - Bb5 - A5 - | G5 - E5 - C5 - Bb4 -';
    const mel = chan(1, 0.28, 0.14), glk = chan(3.5, 0.3, 0.2), arp = chan(1.8, 0.22), pad = chan(1.7, 0.3), bs = chan(0.42, 0.05), dr = chan(0.9, 0.08);
    for (const e of seq(MEL, bar, 0, SW)) I.flute(mel, e.t, hz(e.m), e.d, 0.2);
    for (const e of seq(MEL, bar, 0, SW)) if (e.t >= bar * 8) I.bell(glk, e.t, hz(e.m + 12), 0.035, { ratio: 4, index: 1.2, decay: 0.45 });
    const ARP = [0, 1, 2, 3, 4, 3, 2, 1];
    CH.forEach((c, b) => {
      const L = arpList(c, 48);
      for (let i = 0; i < 8; i++) I.pluck(arp, stepT(bar, b, i, 8, SW), hz(L[ARP[i]]), 0.3, i % 2 ? 0.055 : 0.075, { decay: 0.32, bright: 6 });
      const r = rootIn(c, 36);
      I.bass(bs, stepT(bar, b, 0), hz(r), bar * 0.36, 0.34, { cut: 500 });
      I.bass(bs, stepT(bar, b, 4), hz(r + 7), bar * 0.36, 0.28, { cut: 500 });
      I.kick(dr, stepT(bar, b, 0), 0.32); I.kick(dr, stepT(bar, b, 4), 0.22);
      I.snare(dr, stepT(bar, b, 2), 0.05, { f: 1300, dec: 0.09, body: 0 }); I.snare(dr, stepT(bar, b, 6), 0.05, { f: 1300, dec: 0.09, body: 0 });
      for (let i = 0; i < 8; i++) I.hat(dr, stepT(bar, b, i, 8, SW), i % 2 ? 0.035 : 0.022, { off: (b * 8 + i) * 0.013 });
    });
    for (const g of runs(CH)) for (const m of voicing(g.sym, 55)) I.pad(pad, g.bar * bar, hz(m), g.n * bar - 0.05, 0.022, { att: 0.5, rel: 0.35, cut: 1100 });
  }));

  // --- bgm_field: G major, 128 bpm, 16 bars (30 s). Octave-bouncing bass, offbeat skank, pulse lead.
  jobs.push(song('bgm_field', { bpm: 128, bars: 16, tail: 3, echo: [0.352, 0.2] }, S => {
    const { I, bar, chan } = S;
    const CH = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'C', 'D', 'Bm7', 'Em', 'Am7', 'Bm7', 'C', 'D'];
    const MEL =
      'G4 - B4 D5 G5 - F#5 G5 | A5 - - - F#5 - D5 - | E5 - G5 - B5 - A5 G5 | G5 - - - E5 - - . |' +
      'G4 - B4 D5 G5 - F#5 G5 | A5 - - - B5 - A5 F#5 | G5 - E5 - C6 - B5 A5 | A5 - - - D5 - E5 F#5 |' +
      'G5 - - E5 - - G5 - | F#5 - - D5 - - F#5 - | A5 - B5 - A5 - F#5 - | G5 - - E5 - - B4 - |' +
      'C6 - B5 - A5 - G5 - | B5 - A5 - F#5 - D5 - | E5 - G5 - C6 - B5 - | A5 - - - F#5 - D5 -';
    const ld = chan(1, 0.18, 0.12), sk = chan(1.5, 0.15), pad = chan(1.2, 0.25), bs = chan(0.25, 0.03), dr = chan(0.5, 0.06), glk = chan(3, 0.25, 0.15);
    for (const e of seq(MEL, bar)) I.lead(ld, e.t, hz(e.m), e.d, 0.13, { cut: 2400, duty: 0.25 });
    for (const e of seq(MEL, bar)) if (e.t >= bar * 12) I.bell(glk, e.t, hz(e.m + 12), 0.025, { ratio: 4, index: 1, decay: 0.3 });
    const BO = [0, 12, 0, 12, 0, 12, 7, 12];
    CH.forEach((c, b) => {
      const r = rootIn(c, 36);
      for (let i = 0; i < 8; i++) I.bass(bs, stepT(bar, b, i), hz(r + BO[i]), bar / 8 * 0.6, i % 2 ? 0.2 : 0.26, { wave: 'square', env: 7, cut: 900, sus: 0.5, dec: 0.08, subMix: 0.6 });
      const v = voicing(c, 60);
      for (const i of [1, 3, 5, 7]) for (const m of v) I.pluck(sk, stepT(bar, b, i), hz(m), bar / 8 * 0.5, 0.032, { damp: 1, decay: 0.12, bright: 5 });
      I.kick(dr, stepT(bar, b, 0), 0.42); I.kick(dr, stepT(bar, b, 4), 0.38); if (b % 2) I.kick(dr, stepT(bar, b, 7), 0.25);
      I.snare(dr, stepT(bar, b, 2), 0.16); I.snare(dr, stepT(bar, b, 6), 0.16);
      for (let i = 0; i < 8; i++) I.hat(dr, stepT(bar, b, i), i % 2 ? 0.05 : 0.028, { off: (b * 8 + i) * 0.011, dec: b % 4 === 3 && i === 7 ? 0.08 : 0.018 });
    });
    I.crash(dr, 0, 0.05); I.crash(dr, 8 * bar, 0.04);
    for (const g of runs(CH)) for (const m of voicing(g.sym, 55)) I.pad(pad, g.bar * bar, hz(m), g.n * bar - 0.05, 0.014, { att: 0.3, rel: 0.25, cut: 1200 });
  }));

  // --- bgm_deep: D minor, 80 bpm, 12 bars (36 s). Fifth drone, slow pad, sparse echoing FM bells, wind.
  jobs.push(song('bgm_deep', { bpm: 80, bars: 12, tail: 5, rev: 3, echo: [0.5625, 0.42] }, S => {
    const { I, bar, chan, drone, L } = S;
    const CH = ['Dm', 'Dm', 'Bbmaj7', 'Bbmaj7', 'Gm7', 'Gm7', 'A7sus4', 'A7', 'Dm', 'Bbmaj7', 'Gm7', 'A7'];
    const BEL =
      'A5 . . E5 . . F5 . | D5 . . . . . . . | D6 . . A5 . . F5 . | C6 . . . . . . . |' +
      'Bb5 . . F5 . . G5 . | D5 . . . . . . . | E5 . . D5 . . E5 . | C#6 . . . A5 . . . |' +
      'F5 . . A5 . . D6 . | C6 . . . F5 . . . | Bb5 . . A5 . . G5 . | E5 . . . . . . .';
    const bl = chan(1, 0.35, 0.45), pad = chan(1, 0.4), dn = chan(0.5, 0.1), hp = chan(2.2, 0.35, 0.25), bs = chan(0.55, 0.2), wd = chan(3, 0.3);
    for (const e of seq(BEL, bar)) I.bell(bl, e.t, hz(e.m), 0.13, { ratio: 1.41, index: 1.6, mdec: 0.35, decay: 1.1 });
    // drone: D2 + A2 + D3, lowpassed, whole-cycle-per-loop so it wraps seamlessly
    const dlp = I.filt('lowpass', 380, 0.6); dlp.connect(dn);
    drone(dlp, 'sawtooth', hz(38), 0.05, -6); drone(dlp, 'sawtooth', hz(38), 0.05, 6); drone(dlp, 'sawtooth', hz(45), 0.035, 4); drone(dlp, 'triangle', hz(50), 0.05);
    for (const g of runs(CH)) {
      for (const m of voicing(g.sym, 57)) I.pad(pad, g.bar * bar, hz(m), g.n * bar - 0.1, 0.018, { att: 1.4, rel: 0.9, cut: 750 });
      for (let k = 0; k < g.n; k++) I.pluck(bs, (g.bar + k) * bar, hz(rootIn(g.sym, 38)), 1, 0.12, { decay: 0.7, bright: 3, wave: 'triangle' });
    }
    // quiet harp arpeggio in the second half
    CH.forEach((c, b) => { if (b < 8) return; const A = arpList(c, 50); for (let i = 0; i < 4; i++) I.harp(hp, stepT(bar, b, i, 4), hz(A[i + 1]), 0.045, { decay: 0.7 }); });
    // wind swells every 4 bars
    for (let k = 0; k < 3; k++) {
      const t = k * 4 * bar, n = I.noise(t, t + 4 * bar + 4, k * 0.37), bp = I.filt('bandpass', 350, 1.8), g = I.gain(0);
      bp.frequency.setValueAtTime(300, t); bp.frequency.linearRampToValueAtTime(900, t + 2 * bar); bp.frequency.linearRampToValueAtTime(300, t + 4 * bar);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 2 * bar); g.gain.linearRampToValueAtTime(0, t + 4 * bar);
      n.connect(bp); bp.connect(g); g.connect(wd);
    }
  }));

  // --- bgm_boss: E minor, 150 bpm, 16 bars (25.6 s). Driving drums, saw bass ostinato, 3+3+2 stabs, lead.
  jobs.push(song('bgm_boss', { bpm: 150, bars: 16, tail: 3, rev: 1.6, echo: [0.3, 0.2] }, S => {
    const { I, bar, chan } = S;
    const CH = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B', 'Am', 'Am', 'Em', 'Em', 'C', 'D', 'B', 'B'];
    const MEL =
      '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . |' +
      'E5 - - F#5 - - G5 - | F#5 - - E5 - - B4 - | C5 - - E5 - - G5 - | F#5 - - - D#5 - - - |' +
      'A5 - - - - - G5 A5 | C6 - B5 - A5 - E5 - | G5 - - - - - F#5 G5 | B5 - A5 - G5 - E5 - |' +
      'E5 - - G5 - - C6 - | D6 - - C6 - - A5 - | B5 - - - A5 - F#5 - | D#5 - - - F#5 - B5 -';
    const ld = chan(1, 0.15, 0.1), st = chan(3, 0.12), bs = chan(0.28, 0.02), dr = chan(0.43, 0.05), ar = chan(1.8, 0.12), pad = chan(2.4, 0.2);
    for (const e of seq(MEL, bar)) I.lead(ld, e.t, hz(e.m), e.d, 0.12, { duty: 0.5, cut: 2200, vib: 16 });
    const BO = [0, 0, 12, 0, 0, 12, 7, 12], AR = [0, 1, 2, 1];
    CH.forEach((c, b) => {
      const r = rootIn(c, 36);
      for (let i = 0; i < 8; i++) I.bass(bs, stepT(bar, b, i), hz(r + BO[i]), bar / 8 * 0.7, 0.24, { wave: 'sawtooth', env: 6, sus: 0.6, dec: 0.1, subMix: 0.7 });
      const v = voicing(c, 55).map(hz);
      for (const i of [0, 3, 6]) I.stab(st, stepT(bar, b, i), v, i ? 0.03 : 0.038);
      const A = arpList(c, 64);
      for (let i = 0; i < 16; i++) I.pluck(ar, stepT(bar, b, i, 16), hz(A[AR[i % 4] + (i >= 8 ? 1 : 0)]), bar / 16 * 0.6, 0.022, { damp: 1, decay: 0.08, bright: 4 });
      I.kick(dr, stepT(bar, b, 0), 0.5); I.kick(dr, stepT(bar, b, 3), 0.4); I.kick(dr, stepT(bar, b, 4), 0.45);
      I.snare(dr, stepT(bar, b, 2), 0.22); I.snare(dr, stepT(bar, b, 6), 0.22);
      for (let i = 0; i < 8; i++) I.hat(dr, stepT(bar, b, i), i % 2 ? 0.04 : 0.055, { off: (b * 8 + i) * 0.017 });
    });
    for (let i = 8; i < 16; i++) I.snare(dr, stepT(bar, 15, i, 16), 0.08 + (i - 8) * 0.02, { body: 0, dec: 0.045 }); // roll back to the top
    I.crash(dr, 0, 0.07); I.crash(dr, 8 * bar, 0.06);
    for (const g of runs(CH)) if (g.bar < 8) for (const m of voicing(g.sym, 64)) I.pad(pad, g.bar * bar, hz(m), g.n * bar - 0.05, 0.01, { att: 0.2, rel: 0.2, cut: 1800 });
  }));

  // --- bgm_title: C major, 70 bpm, 8 bars (27.4 s). Harp arpeggios, music box, warm pad, long echo.
  jobs.push(song('bgm_title', { bpm: 70, bars: 8, tail: 5, rev: 3, echo: [0.643, 0.35] }, S => {
    const { I, bar, chan } = S;
    const CH = ['Cmaj7', 'Em7', 'Fmaj7', 'G6', 'Am7', 'Fmaj7', 'Dm7', 'G7sus4'];
    const MEL =
      'E5 - - - - - D5 E5 | G5 - - - - - E5 G5 | A5 - - - - - G5 A5 | B5 - - - - - . . |' +
      'C6 - - - B5 - A5 - | A5 - - - G5 - E5 - | F5 - - - E5 - D5 - | D5 - - - - - . .';
    const mb = chan(1, 0.35, 0.35), fl = chan(0.7, 0.3, 0.2), hp = chan(0.8, 0.3, 0.3), pad = chan(1, 0.4), bs = chan(0.12, 0.15);
    for (const e of seq(MEL, bar)) { I.bell(mb, e.t, hz(e.m), 0.1, { ratio: 4, index: 0.9, decay: 0.9, mdec: 0.1 }); I.flute(fl, e.t, hz(e.m), e.d, 0.05, { att: 0.12, vib: 10 }); }
    const ARP = [0, 1, 2, 3, 4, 5, 4, 3];
    CH.forEach((c, b) => {
      const A = arpList(c, 48);
      for (let i = 0; i < 8; i++) I.harp(hp, stepT(bar, b, i), hz(A[ARP[i]]), 0.06, { decay: 0.8 });
      I.bass(bs, b * bar, hz(rootIn(c, 36)), bar * 0.95, 0.22, { cut: 400, sus: 0.8, dec: 1.2 });
      for (const m of voicing(c, 55)) I.pad(pad, b * bar, hz(m), bar - 0.05, 0.018, { att: 1.0, rel: 0.7, cut: 900 });
    });
  }));

  await Promise.all(jobs);

  // ================================================================== SFX
  async function sfx(name, dur, db, fn) {
    if (ONLY && !ONLY.includes(name)) return;
    const ctx = new OfflineAudioContext(1, Math.ceil(dur * SR), SR), I = Inst(ctx), o = I.gain(1); o.connect(ctx.destination);
    fn(ctx, o, I, rng(name.length * 977 + name.charCodeAt(0)));
    const b = await ctx.startRendering(), d = b.getChannelData(0);
    scaleTo(d, db);
    const f = Math.min(d.length, 220); for (let i = 0; i < f; i++) d[d.length - 1 - i] *= i / f; // guard the render cut
    OUT[name] = BK.wav(b);
  }
  const echoBus = (ctx, o, I, time, fbv, wet) => { const inp = I.gain(1), dl = ctx.createDelay(1), fb = I.gain(fbv), w = I.gain(wet), lp = I.filt('lowpass', 5000); dl.delayTime.value = time; inp.connect(o); inp.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(w); w.connect(o); return inp; };

  // level up: fast G4-C6 arpeggio into a bright held C major chord with glitter
  await sfx('levelup', 1.9, -4, (c, o, I, r) => {
    const e = echoBus(c, o, I, 0.11, 0.3, 0.35);
    [67, 72, 76, 79, 84].forEach((m, i) => { const t = i * 0.065; I.lead(e, t, hz(m), 0.1, 0.16, { duty: 0.25, cut: 5000, rel: 0.04 }); I.harp(e, t, hz(m + 12), 0.05, { decay: 0.2 }); });
    for (const m of [72, 76, 79, 84, 88]) I.lead(e, 0.34, hz(m), 0.75, 0.07, { duty: 0.5, cut: 4000, rel: 0.2, vib: 18 });
    I.bell(e, 0.34, hz(96), 0.08, { ratio: 4, index: 1, decay: 0.4 });
    for (let k = 0; k < 10; k++) { const t = 0.36 + k * 0.08 + r() * 0.04, f = 2400 + r() * 2600; I.bell(e, t, f, 0.05 * (1 - k / 12), { ratio: 3, index: 0.6, decay: 0.08 }); }
    noiseS(c, e, 0.33, 0.9, 0.018, 6000, 'highpass', 0, 11000, 0.05);
  });
  // item pickup: quick rising pop
  await sfx('pickup', 0.35, -7, (c, o, I) => {
    tone(c, o, 0, 'sine', 520, 1300, 0.07, 0.4); tone(c, o, 0.05, 'triangle', 1568, 1568, 0.14, 0.25); tone(c, o, 0.05, 'sine', 3136, 3136, 0.08, 0.06);
  });
  // meso: two metallic clinks (inharmonic partials)
  await sfx('meso', 0.45, -7, (c, o, I) => {
    [[0, 2350], [0.075, 2900]].forEach(([t, f]) => {
      [[1, 0.3, 0.09], [2.76, 0.16, 0.05], [5.4, 0.08, 0.025], [1.51, 0.08, 0.06]].forEach(([k, v, d]) => {
        const a = I.osc('sine', f * k, t, t + d * 7), g = I.gain(0); g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t, d); a.connect(g); g.connect(o);
      });
      noiseS(c, o, t, 0.02, 0.12, 7000, 'highpass');
    });
  });
  // potion: bubbly gulps then a small heal sparkle
  await sfx('potion', 0.75, -6, (c, o, I) => {
    [[0, 330, 820], [0.09, 380, 950], [0.19, 430, 1100]].forEach(([t, a, b]) => tone(c, o, t, 'sine', a, b, 0.07, 0.35, 0.01));
    noiseS(c, o, 0, 0.25, 0.08, 400, 'lowpass', 2, 1200, 0.03);
    tone(c, o, 0.3, 'triangle', hz(84), hz(84), 0.3, 0.08); tone(c, o, 0.37, 'triangle', hz(88), hz(88), 0.35, 0.07); tone(c, o, 0.44, 'sine', hz(91), hz(91), 0.3, 0.05);
  });
  // portal: rising-then-falling warp whoosh with a wobbling tone
  await sfx('portal', 1.2, -5, (c, o, I) => {
    const n = I.noise(0, 1.1, 0.2), bp = I.filt('bandpass', 300, 2.2), g = I.gain(0);
    bp.frequency.setValueAtTime(300, 0); bp.frequency.exponentialRampToValueAtTime(4500, 0.45); bp.frequency.exponentialRampToValueAtTime(700, 1.0);
    g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.5, 0.35); g.gain.linearRampToValueAtTime(0, 1.05);
    n.connect(bp); bp.connect(g); g.connect(o);
    const a = I.osc('sine', 200, 0, 1.0), l = I.osc('sine', 11, 0, 1.0), lg = I.gain(60), ag = I.gain(0);
    a.frequency.setValueAtTime(200, 0); a.frequency.exponentialRampToValueAtTime(1100, 0.45); a.frequency.exponentialRampToValueAtTime(500, 0.95);
    l.connect(lg); lg.connect(a.detune); ag.gain.setValueAtTime(0, 0); ag.gain.linearRampToValueAtTime(0.14, 0.3); ag.gain.linearRampToValueAtTime(0, 0.95);
    a.connect(ag); ag.connect(o);
    for (let k = 0; k < 5; k++) tone(c, o, 0.3 + k * 0.06, 'sine', 1800 + k * 300, 1800 + k * 300, 0.12, 0.03);
  });
  // UI click
  await sfx('click', 0.08, -11, (c, o, I) => {
    tone(c, o, 0, 'square', 1800, 1500, 0.025, 0.2, 0.001); noiseS(c, o, 0, 0.015, 0.3, 4000, 'highpass', 0, 0, 0.001);
  });
  // dialog open: soft two-note chime
  await sfx('open', 0.7, -9, (c, o, I) => {
    I.bell(o, 0, hz(79), 0.3, { ratio: 4, index: 0.8, decay: 0.22 }); I.bell(o, 0.07, hz(86), 0.3, { ratio: 4, index: 0.8, decay: 0.28 });
    I.harp(o, 0.07, hz(74), 0.12, { decay: 0.25 });
  });
  // quest complete: C-E-G run, then a plagal F -> C "amen" landing
  await sfx('quest', 1.7, -4, (c, o, I, r) => {
    const e = echoBus(c, o, I, 0.13, 0.25, 0.3);
    [72, 76, 79].forEach((m, i) => I.lead(e, i * 0.1, hz(m), 0.09, 0.15, { duty: 0.25, cut: 4500 }));
    for (const m of [65, 69, 72, 77]) I.lead(e, 0.32, hz(m), 0.15, 0.06, { duty: 0.5, cut: 3500 });
    for (const m of [64, 67, 72, 76, 84]) I.lead(e, 0.5, hz(m), 0.75, 0.055, { duty: 0.5, cut: 3500, rel: 0.2, vib: 14 });
    I.bass(e, 0.32, hz(41), 0.15, 0.2, { cut: 600 }); I.bass(e, 0.5, hz(36), 0.7, 0.22, { cut: 600, dec: 0.4 });
    for (let k = 0; k < 6; k++) I.bell(e, 0.52 + k * 0.09 + r() * 0.03, 2600 + r() * 2200, 0.03, { ratio: 3, index: 0.5, decay: 0.07 });
  });
  // mob hit: soft thwack
  await sfx('mobhit', 0.3, -5, (c, o, I) => {
    noiseS(c, o, 0, 0.09, 0.5, 1500, 'lowpass', 0, 300); tone(c, o, 0, 'sine', 230, 80, 0.13, 0.55); noiseS(c, o, 0, 0.04, 0.25, 700, 'bandpass', 2);
  });
  // mob die: little squeak into a poof
  await sfx('mobdie', 0.7, -5, (c, o, I) => {
    const a = I.osc('triangle', 700, 0, 0.3), g = I.gain(0), l = I.osc('sine', 28, 0, 0.3), lg = I.gain(80);
    a.frequency.setValueAtTime(700, 0); a.frequency.exponentialRampToValueAtTime(1600, 0.06); a.frequency.exponentialRampToValueAtTime(420, 0.22);
    l.connect(lg); lg.connect(a.detune); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.25, 0.01); g.gain.setTargetAtTime(0, 0.12, 0.04);
    a.connect(g); g.connect(o);
    noiseS(c, o, 0.1, 0.45, 0.45, 1500, 'lowpass', 0, 180, 0.03); tone(c, o, 0.1, 'sine', 260, 110, 0.2, 0.15);
  });
  // player hurt: falling buzzy tone + thump
  await sfx('hurt', 0.4, -5, (c, o, I) => {
    const a = I.osc(0.25, 560, 0, 0.3), lp = I.filt('lowpass', 2200), g = I.gain(0);
    a.frequency.setValueAtTime(560, 0); a.frequency.exponentialRampToValueAtTime(190, 0.2);
    g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.25, 0.005); g.gain.setTargetAtTime(0, 0.12, 0.03);
    a.connect(lp); lp.connect(g); g.connect(o);
    noiseS(c, o, 0, 0.1, 0.45, 900, 'lowpass'); tone(c, o, 0, 'sine', 160, 55, 0.18, 0.6);
  });
  // skill unlock: pentatonic shimmer climbing over a swelling chord
  await sfx('unlock', 1.6, -5, (c, o, I) => {
    const e = echoBus(c, o, I, 0.09, 0.35, 0.35);
    [84, 86, 88, 91, 93, 96, 98].forEach((m, i) => I.bell(e, i * 0.05, hz(m), 0.09, { ratio: 3.01, index: 0.7, decay: 0.3 }));
    for (const m of [60, 64, 67, 72]) I.pad(e, 0, hz(m), 0.55, 0.05, { att: 0.35, rel: 0.25, cut: 2500, wave: 'triangle' });
    noiseS(c, e, 0, 1.0, 0.05, 4000, 'highpass', 0, 12000, 0.4);
  });
  // deny: two low detuned buzzes
  await sfx('deny', 0.35, -12, (c, o, I) => {
    [[0, 170], [0.12, 140]].forEach(([t, f]) => {
      const lp = I.filt('lowpass', 1400), g = I.gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.005); g.gain.setValueAtTime(0.2, t + 0.07); g.gain.linearRampToValueAtTime(0, t + 0.09);
      for (const d of [0, 30]) { const a = I.osc('square', f, t, t + 0.1); a.detune.value = d; a.connect(lp); }
      lp.connect(g); g.connect(o);
    });
  });
  // jump: soft upward swoop
  await sfx('jump', 0.25, -10, (c, o, I) => {
    tone(c, o, 0, 'triangle', 260, 640, 0.12, 0.5, 0.01); tone(c, o, 0, 'sine', 520, 1280, 0.08, 0.12, 0.01); noiseS(c, o, 0, 0.05, 0.08, 1800, 'bandpass', 1.5, 4000);
  });
  // rope grab: two short rustles and a light creak
  await sfx('rope', 0.25, -10, (c, o, I) => {
    noiseS(c, o, 0, 0.05, 0.5, 1700, 'bandpass', 3, 1200); noiseS(c, o, 0.06, 0.05, 0.35, 2100, 'bandpass', 3, 1500);
    tone(c, o, 0.01, 'triangle', 330, 290, 0.06, 0.12); tone(c, o, 0, 'sine', 180, 110, 0.05, 0.25);
  });

  return OUT;
};
