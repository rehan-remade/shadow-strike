// Fire/Poison Arch Mage: Meteor. Staff raised, a rune portal tears open in the top-right sky,
// two small meteors streak onto the dummy, then one giant meteor crashes down: fire dome,
// shockwave, fire pillars and rock debris; the dummy is left charred and burning.
const SKILL = (function () {
  const MAGE = sprite([
    '......oo......',
    '.....oHHo.....',
    '.....ohHo.....',
    '....ohhHHo....',
    '....ohhHHo....',
    '...ohhhHHHo...',
    '...oGGGYGGo...',
    'oBBBBBBBBBBBBo',
    '.ouuuuuuuuuuo.',
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
  ], { o: 0, H: C.robeR1, h: C.robeR2, G: C.gold, Y: C.fireY, B: C.robeR1, u: C.robeR3, W: C.hair0, s: C.hair1, e: 0, x: 35, n: C.hamPink, m: C.hamPinkD, p: C.hamPink });
  const TOP = GY - 22;
  const EMBER_DARK = gradeLevels('#2a0608', [0.24, 0.44, 0.6]);

  // sky portal (tilted rune circle facing the dummy)
  const PX = 171, PY = 13, PR = 18, PSQ = 0.42, CT = Math.cos(0.6), STL = Math.sin(0.6);
  const GT = { x: DX + 3, y: GY - 12 };                 // giant meteor end point
  const GS = { x: PX - 3, y: PY + 3 };                  // giant meteor start (portal core)
  const GLEN = Math.hypot(GT.x - GS.x, GT.y - GS.y), GDX = (GT.x - GS.x) / GLEN, GDY = (GT.y - GS.y) / GLEN;
  const SMOKE = ramp([C.rock0, C.rock1, C.rock1, C.rock2, C.rock2]);
  const EMERGE = 0.3;                                   // fraction of plummet spent emerging

  const pose = { sa: -Math.PI / 2, hx: 4, hy: 3, bx: 0, by: 5 };
  const shown = Object.assign({}, pose);
  let circleR = 0, skyR = 0, open = 0, kick = 0, glow = 0, emberRate = 0;
  let orbX = AX + 7, orbY = TOP, eT = 99, hitI = 0, burn = 0, scorch = 0, heat = 0, tele = 0;
  let volI = 0;

  // meteors: small ones fly on their own clock, the giant is driven by the plummet state
  const NM = 4;
  const M = []; for (let i = 0; i < NM; i++) M.push({ on: 0, x0: 0, y0: 0, x1: 0, y1: 0, t: 0, dur: 0, r: 0, kind: 0, x: 0, y: 0, dx: 0, dy: 1 });
  const giant = { on: 0, x: 0, y: 0, r: 0, spin: 0 };

  // rock chunks from the crater
  const NK = 12;
  const K_on = new Uint8Array(NK), K_x = new Float32Array(NK), K_y = new Float32Array(NK), K_vx = new Float32Array(NK), K_vy = new Float32Array(NK), K_s = new Uint8Array(NK), K_life = new Float32Array(NK), K_b = new Uint8Array(NK);

  // fire pillars: [dx, delay, height]
  const PILLARS = [[-22, 0.10, 14], [-13, 0.04, 26], [-5, 0.0, 36], [5, 0.07, 32], [14, 0.02, 24], [23, 0.12, 15], [-30, 0.18, 8], [31, 0.2, 9]];
  // flames on the charred dummy (local coords)
  const FLAMES = [[-4, -31, 1], [3, -27, 0.8], [-6, -19, 0.9], [5, -15, 1], [-1, -10, 0.7], [7, -21, 0.6], [1, -34, 0.9], [-9, -14, 0.5]];

  function tpt(a, rad) { const x = Math.cos(a) * rad, y = Math.sin(a) * rad * PSQ; return [PX + x * CT - y * STL, PY + x * STL + y * CT]; }
  function tring(rad, c, skip, rot) {
    const n = Math.max(10, Math.ceil(rad * 6.5));
    for (let i = 0; i < n; i++) { if (skip && i % skip === 0) continue; const p = tpt(i / n * 6.2832 + (rot || 0), rad); px(p[0], p[1], c); }
  }
  function drawPortal(r, rot) {
    if (open > 0.03) {
      const cr = r * 0.8 * open, ext = Math.ceil(cr) + 1;
      for (let y = -ext; y <= ext; y++) for (let x = -ext; x <= ext; x++) {
        const u = x * CT + y * STL, v = -x * STL + y * CT;
        const d = Math.sqrt(u * u + (v / PSQ) * (v / PSQ)) / cr;
        if (d > 1) continue;
        const dd = d + (vnoise(u * 0.35 + time * 4, v * 0.8 - time * 2) - 0.5) * 0.45 - kick * 0.25;
        px(PX + x, PY + y, dd < 0.2 ? 35 : dd < 0.42 ? C.fireY : dd < 0.62 ? C.fireO : dd < 0.8 ? C.fireR : dd < 0.93 ? C.crim2 : C.crim3);
      }
    }
    tring(r * 1.16, C.crim2, 3, time * 0.9);
    tring(r, C.fireO);
    tring(r * 0.86, C.crim1, 0);
    for (let t = 0; t < 2; t++) for (let k = 0; k < 3; k++) {
      const a0 = rot * (t ? -1 : 1) + t * Math.PI / 3 + k * 2.0944;
      const p0 = tpt(a0, r * 0.86), p1 = tpt(a0 + 2.0944, r * 0.86);
      line(p0[0], p0[1], p1[0], p1[1], t ? C.fireR : C.fireO);
    }
    for (let k = 0; k < 16; k++) { const p = tpt(-rot * 0.6 + k * 0.3927, r * 0.93); px(p[0], p[1], (k & 1) ? C.fireY : 35); }
    if (kick > 0.3) tring(r * (1.25 + (1 - kick) * 0.5), C.fireY, 2, -time);
  }

  // meteor: flaming tail cone + rock with molten cracks. (dx,dy) = flight direction
  const TAILC = [35, C.fireY, C.fireO, C.fireR, C.crim2, C.crim3, C.crim4];
  function drawMeteor(x, y, r, dx, dy, tail, seed, spin) {
    const step = Math.floor(time * 12);
    const qx = -dy, qy = dx;
    for (let i = tail; i >= 1; i--) {
      const f = i / tail;
      const w = r * (1.05 - f * 0.8) * (0.85 + 0.3 * hash(step + seed, i));
      const wob = (hash(step + 7, i + seed * 17) - 0.5) * f * r * 0.9;
      const cx = x - dx * i + qx * wob, cy = y - dy * i + qy * wob;
      const oi = Math.min(6, 1 + Math.floor(f * 5.5));
      if (f > 0.75 && hash(step, i * 3 + seed) < 0.4) continue;
      disc(cx, cy, w, TAILC[oi]);
      if (w > 1.2) disc(cx, cy, w * 0.5, TAILC[Math.max(0, oi - 2)]);
    }
    // bow shock ahead of the rock
    for (let a = -1.3; a <= 1.3; a += 0.18) {
      const ca = Math.cos(a), sa = Math.sin(a);
      const nx = dx * ca - dy * sa, ny = dx * sa + dy * ca;
      px(x + nx * (r + 1), y + ny * (r + 1), Math.abs(a) < 0.6 ? C.fireY : C.fireO);
    }
    // rock
    const ri = Math.ceil(r), cs = Math.cos(spin), sn = Math.sin(spin);
    for (let oy = -ri; oy <= ri; oy++) for (let ox = -ri; ox <= ri; ox++) {
      const d = Math.hypot(ox, oy);
      if (d > r + 0.2) continue;
      const n = d > 0 ? (ox * dx + oy * dy) / d : 0;
      let c;
      if (d > r - 1) c = n > 0.35 ? C.fireO : n > -0.1 ? C.fireR : C.rock2;
      else {
        const u = ox * cs - oy * sn, v = ox * sn + oy * cs;
        const cr = Math.abs(vnoise(u * 0.5 + seed * 5, v * 0.5 + 3) - 0.5);
        if (cr < 0.06 && r > 3) c = cr < 0.025 ? C.fireY : C.fireO;
        else if (n > 0.55 && d > r * 0.55) c = C.fireR;
        else if (ox - oy * 0.3 < -r * 0.35 && n < 0) c = C.rock0;
        else c = (ox + oy > r * 0.5) ? C.rock2 : C.rock1;
      }
      px(x + ox, y + oy, c);
    }
    if (r <= 4) px(x + dx, y + dy, C.fireY);
  }

  function flame(x, y, h, seed) {
    const step = Math.floor(time * 12);
    if (h < 0.6) { px(x, y, (step + seed) & 1 ? C.fireR : C.fireO); return; }
    for (let dx = -1; dx <= 1; dx++) {
      const hh = Math.round(h * (dx === 0 ? 1 : 0.55) * (0.7 + 0.6 * hash(step + seed, dx + 4)));
      for (let k = 0; k < hh; k++) {
        const f = k / Math.max(1, hh);
        const c = dx !== 0 ? (f > 0.5 ? C.crim2 : C.fireR) : f > 0.75 ? C.fireR : f > 0.4 ? C.fireO : C.fireY;
        px(x + dx + (f > 0.6 && (step + seed) & 1 ? 1 : 0), y - k, c);
      }
    }
  }

  function launch(x0, y0, x1, y1, dur, r, kind) {
    for (const m of M) if (!m.on) {
      Object.assign(m, { on: 1, x0, y0, x1, y1, t: 0, dur, r, kind, x: x0, y: y0 });
      const L = Math.hypot(x1 - x0, y1 - y0); m.dx = (x1 - x0) / L; m.dy = (y1 - y0) / L;
      kick = 1; ringFx(x0, y0, 7, 0.2, RP.fire, 0.6); sfx('meteorFall', dur + 0.05);
      return;
    }
  }

  function smallImpact(m) {
    const x = m.x1, y = m.y1;
    burst(x, y, 22, RP.fire, 95, 0.6, 60, { sz: 0.35, drag: 2 });
    burst(x, y, 8, RP.rock, 80, 1.4, 280, { land: 1, sz: 0.5 });
    ringFx(x, y, 10, 0.25, RP.fire, 0.8);
    sfx('meteorHit');
    if (m.kind === 0) {
      hitDummy(x, y, { push: -1.3, stop: 4, shake: 7, straw: 8, dmg: roll(318000), crit: false, sfx: false, impactC: C.fireO });
    } else {
      ringFx(x, GY, 14, 0.3, RP.fire, 0.25);
      burst(x, GY - 1, 10, RP.ember, 60, 0.8, 90, { a0: -Math.PI, a1: 0 });
      hitDummy(dumX(DUM.left, DUM.belly), dumY(DUM.belly), { push: 1.0, stop: 4, shake: 7, straw: 7, dmg: roll(331000), crit: true, sfx: false, impactC: C.fireO });
    }
  }

  function bigImpact() {
    giant.on = 0; eT = 0; hitI = 0;
    hitDummy(DX, GY - 16, { big: true, push: -3.2, stop: 11, shake: 22, straw: 34, dmg: roll(612000), sfx: false, impactC: C.fireY });
    shakeFx(24, 3); flashFx(2, 1); sfx('meteorBoom');
    dum.skin = 'char'; burn = 1; scorch = 1; heat = 1; kick = 1;
    ringFx(DX, GY, 54, 0.55, RP.fire, 0.17);
    ringFx(DX, GY - 12, 30, 0.3, RP.white, 0.8);
    ringFx(DX, GY, 38, 0.5, RP.crim, 0.2, 0.08);
    burst(DX, GY - 8, 60, RP.fire, 160, 0.8, 70, { sz: 0.45, drag: 2.5 });
    burst(DX, GY - 2, 36, RP.rock, 140, 1.8, 300, { land: 1, a0: -Math.PI, a1: 0, sz: 0.5 });
    burst(DX, GY - 1, 30, RP.ember, 120, 1.2, 120, { a0: -Math.PI, a1: 0 });
    for (let i = 0; i < NK; i++) {
      const side = i & 1 ? 1 : -1;
      K_on[i] = 1; K_x[i] = DX + rr(-5, 5); K_y[i] = GY - rr(3, 10);
      K_vx[i] = side * rr(25, 110); K_vy[i] = rr(-170, -70); K_s[i] = rand() < 0.5 ? 3 : 2; K_life[i] = rr(1.8, 2.6); K_b[i] = 0;
    }
  }

  return {
    title: 'Meteor (Hamster)',
    pad: [98, 146.8, 196, 233.1],
    seq: [
      ['idle', 0.8],
      ['cast', 1.6, { call: 'METEOR' }],
      ['release', 0.2],
      ['volley', 0.85],
      ['plummet', 0.8],
      ['impact', 1.0],
      ['burn', 0.6],
      ['recover', 1.5],
      ['idle', 0.35],
    ],
    reset() {
      for (const m of M) m.on = 0; giant.on = 0; K_on.fill(0);
      circleR = skyR = open = kick = glow = emberRate = burn = scorch = heat = tele = 0; eT = 99; hitI = 0; volI = 0;
    },
    enter(k, i, dur) {
      if (k === 'cast') sfx('fireCharge', dur);
      if (k === 'release') {
        flashFx(2, 1); sfx('whoosh', 0.4); sfx('portal');
        ringFx(orbX, orbY, 8, 0.2, RP.fire, 0.8); burst(orbX, orbY, 18, RP.ember, 90, 0.4, 0);
        for (let q = 0; q < 16; q++) { const j = spawn(orbX, orbY, rr(-40, 80), rr(-90, -20), 1.2, RP.fire, 0, 1); P_tx[j] = PX + rr(-3, 3); P_ty[j] = PY + rr(-2, 2); }
        kick = 1;
      }
      if (k === 'volley') {
        volI = 1;
        launch(PX + 2, PY - 1, dumX(DUM.right - 1, DUM.head + 3), dumY(DUM.head + 3), 0.3, 4.2, 0);
      }
      if (k === 'plummet') { giant.on = 1; giant.r = 0; giant.x = GS.x; giant.y = GS.y; kick = 1; sfx('rumble', 0.8); sfx('portal'); }
      if (k === 'impact') bigImpact();
      if (k === 'burn') sfx('crackle', 1.6);
      if (k === 'idle' && i === 0) { dum.skin = 'normal'; burn = scorch = heat = 0; K_on.fill(0); }
    },
    update(k, p) {
      let t = { sa: -Math.PI / 2, hx: 4, hy: 3, bx: 0, by: 5 };
      if (k === 'cast') t = { sa: -Math.PI / 2 + 0.2, hx: 2, hy: -8, bx: -1, by: -5 };
      else if (k === 'release' || k === 'volley' || k === 'plummet') t = { sa: -0.72, hx: 6, hy: -5, bx: -5, by: 1 };
      else if (k === 'impact') t = { sa: -0.45, hx: 7, hy: -2, bx: -4, by: 2 };
      else if (k === 'burn') t = { sa: -1.05, hx: 5, hy: 0, bx: -2, by: 3 };
      const rate = k === 'release' ? 30 : 12;
      for (const key in t) pose[key] = ease(pose[key], t[key], rate);
      if (tick % 5 === 0 || k === 'release') Object.assign(shown, pose);

      const casting = k === 'cast' || k === 'release' || k === 'volley' || k === 'plummet' || k === 'impact';
      circleR = ease(circleR, casting ? 17 : 0, casting ? 8 : 5);
      const portalOn = (k === 'cast' && p > 0.3) || k === 'release' || k === 'volley' || k === 'plummet';
      skyR = ease(skyR, portalOn ? PR : 0, portalOn ? 6 : 9);
      const openT = k === 'cast' ? p * 0.4 : k === 'release' || k === 'volley' ? 0.65 : k === 'plummet' ? 1 : 0;
      open = ease(open, openT, 7);
      kick = Math.max(0, kick - DT * 3);
      glow = ease(glow, casting ? 1 : 0, 6);
      emberRate = k === 'cast' ? 0.3 + p * 1.1 : (k === 'release' || k === 'volley' || k === 'plummet') ? 1.4 : k === 'impact' || k === 'burn' ? 0.9 : k === 'recover' ? 0.9 * (1 - p) : 0;

      if (k === 'cast') {
        if (tick % 2 === 0) { const j = spawn(0, 0, rand() * 6.28, rr(10, 17), 1.4, RP.ember, 12, 3); P_tx[j] = orbX; P_ty[j] = orbY; }
        if (p > 0.3 && tick % 2 === 0) { const pt = tpt(rand() * 6.28, skyR * 1.4); const j = spawn(pt[0], pt[1], 0, 0, 0.8, RP.ember, 0, 1); P_tx[j] = PX; P_ty[j] = PY; }
      }
      if (k === 'idle' && tick % 9 === 0) spawn(orbX + rr(-1, 1), orbY - 3, rr(-3, 3), rr(-16, -8), rr(.5, .9), RP.ember, -4);
      // embers rising from the ground everywhere
      if (emberRate > 0 && rand() < emberRate) spawn(rr(0, W), GY - rr(0, 2), rr(-5, 5), rr(-36, -14), rr(1.0, 2.2), RP.ember, -8);
      if (emberRate > 0.6 && rand() < emberRate * 0.3) spawn(rr(0, W), GY + 1, rr(-3, 3), rr(-50, -30), rr(0.6, 1.2), RP.fire, 0);

      // volley: second meteor
      if (k === 'volley' && volI === 1 && p * stateDur() >= 0.17) {
        volI = 2;
        launch(PX - 4, PY + 2, DX - 10, GY - 2, 0.3, 4.2, 1);
      }

      // small meteors
      for (const m of M) if (m.on) {
        m.t += DT;
        const q = clamp(m.t / m.dur, 0, 1), e = q * 0.6 + q * q * 0.4;
        m.x = lerp(m.x0, m.x1, e); m.y = lerp(m.y0, m.y1, e);
        spawn(m.x - m.dx * m.r, m.y - m.dy * m.r, -m.dx * rr(20, 50) + rr(-10, 10), -m.dy * rr(20, 50) + rr(-10, 10), rr(0.25, 0.5), RP.fire, -20);
        if (q >= 1) { m.on = 0; smallImpact(m); }
      }

      // giant meteor
      if (k === 'plummet' && giant.on) {
        const tt = p;
        giant.spin += DT * 3;
        if (tt < EMERGE) {
          const e = tt / EMERGE;
          giant.r = easeOut(e) * 8.5;
          giant.x = GS.x + GDX * 2 * e + ((tick >> 1) & 1 ? 0.6 : -0.6); giant.y = GS.y + GDY * 2 * e;
          tele = e * 0.4;
          if (tick % 2 === 0) burst(giant.x, giant.y, 2, RP.fire, 40, 0.4, 0);
        } else {
          const e = easeIn((tt - EMERGE) / (1 - EMERGE));
          giant.r = 8.5;
          giant.x = lerp(GS.x + GDX * 2, GT.x, e); giant.y = lerp(GS.y + GDY * 2, GT.y, e);
          tele = 0.4 + e * 0.6;
          if (tick % 2 === 0) shakeFx(3, 1);
          for (let q = 0; q < 3; q++) {
            const w = rr(-6, 6);
            spawn(giant.x - GDX * 7 - GDY * w, giant.y - GDY * 7 + GDX * w, -GDX * rr(30, 90) + rr(-12, 12), -GDY * rr(30, 90) + rr(-12, 12), rr(0.3, 0.7), RP.fire, -25, 0, 0, rand() < 0.5 ? 2 : 1);
          }
          if (tick % 2 === 0) spawn(giant.x - GDX * 14, giant.y - GDY * 14, rr(-8, 8), rr(-10, 0), rr(0.8, 1.4), SMOKE, -6, 0, 0, 2);
        }
      } else tele = ease(tele, 0, 12);

      // explosion timeline
      if (eT < 5) {
        eT += DT;
        if (hitI === 0 && eT >= 0.13) { hitI = 1; hitDummy(dumX(3, DUM.chest), dumY(DUM.chest), { push: -1, stop: 2, shake: 8, straw: 8, dmg: roll(598000), sfx: true, impactC: C.fireO }); }
        if (hitI === 1 && eT >= 0.26) { hitI = 2; hitDummy(dumX(-2, DUM.head + 2), dumY(DUM.head + 2), { push: 1, stop: 2, shake: 8, straw: 8, dmg: roll(641000), sfx: true, impactC: C.fireO }); }
        if (hitI === 2 && eT >= 0.44) {
          hitI = 3;
          hitDummy(DX, GY - 18, { big: true, push: -2.8, stop: 9, shake: 18, straw: 30, dmg: roll(4380000), crit: true, bigNum: true, sfx: true, impactC: C.fireY });
          flashFx(2, 1);
          ringFx(DX, GY, 44, 0.45, RP.fire, 0.18); ringFx(DX, GY - 16, 22, 0.3, RP.fire, 0.8);
          burst(DX, GY - 16, 40, RP.fire, 140, 0.7, 40, { sz: 0.4, drag: 2 });
        }
        if (eT > 0.25 && eT < 2.2 && tick % 2 === 0) spawn(DX + rr(-12, 12), GY - rr(0, 16), rr(-6, 6), rr(-20, -8), rr(0.8, 1.4), SMOKE, -3, 0, 0, 2);
      }
      // debris chunks
      for (let i = 0; i < NK; i++) if (K_on[i]) {
        K_life[i] -= DT;
        if (K_life[i] <= 0) { K_on[i] = 0; continue; }
        if (K_b[i] < 2) {
          K_vy[i] += 320 * DT; K_x[i] += K_vx[i] * DT; K_y[i] += K_vy[i] * DT;
          if (tick % 2 === 0) spawn(K_x[i], K_y[i], rr(-5, 5), rr(-5, 5), 0.3, RP.fire, 0);
          if (K_y[i] >= GY - K_s[i] + 1 && K_vy[i] > 0) {
            K_y[i] = GY - K_s[i] + 1;
            if (K_b[i] === 0) { K_b[i] = 1; K_vy[i] *= -0.3; K_vx[i] *= 0.45; burst(K_x[i], GY, 3, RP.dust, 30, 0.4, 100, { a0: -Math.PI, a1: 0 }); }
            else { K_b[i] = 2; K_vx[i] = 0; K_vy[i] = 0; }
          }
        } else if (K_life[i] > 0.6 && tick % 20 === i) spawn(K_x[i] + 1, K_y[i] - 1, rr(-2, 2), rr(-12, -6), 1, SMOKE, -2);
      }

      // burning dummy
      if (k === 'impact' || k === 'burn') burn = 1;
      else if (k === 'recover') burn = Math.max(0, 1 - p * 1.25);
      if (burn > 0.05) {
        if (rand() < burn * 0.5) { const f = FLAMES[Math.floor(rand() * FLAMES.length)]; spawn(dumX(f[0], f[1]), dumY(f[1]) - 4, rr(-4, 6), rr(-18, -8), rr(0.6, 1.1), SMOKE, -3, 0, 0, rand() < 0.5 ? 2 : 1); }
        if (rand() < burn * 0.25) { const f = FLAMES[Math.floor(rand() * FLAMES.length)]; spawn(dumX(f[0], f[1]), dumY(f[1]) - 2, rr(-8, 8), rr(-30, -14), rr(0.4, 0.8), RP.ember, -10); }
      }
      if (k === 'recover') {
        scorch = Math.max(0, 1 - p * 1.1); heat = Math.max(0, 1 - p * 2);
        if (p < 0.5) dum.skin = 'char';
        else if (p < 0.93) dum.skin = hash(tick >> 2, 17) < (p - 0.5) / 0.43 ? 'normal' : 'char';
        else dum.skin = 'normal';
      } else if (k === 'burn') heat = Math.max(0.6, heat - DT * 0.4);
    },
    grade(k, p) {
      let lvl = 0;
      if (k === 'cast') lvl = Math.floor(p * 2.99);
      else if (k === 'release' || k === 'volley' || k === 'plummet' || k === 'impact' || k === 'burn') lvl = 3;
      else if (k === 'recover') lvl = Math.floor((1 - p) * 3.99);
      return EMBER_DARK[Math.min(3, lvl)];
    },
    drawBack(k, p) {
      if (scorch > 0.02) {
        const rad = 30 * (0.4 + scorch * 0.6);
        for (let x = Math.floor(DX - rad); x <= DX + rad; x++) {
          const d = Math.abs(x - DX) / rad;
          if (bay(x, GY) < (1 - d) * scorch * 1.4) px(x, GY, d < 0.5 ? C.rock2 : C.dirtD);
          if (bay(x, GY + 1) < (1 - d) * scorch * 1.2) px(x, GY + 1, C.rock2);
          if (bay(x, GY - 1) < (0.7 - d) * scorch && hash(x, 9) < 0.5) px(x, GY - 1, C.rock2);
        }
      }
    },
    drawActor(k, p) {
      const bx0 = AX - 7, by0 = TOP;
      const bob = (k === 'idle' || k === 'recover') ? (Math.floor(time * 2.2) & 1) : 0;
      const fx = bx0 + 10, fy = by0 + 14 + bob, bkx = bx0 + 6, bky = by0 + 14 + bob;
      const hx = Math.round(fx + shown.hx), hy = Math.round(fy + shown.hy);
      const dx = Math.cos(shown.sa), dy = Math.sin(shown.sa);
      orbX = Math.round(hx + dx * 17); orbY = Math.round(hy + dy * 17);
      const staff = () => {
        line(hx - dx * 6, hy - dy * 6, hx + dx * 14, hy + dy * 14, C.rock2);
        line(hx - dx * 6 + 1, hy - dy * 6, hx + dx * 13 + 1, hy + dy * 13, C.wood);
        px(hx + dx * 14, hy + dy * 14, C.goldD); px(hx + dx * 15 - dy, hy + dy * 15 + dx, C.gold); px(hx + dx * 15 + dy, hy + dy * 15 - dx, C.gold);
      };
      const casting = k !== 'idle' && k !== 'recover';
      if (!casting) staff();
      line(bkx, bky, bkx + shown.bx, bky + shown.by, C.hair1);
      px(bkx + shown.bx, bky + shown.by + 1, C.hamPink);
      const fg = fireGlow();
      drawRows(MAGE, bx0, by0, { bob, bobRows: 21, rimL: fg > 0.82 ? 8 : -1, rimR: glow > 0.4 ? ((tick >> 2) & 1 ? C.fireO : C.fireY) : -1, rimRows: [9, 20] });
      
      if (casting) staff();
      line(fx, fy, hx, hy, C.hair0); line(fx, fy + 1, hx, hy + 1, 0);
      px(hx, hy, C.hamPink); px(hx, hy + 1, C.hamPinkD);
    },
    drawFx(k, p) {
      const step = Math.floor(time * 12);
      // ground circle under the mage
      if (circleR > 1) {
        magicCircle(AX, GY, circleR, time * 1.8, C.fireO, C.crim1, 0.3, { runes: 14 });
        if (circleR > 12) for (let q = 0; q < 4; q++) { const a = time * 2 + q * 1.57; flame(AX + Math.cos(a) * circleR * 0.62, GY + Math.sin(a) * circleR * 0.18, 2 + hash(step, q) * 3, q); }
      }
      // sky portal
      if (skyR > 1) drawPortal(skyR, time * 1.2);
      // target telegraph under the dummy
      if (tele > 0.05) {
        const tr = 5 + tele * 18 + ((tick >> 2) & 1);
        ellipse(DX, GY, tr, tr * 0.24, (tick >> 2) & 1 ? C.crim1 : C.fireO);
        ellipse(DX, GY, tr * 0.6, tr * 0.6 * 0.24, C.crim2, 2);
      }
      // glowing embers in the scorch
      if (heat > 0.02) {
        for (let x = DX - 26; x <= DX + 26; x++) {
          const d = Math.abs(x - DX) / 26;
          const h = hash(x, step >> 2);
          if (h < heat * 0.35 * (1 - d)) px(x, GY + (h < heat * 0.12 ? 0 : 1), h < heat * 0.1 ? C.fireO : C.fireR);
        }
      }
      // flames on the dummy
      if (burn > 0.02) {
        for (let i = 0; i < FLAMES.length; i++) {
          const f = FLAMES[i];
          const h = burn * f[2] * 7.5 - (1 - burn) * i * 0.5;
          if (h > 0.3) flame(dumX(f[0], f[1]), dumY(f[1]), h, i * 5);
        }
      }
      // fire pillars
      if (eT < 1.2) {
        for (let i = 0; i < PILLARS.length; i++) {
          const [pdx, del, mh] = PILLARS[i];
          const t = eT - del; if (t < 0 || t > 0.8) continue;
          const h = Math.round(mh * (t < 0.1 ? easeOut(t / 0.1) : 1 - easeIn((t - 0.1) / 0.7)));
          const w = mh > 20 ? 2 : 1;
          for (let y = 0; y < h; y++) {
            const f = y / h;
            if (f > 0.8 && hash(step + i, y) < 0.5) continue;
            const half = Math.round(w * (1 - f * 0.6) + (hash(step, i * 40 + y) > 0.7 ? 1 : 0));
            const ox = Math.round(Math.sin(y * 0.45 + step * 1.7 + i) * f * 1.5);
            for (let x = -half; x <= half; x++) {
              const edge = Math.abs(x) === half;
              const c = edge ? (f > 0.55 ? C.crim2 : C.fireR) : f > 0.7 ? C.fireR : (x === 0 && f < 0.45) ? C.fireY : C.fireO;
              px(DX + pdx + x + ox, GY - y, c);
            }
          }
        }
      }
      // explosion dome
      if (eT < 0.85) {
        const R0 = 9 + 23 * easeOut(Math.min(1, eT / 0.26));
        const fade = Math.max(0, (eT - 0.3) / 0.55);
        const ext = Math.ceil(R0) + 1;
        for (let y = -ext; y <= 2; y++) for (let x = -ext; x <= ext; x++) {
          const X0 = DX + x, Y0 = GY + y;
          const n = vnoise(X0 / 4 + eT * 6, Y0 / 4 - eT * 14);
          const d = Math.hypot(x, y * 1.15) / Math.max(1, R0) + (n - 0.5) * 0.35 + fade * 0.55;
          if (d > 1) continue;
          if (fade > 0 && bay(X0, Y0) < fade * 1.1 - (1 - d) * 0.3) continue;
          px(X0, Y0, d < 0.3 ? 35 : d < 0.5 ? C.fireY : d < 0.7 ? C.fireO : d < 0.87 ? C.fireR : C.crim2);
        }
      }
      // debris chunks
      for (let i = 0; i < NK; i++) if (K_on[i]) {
        const x = Math.round(K_x[i]), y = Math.round(K_y[i]), s = K_s[i];
        if (K_life[i] < 0.5 && ((tick >> 1) & 1)) continue;
        R(x, y, s, s, C.rock1); px(x, y, C.rock0); px(x + s - 1, y + s - 1, C.rock2);
        if (K_life[i] > 0.9) px(x + (s > 2 ? 1 : 0), y + (s > 2 ? 1 : 1), (tick >> 2) & 1 ? C.fireO : C.fireR);
      }
      // speed lines while the giant falls
      if (k === 'plummet' && p > EMERGE) {
        for (let q = 0; q < 7; q++) {
          const s0 = hash(q, step), s1 = hash(q + 50, step);
          const ox = -40 + s0 * 200, oy = -20 + s1 * 40, len = 8 + hash(q, step + 3) * 12;
          line(ox, oy, ox + GDX * len, oy + GDY * len, q & 1 ? C.crim2 : C.fireR);
        }
      }
      // meteors
      for (const m of M) if (m.on) drawMeteor(m.x, m.y, m.r, m.dx, m.dy, 18, 3, time * 5);
      if (giant.on && giant.r > 0.5) drawMeteor(giant.x, giant.y, giant.r, GDX, GDY, Math.round(giant.r * 4.5), 1, giant.spin);
      // staff orb (drawn after grading so it stays bright)
      const big = glow > 0.4;
      disc(orbX, orbY, big ? 2.2 : 1.6, C.fireR);
      disc(orbX, orbY - (big ? 0.5 : 0), big ? 1.3 : 0.8, C.fireO);
      px(orbX, orbY, C.fireY);
      if (big) px(orbX - 1, orbY - 1, 35);
      flame(orbX, orbY - 2, big ? 4 + ((tick >> 2) & 1) : 2.5, 11);
      if (big && k === 'cast') ellipse(orbX, orbY - 1, 4 + ((tick >> 2) & 1), 4 + ((tick >> 2) & 1), C.fireO, 2);
    },
  };
})();

