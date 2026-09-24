// Ice Arch Mage: Blizzard. Staff overhead, storm circle over the dummy, ice spears rain,
// final lance freezes the dummy in a crystal cluster that then shatters.
const SKILL = (function () {
  const MAGE = sprite([
    '......oo......',
    '.....oHHo.....',
    '.....oHYo.....',
    '....oHHHho....',
    '....oYHHho....',
    '...oHHHYHho...',
    '...oHYHHHho...',
    '.oBBBBBBBBBBo.',
    'oBBBBYBBBBBBBo',
    '...oWWWWWWo...',
    '..oWeeWWeeWo..',
    '..oWexWWexWo..',
    '..oWWWnnWWso..',
    '.oWWWWWWWWWso.',
    '.oWWWmmmmWWso.',
    '.oWWWWWWWWWso.',
    'oWWWWWWWWWWWso',
    'oWWWWWWWWWWWso',
    'oWWWWWWWWWWWso',
    'oWWWWWWWWWWWso',
    'oWWWWWWWWWWWso',
    '.oWWWWWWWWWso.',
    '..oppo..oppo..',
  ], { o: 0, H: C.robeB1, h: C.robeB2, Y: C.gold, B: C.robeB2, W: C.hair0, s: C.hair1, e: 0, x: 35, n: C.hamPink, m: C.hamPinkD, p: C.hamPink });
  const TOP = GY - 22;
  const ICE_DARK = gradeLevels('#081430', [0.22, 0.42, 0.58]);

  const pose = { sa: -Math.PI / 2, hx: 3, hy: 3, bx: 0, by: 5 };
  const shown = Object.assign({}, pose);
  let circleR = 0, skyR = 0, block = 0, cracks = 0, frost = 0, snowRate = 0, windA = 0, glow = 0;
  let crysX = 0, crysY = 0;

  // falling spears
  const NSP = 12;
  const S_on = new Uint8Array(NSP), S_x = new Float32Array(NSP), S_y = new Float32Array(NSP), S_vx = new Float32Array(NSP), S_vy = new Float32Array(NSP), S_big = new Uint8Array(NSP), S_kind = new Uint8Array(NSP), S_ty = new Float32Array(NSP);
  // icicles stuck in the ground
  const NGI = 10;
  const G_on = new Uint8Array(NGI), G_x = new Float32Array(NGI), G_a = new Float32Array(NGI);
  // storm plan: [time, kind(0 dummy / 1 ground), local x or ly]
  const PLAN = [[0.0, 0, DUM.chest], [0.12, 1, -16], [0.24, 0, DUM.head], [0.36, 1, 14], [0.48, 0, DUM.belly], [0.6, 1, -8], [0.72, 0, DUM.chest + 3], [0.84, 1, 20], [0.96, 0, DUM.head + 4]];
  let planI = 0;
  const SV = { vx: -70, vy: 250 }, LEAD = 0.28;

  const PRISMS = [[-10, 3, 15], [-5, 4, 30], [1, 6, 41], [8, 4, 30], [13, 3, 17]];

  function launch(kind, v, big) {
    let tx, ty;
    if (kind === 0) { ty = GY + v; tx = DX + DUM.left + 3 + dumShear(v); }
    else { ty = GY; tx = DX + v; }
    for (let i = 0; i < NSP; i++) if (!S_on[i]) {
      const lead = big ? 0.22 : LEAD, vx = big ? -40 : SV.vx, vy = big ? 380 : SV.vy;
      S_on[i] = 1; S_big[i] = big ? 1 : 0; S_kind[i] = kind; S_ty[i] = ty;
      S_x[i] = tx - vx * lead; S_y[i] = ty - vy * lead; S_vx[i] = vx; S_vy[i] = vy;
      ringFx(S_x[i], S_y[i], big ? 8 : 4, 0.2, RP.iceW, 0.5);
      return;
    }
  }

  function drawSpear(x, y, ang, len, big) {
    const dx = Math.cos(ang), dy = Math.sin(ang), qx = -dy, qy = dx;
    const w = big ? 2 : 1;
    for (let i = 0; i < len; i++) {
      const cx = x - dx * i, cy = y - dy * i;
      const taper = i < 3 ? i / 3 : 1 - Math.max(0, (i - len * 0.6) / (len * 0.4)) * 0.8;
      const ww = Math.round(w * taper + (big && i > 2 ? 0.4 : 0));
      for (let k = -ww - 1; k <= ww + 1; k++) {
        const edge = Math.abs(k) === ww + 1;
        if (edge && !big) continue;
        const c = edge ? C.ice3 : k === 0 ? (i < 2 ? 35 : C.ice0) : Math.abs(k) === ww ? C.ice2 : C.ice1;
        px(cx + qx * k, cy + qy * k, c);
      }
    }
  }

  function crystalAt(x, y, lit) {
    const b = lit && ((tick >> 2) & 1);
    px(x, y - 3, b ? 35 : C.ice0); px(x - 1, y - 2, C.ice1); px(x, y - 2, 35); px(x + 1, y - 2, C.ice2);
    px(x - 1, y - 1, C.ice1); px(x, y - 1, C.ice0); px(x + 1, y - 1, C.ice3);
    px(x - 1, y, C.ice2); px(x, y, C.ice1); px(x + 1, y, C.ice3); px(x, y + 1, C.ice3);
  }

  function shatterAll() {
    for (const [dx0, w, h] of PRISMS) {
      for (let k = 0; k < 16; k++) spawn(DX + dx0 + rr(-w, w), GY - rr(0, h), rr(-60, 70), rr(-120, -20), rr(1.2, 2.2), RP.ice, 260, 0, 1, rand() < 0.3 ? 2 : 1);
    }
    for (let i = 0; i < NGI; i++) if (G_on[i]) { G_on[i] = 0; burst(G_x[i], GY - 4, 10, RP.ice, 70, 1.2, 240, { land: 1, a0: -Math.PI, a1: 0 }); }
    burst(DX, GY - 20, 40, RP.iceW, 130, 0.7, 60, { sz: 0.3 });
    ringFx(DX, GY - 20, 26, 0.4, RP.iceW, 0.8);
    ringFx(DX, GY, 34, 0.5, RP.ice, 0.22);
  }

  return {
    title: 'Blizzard (Hamster)',
    pad: [110, 164.8, 220, 261.6],
    seq: [
      ['idle', 0.9],
      ['cast', 1.7, { call: 'BLIZZARD' }],
      ['release', 0.25],
      ['storm', 1.25],
      ['lance', 0.35],
      ['freeze', 1.0],
      ['shatter', 0.45],
      ['recover', 1.5],
      ['idle', 0.35],
    ],
    reset() { S_on.fill(0); G_on.fill(0); circleR = skyR = block = cracks = frost = snowRate = glow = 0; planI = 0; },
    enter(k, i, dur) {
      if (k === 'cast') sfx('charge', dur);
      if (k === 'release') { flashFx(2, 1); sfx('whoosh', 0.5); ringFx(crysX, crysY, 8, 0.18, RP.iceW, 0.8); burst(crysX, crysY, 20, RP.iceW, 90, 0.4, 0); }
      if (k === 'storm') { planI = 0; sfx('wind'); }
      if (k === 'lance') launch(0, DUM.chest - 2, true);
      if (k === 'shatter') { cracks = 0.01; sfx('crack'); }
      if (k === 'idle' && i === 0) { frost = 0; }
    },
    update(k, p) {
      // pose targets
      let t = { sa: -Math.PI / 2, hx: 3, hy: 3, bx: 0, by: 5 };
      if (k === 'cast') t = { sa: -Math.PI / 2 - 0.12, hx: 1, hy: -8, bx: -1, by: -5 };
      else if (k === 'release' || k === 'storm' || k === 'lance') t = { sa: -0.8, hx: 6, hy: -4, bx: -5, by: 1 };
      else if (k === 'freeze' || k === 'shatter') t = { sa: -0.55, hx: 6, hy: -2, bx: -4, by: 2 };
      const rate = k === 'release' ? 30 : 12;
      for (const key in t) pose[key] = ease(pose[key], t[key], rate);
      if (tick % 5 === 0 || k === 'release') Object.assign(shown, pose);

      const casting = k === 'cast' || k === 'release' || k === 'storm' || k === 'lance' || k === 'freeze' || k === 'shatter';
      circleR = ease(circleR, casting ? 17 : 0, casting ? 8 : 5);
      skyR = ease(skyR, (k === 'cast' && p > 0.35) || k === 'release' || k === 'storm' || k === 'lance' ? 24 : 0, 6);
      glow = ease(glow, casting ? 1 : 0, 6);
      snowRate = k === 'cast' ? p * 1.2 : (k === 'release' || k === 'storm' || k === 'lance') ? 2.2 : k === 'freeze' || k === 'shatter' ? 1.2 : k === 'recover' ? 1.2 * (1 - p) : 0;
      windA = snowRate;

      // crystal position (from shown pose)
      const fx = AX - 7 + 10, fy = TOP + 14;
      const hx = fx + shown.hx, hy = fy + shown.hy;
      crysX = hx + Math.cos(shown.sa) * 17; crysY = hy + Math.sin(shown.sa) * 17;

      if (k === 'cast') {
        if (tick % 2 === 0) { const i = spawn(0, 0, rand() * 6.28, rr(10, 16), 1.5, RP.iceW, 12, 3); P_tx[i] = crysX; P_ty[i] = crysY; }
        if (p > 0.35 && tick % 3 === 0) { const a = rand() * 6.28; spawn(DX + 2 + Math.cos(a) * skyR, 16 + Math.sin(a) * skyR * 0.28, rr(-8, 8), rr(-4, 4), 0.5, RP.ice, 0); }
      }
      if (k === 'idle' && tick % 70 === 0) for (let q = 0; q < 3; q++) spawn(AX + 5, TOP + 12, rr(6, 14), rr(-3, 1), rr(.5, .9), RP.snow, -2);

      // snow weather
      if (snowRate > 0 && rand() < snowRate) spawn(rr(-30, W), -2, rr(10, 26) * (0.6 + windA * 0.3), rr(16, 28), 4.5, RP.snow, 0, 2, 1);

      // storm: scheduled spears
      if (k === 'storm') {
        const tt = p * stateDur();
        while (planI < PLAN.length && PLAN[planI][0] <= tt) { launch(PLAN[planI][1], PLAN[planI][2], false); planI++; }
      }
      if (k === 'freeze') { block = ease(block, 1, 14); dum.omega *= 0.8; dum.theta *= 0.9; if (tick % 4 === 0) spawn(DX + rr(-14, 14), GY - rr(0, 3), rr(-6, 6), rr(-8, -2), rr(.6, 1.2), RP.snow, 0); }
      if (k === 'shatter') {
        cracks = Math.min(1, p * 2);
        dum.theta *= 0.9;
        if (p > 0.5 && block > 0) {
          block = 0; dum.skin = 'normal';
          shatterAll();
          hitDummy(DX - 2, GY - 20, { big: true, push: 3.2, stop: 9, shake: 18, straw: 26, dmg: roll(2150000), crit: true, bigNum: true, sfx: false });
          flashFx(3, 1); sfx('shatter');
        }
      }
      frost = ease(frost, (k === 'freeze' || k === 'shatter' || k === 'lance' || k === 'storm') ? 1 : k === 'recover' ? 0 : frost, k === 'recover' ? 1.5 : 5);

      // spears
      for (let i = 0; i < NSP; i++) if (S_on[i]) {
        S_x[i] += S_vx[i] * DT; S_y[i] += S_vy[i] * DT;
        if (tick % 2 === 0) spawn(S_x[i] - S_vx[i] * 0.03, S_y[i] - S_vy[i] * 0.03, rr(-6, 6), rr(-6, 6), 0.25, RP.iceW, 0);
        if (S_y[i] >= S_ty[i]) {
          S_on[i] = 0;
          const x = S_x[i], y = S_y[i];
          if (S_kind[i] === 0) {
            burst(x, y, S_big[i] ? 30 : 12, RP.ice, S_big[i] ? 110 : 70, 0.9, 200, { land: 1, sz: 0.2 });
            if (S_big[i]) {
              hitDummy(x, y, { big: true, push: 2.4, stop: 10, shake: 16, straw: 20, dmg: roll(1480000), crit: true, bigNum: true, sfx: false, impactC: C.ice1 });
              dum.skin = 'ice'; block = 0.05; flashFx(2, 1); sfx('freeze');
              ringFx(x, y, 22, 0.35, RP.iceW, 0.8);
            } else {
              hitDummy(x, y, { push: 1.1, stop: 3, straw: 6, dmg: roll(236000), crit: rand() < 0.35, sfx: false, impactC: C.ice1 });
              sfx('ice');
            }
          } else {
            for (let q = 0; q < NGI; q++) if (!G_on[q]) { G_on[q] = 1; G_x[q] = x; G_a[q] = Math.atan2(S_vy[i], S_vx[i]); break; }
            burst(x, GY - 1, 8, RP.snow, 50, 0.7, 150, { land: 1, a0: -Math.PI, a1: 0 });
            ringFx(x, GY, 7, 0.25, RP.ice, 0.3);
            sfx('iceGround');
          }
        }
      }
    },
    grade(k, p) {
      let lvl = 0;
      if (k === 'cast') lvl = Math.floor(p * 2.99);
      else if (k === 'release' || k === 'storm' || k === 'lance' || k === 'freeze' || k === 'shatter') lvl = 3;
      else if (k === 'recover') lvl = Math.floor((1 - p) * 3.99);
      return ICE_DARK[Math.min(3, lvl)];
    },
    drawOnDummy(k, p) {
      // frost patch on the ground around the dummy
      if (frost > 0.02) {
        const rad = frost * 26;
        for (let x = Math.floor(DX - rad); x <= DX + rad; x++) {
          const d = Math.abs(x - DX) / rad;
          if (bay(x, GY) < 1 - d) px(x, GY, d < 0.5 ? C.ice0 : C.ice1);
          if (bay(x, GY - 1) < 0.6 - d && hash(x, 5) < 0.5) px(x, GY - 1, C.ice1);
          if (bay(x, GY + 1) < 0.7 - d) px(x, GY + 1, C.ice2);
        }
      }
    },
    drawActor(k, p) {
      const bx0 = AX - 7, by0 = TOP;
      const bob = (k === 'idle' || k === 'recover') ? (Math.floor(time * 2.2) & 1) : 0;
      const fx = bx0 + 10, fy = by0 + 14 + bob, bkx = bx0 + 6, bky = by0 + 14 + bob;
      const hx = Math.round(fx + shown.hx), hy = Math.round(fy + shown.hy);
      const dx = Math.cos(shown.sa), dy = Math.sin(shown.sa);
      // staff (behind body when idle)
      const staff = () => {
        line(hx - dx * 6, hy - dy * 6, hx + dx * 15, hy + dy * 15, C.wood);
        line(hx - dx * 6 + 1, hy - dy * 6, hx + dx * 13 + 1, hy + dy * 13, C.woodL);
        px(hx + dx * 15, hy + dy * 15, C.gold);
        crystalAt(Math.round(hx + dx * 17), Math.round(hy + dy * 17), glow > 0.3);
        if (glow > 0.3) ellipse(hx + dx * 17, hy + dy * 17 - 1, 4 + ((tick >> 2) & 1), 4 + ((tick >> 2) & 1), C.ice1, 2);
      };
      const casting = k !== 'idle' && k !== 'recover';
      if (!casting) staff();
      // back arm
      line(bkx, bky, bkx + shown.bx, bky + shown.by, C.hair1);
      px(bkx + shown.bx, bky + shown.by + 1, C.hamPink);
      const fg = fireGlow();
      drawRows(MAGE, bx0, by0, { bob, bobRows: 21, rimL: fg > 0.82 ? 8 : -1, rimR: glow > 0.4 ? ((tick >> 2) & 1 ? C.ice1 : C.ice0) : -1, rimRows: [9, 20] });
      
      if (casting) staff();
      // front arm + hand
      line(fx, fy, hx, hy, C.hair0); line(fx, fy + 1, hx, hy + 1, 0);
      px(hx, hy, C.hamPink); px(hx, hy + 1, C.hamPinkD);
    },
    drawFx(k, p) {
      // ground circle under the mage
      if (circleR > 1) {
        magicCircle(AX, GY, circleR, time * 1.8, C.ice2, C.ice1, 0.3, { runes: 14 });
        if (circleR > 12) for (let q = 0; q < 3; q++) { const a = time * 2 + q * 2.1; px(AX + Math.cos(a) * circleR * 0.6, GY - 2 - ((time * 20 + q * 7) % 12), C.ice1); }
      }
      // storm eye in the sky
      if (skyR > 1) {
        magicCircle(DX + 2, 16, skyR, -time * 1.4, C.ice2, C.ice1, 0.28, { runes: 18, sides: 3, inner: true });
        ellipse(DX + 2, 16, skyR * 1.12, skyR * 0.3, C.ice3, 3, time);
      }
      // wind streaks
      if (windA > 0.1) {
        for (let q = 0; q < 8; q++) {
          const y = 6 + Math.floor(hash(q, 3) * 56), len = 6 + Math.floor(hash(q, 4) * 10);
          const x = ((hash(q, 5) * 400 + time * (120 + q * 12)) % (W + 40)) - 20;
          if (windA > 0.6 || q < 4) line(x, y, x + len, y, q & 1 ? C.ice3 : C.ice4);
        }
      }
      // icicles stuck in ground
      for (let i = 0; i < NGI; i++) if (G_on[i]) drawSpear(G_x[i] + Math.cos(G_a[i]) * 3, GY + Math.sin(G_a[i]) * 3, G_a[i], 11, false);
      // crystal cluster
      if (block > 0.01) {
        for (const [dx0, w, h] of PRISMS) {
          const hh = Math.round(h * block), cx = DX + dx0;
          for (let y = 0; y < hh; y++) {
            const yy = GY - y;
            const tip = hh - y;
            const ww = tip < w ? tip : w;
            for (let x = -ww; x <= ww; x++) {
              const edge = Math.abs(x) === ww;
              const X0 = cx + x;
              if (edge) px(X0, yy, x < 0 ? C.ice0 : C.ice3);
              else if (bay(X0, yy) < 0.34) px(X0, yy, C.ice1);
              else if (x === -ww + 1 && bay(X0, yy) < 0.7) px(X0, yy, C.ice0);
            }
          }
          px(cx, GY - hh, 35);
        }
        if (cracks > 0) {
          const n = Math.floor(cracks * 7);
          for (let q = 0; q < n; q++) {
            let x = DX + (hash(q, 11) - 0.5) * 20, y = GY - 6 - hash(q, 12) * 28;
            for (let s = 0; s < 5; s++) { const nx = x + (hash(q, s) - 0.5) * 6, ny = y + (hash(q + 9, s) - 0.5) * 6; line(x, y, nx, ny, 35); x = nx; y = ny; }
          }
        }
      }
      // spears in flight
      for (let i = 0; i < NSP; i++) if (S_on[i]) drawSpear(S_x[i], S_y[i], Math.atan2(S_vy[i], S_vx[i]), S_big[i] ? 20 : 12, S_big[i] === 1);
    },
  };
})();