SND.fireCharge = (c, o, t, d) => { noiseS(c, o, t, d, 0.28, 200, 'lowpass', 0, 1600, d * 0.8); tone(c, o, t, 'sawtooth', 55, 110, d, 0.04, d * 0.7); tone(c, o, t, 'sine', 110, 440, d, 0.06, d * 0.8); tone(c, o, t, 'triangle', 165, 660, d, 0.03, d * 0.8); };
SND.portal = (c, o, t) => { tone(c, o, t, 'triangle', 240, 110, 0.8, 0.06); tone(c, o, t, 'sine', 360, 170, 0.8, 0.04); noiseS(c, o, t, 0.6, 0.2, 900, 'bandpass', 3, 300); };
SND.meteorFall = (c, o, t, d) => { d = d || 0.4; noiseS(c, o, t, d, 0.45, 3500, 'bandpass', 1.5, 350, d * 0.7); tone(c, o, t, 'sawtooth', 900, 140, d, 0.035, d * 0.6); };
SND.meteorHit = (c, o, t) => { noiseS(c, o, t, 0.35, 0.8, 1500, 'lowpass', 0, 150); tone(c, o, t, 'sine', 150, 40, 0.3, 0.7); noiseS(c, o, t + 0.02, 0.25, 0.22, 4000, 'highpass'); };
SND.meteorBoom = (c, o, t) => {
  SND.boom(c, o, t); noiseS(c, o, t, 0.9, 0.6, 2500, 'lowpass', 0, 200); tone(c, o, t, 'sawtooth', 70, 28, 1.2, 0.25);
  for (let i = 0; i < 10; i++) noiseS(c, o, t + 0.15 + i * 0.07, 0.04, 0.25 * (1 - i / 12), 3000, 'highpass');
};
SND.crackle = (c, o, t, d) => { d = d || 1.5; noiseS(c, o, t, d, 0.08, 400, 'lowpass', 0, 0, d * 0.3); for (let i = 0; i < 14; i++) noiseS(c, o, t + hash(i, 5) * d, 0.03, 0.12, 2500 + hash(i, 6) * 2000, 'highpass'); };
SND.rumble = (c, o, t, d) => { d = d || 0.8; noiseS(c, o, t, d, 0.45, 140, 'lowpass', 0, 0, d * 0.85); tone(c, o, t, 'sine', 48, 36, d, 0.3, d * 0.85); noiseS(c, o, t + d * 0.4, d * 0.6, 0.35, 3000, 'bandpass', 1.2, 400, d * 0.5); };