SND.ice = (c, o, t) => { noiseS(c, o, t, 0.12, 0.5, 3500, 'highpass'); tone(c, o, t, 'sine', 2400, 1200, 0.15, 0.12); tone(c, o, t, 'sine', 180, 60, 0.12, 0.35); };
SND.iceGround = (c, o, t) => { noiseS(c, o, t, 0.1, 0.25, 2500, 'bandpass', 2); tone(c, o, t, 'triangle', 1800, 900, 0.08, 0.04); };
SND.wind = (c, o, t) => { noiseS(c, o, t, 2.6, 0.22, 500, 'bandpass', 1.5, 1800, 0.8); };
SND.freeze = (c, o, t) => { noiseS(c, o, t, 0.5, 0.8, 1200, 'lowpass', 0, 200); tone(c, o, t, 'sine', 110, 40, 0.4, 0.8); for (let i = 0; i < 6; i++) tone(c, o, t + 0.05 + i * 0.04, 'sine', 3000 - i * 200, 2600 - i * 200, 0.2, 0.03); };
SND.crack = (c, o, t) => { for (let i = 0; i < 5; i++) noiseS(c, o, t + i * 0.045, 0.03, 0.35, 4000, 'highpass'); };
SND.shatter = (c, o, t) => { noiseS(c, o, t, 0.7, 0.9, 5000, 'highpass'); noiseS(c, o, t, 0.4, 0.6, 700); tone(c, o, t, 'sine', 90, 30, 0.5, 0.8); for (let i = 0; i < 14; i++) tone(c, o, t + i * 0.025, 'sine', 2200 + hash(i, 1) * 2400, 1800 + hash(i, 2) * 1500, 0.18, 0.035); };
