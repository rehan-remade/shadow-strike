// Bishop: Genesis. A levitating bishop fires Angel Rays, raises the staff over a golden
// hexagram, the sky parts above the dummy and a winged pillar of holy light hammers it.
const SKILL = (function () {
  const BISHOP = sprite([
    '......o.......',
    '.....oWo......',
    '....oWGWo.....',
    '....oWGWo.....',
    '...owWGWWo....',
    '...owWGWWo....',
    '...owWGWWo....',
    '...oGGGGGo....',
    '...ohSssso....',
    '..gohSseso....',
    '..g.ohsBBo....',
    '...oWwBBBWo...',
    '..oWwwWBGWWo..',
    '..odwwWWGWWo..',
    '.odwwwWWGWWWo.',
    '.odwwwWWGWWWo.',
    '.odwwWWWGWWWo.',
    '.odwwWWWGWWWo.',
    'odwwwWWWGWWWWo',
    'odwwwWWWGWWWWo',
    'oGGGGGGGGGGGGo',
    '.okdddddddddo.',
    '...ogo..ogo...',
  ], { o: 0, W: C.robeW0, w: C.robeW1, d: C.robeW2, k: C.robeW3, G: C.gold, g: C.goldD, s: C.skin, S: C.skinD, e: 0, h: C.hair1, B: C.hair0 });
  const SH = 23;
  const HOLY_DARK = gradeLevels('#0a0826', [0.24, 0.44, 0.6]);
  const RY = 11;                      // sky rift centre y
  const WROOT = 27;                   // wing root y

  // silhouette of the lower robe, used to hide the back half of the ground circle
  const bMask = mk(14, SH);
  use(bMask.getContext('2d')); drawRows(BISHOP, 0, 0); use(g);
  const fxc = mk(W, H), fxg = fxc.getContext('2d');

  const pose = { sa: -Math.PI / 2, hx: 3, hy: 3, bx: 0, by: 5 };
  const shown = Object.assign({}, pose);
  let circleR = 0, riftR = 0, glow = 0, pillarBot = 0, pillarHW = 0, flare = 0, wingOpen = 0, wingFade = 0;
  let hitI = 0, shotI = 0, burstDone = false, recoil = 0;
  let tipX = 0, tipY = 0;

  const hover = () => 3 + Math.round(Math.sin(Math.floor(time * 12) / 12 * 2.4));
  function geo() {
    const bx0 = AX - 7, by0 = GY - SH - hover();
    const fx = bx0 + 9, fy = by0 + 12;
    const hx = Math.round(fx + shown.hx - recoil), hy = Math.round(fy + shown.hy);
    return { bx0, by0, fx, fy, hx, hy, dx: Math.cos(shown.sa), dy: Math.sin(shown.sa) };
  }

  // ---- Angel Ray bolts
  const NB = 4;
  const B_on = new Uint8Array(NB), B_x = new Float32Array(NB), B_y = new Float32Array(NB), B_vx = new Float32Array(NB), B_vy = new Float32Array(NB), B_tx = new Float32Array(NB), B_i = new Uint8Array(NB);
  const SHOTS = [0.1, 0.38, 0.66], SHOT_Y = [DUM.chest, DUM.head + 2, DUM.belly];
  function fire(n) {
    const ly = SHOT_Y[n];
    const tx = DX + DUM.left + dumShear(ly), ty = GY + ly;
    for (let i = 0; i < NB; i++) if (!B_on[i]) {
      const d = Math.hypot(tx - tipX, ty - tipY), sp = 440;
      B_on[i] = 1; B_i[i] = n; B_x[i] = tipX; B_y[i] = tipY; B_tx[i] = tx;
      B_vx[i] = (tx - tipX) / d * sp; B_vy[i] = (ty - tipY) / d * sp;
      ringFx(tipX, tipY, 6, 0.16, RP.holy, 0.9);
      burst(tipX, tipY, 8, RP.holy, 50, 0.3, 0);
      recoil = 2;
      sfx('angelRay');
      return;
    }
  }

  // ---- drifting feathers
  const NF = 40;
  const F_on = new Uint8Array(NF), F_x = new Float32Array(NF), F_y = new Float32Array(NF), F_vy = new Float32Array(NF), F_ph = new Float32Array(NF), F_life = new Float32Array(NF), F_max = new Float32Array(NF);
  let fHead = 0;
  function feather(x, y, life) {
    const i = fHead; fHead = (fHead + 1) % NF;
    F_on[i] = 1; F_x[i] = x; F_y[i] = y; F_vy[i] = rr(10, 17); F_ph[i] = rand() * 6.28; F_life[i] = life; F_max[i] = life;
  }
  function wingPoint() {
    const s = rand() < 0.5 ? -1 : 1, t = rr(0.2, 1);
    return [DX + s * (6 + t * 26), WROOT - 14 * t + rr(0, 10)];
  }
  const FSH = [
    [[1, -1, 0], [0, 0, 0], [1, 0, 1], [-1, 1, 2]],
    [[-2, 0, 2], [-1, 0, 0], [0, 0, 0], [1, 0, 1], [0, -1, 1]],
    [[-1, -1, 0], [0, 0, 0], [-1, 0, 1], [1, 1, 2]],
  ];

  // ---- wings: procedural mask (right wing, local coords), mirrored for the left
  const WBW = 46, WBH = 42, WOX = 4, WOY = 26;
  const WM = new Uint8Array(WBW * WBH);
  const FEATH = [[0.10, 1.85, 9], [0.25, 1.58, 11], [0.40, 1.33, 13], [0.55, 1.10, 14], [0.70, 0.88, 15], [0.85, 0.66, 14], [1.0, 0.44, 12]];
  function armPt(t, open, flap) { return [t * 23 * open, -(16 + flap * 3) * open * (1 - (1 - t) * (1 - t))]; }
  function wset(x, y, v) {
    x = Math.round(x) + WOX; y = Math.round(y) + WOY;
    if (x >= 0 && x < WBW && y >= 0 && y < WBH) WM[y * WBW + x] = v;
  }
  function stroke(x0, y0, a, len, w0, w1, v, tipV) {
    const dx = Math.cos(a), dy = Math.sin(a);
    for (let j = 0; j <= len; j += 0.5) {
      const f = j / len, w = lerp(w0, w1, f);
      for (let q = -w; q <= w + 0.01; q += 0.5) wset(x0 + dx * j - dy * q, y0 + dy * j + dx * q, tipV && f > 0.78 ? tipV : v);
    }
  }
  let wingKey = '';
  function buildWing(open, flap) {
    const key = open.toFixed(2) + ':' + flap;
    if (key === wingKey) return;
    wingKey = key;
    WM.fill(0);
    FEATH.forEach(([t, a, L], k) => {
      const [bx, by] = armPt(t, open, flap);
      stroke(bx, by, lerp(1.95, a - flap * 0.12 * t, open), L * (0.3 + 0.7 * open), 1.4, 0.6, (k & 1) ? 2 : 1, 3);
    });
    for (let k = 0; k < 6; k++) {
      const t = 0.04 + k * 0.16, [bx, by] = armPt(t, open, flap);
      stroke(bx, by, lerp(1.9, 1.55 - t * 0.9, open), (4.5 + k * 0.4) * (0.4 + 0.6 * open), 1.5, 0.9, 4, 0);
    }
    for (let t = 0; t <= 1.001; t += 0.02) {
      const [x, y] = armPt(t, open, flap), w = lerp(2, 0.5, t);
      for (let q = -w; q <= w; q += 0.5) wset(x, y + q, 5);
    }
  }
  function drawWings(fade) {
    const flap = Math.round(Math.sin(Math.floor(time * 12) / 12 * 5.5) * 1);
    buildWing(Math.min(1.08, wingOpen), flap);
    const INT = [0, 35, C.holy0, C.holy1, 35, 35];
    for (let s = -1; s <= 1; s += 2) {
      const rx = DX + (s > 0 ? 3 : -4);
      for (let yy = 0; yy < WBH; yy++) for (let xx = 0; xx < WBW; xx++) {
        const v = WM[yy * WBW + xx];
        const wx = rx + s * (xx - WOX), wy = WROOT + yy - WOY;
        if (fade < 1 && bay(wx, wy) > fade) continue;
        let c = -1;
        if (v) {
          c = INT[v];
          if (v === 4 && yy + 1 < WBH) { const b = WM[(yy + 1) * WBW + xx]; if (b >= 1 && b <= 3) c = C.gold; }
          if (v === 3 && yy + 1 < WBH && !WM[(yy + 1) * WBW + xx]) c = C.gold;
        } else {
          const up = yy > 0 && WM[(yy - 1) * WBW + xx], dn = yy + 1 < WBH && WM[(yy + 1) * WBW + xx];
          const lf = xx > 0 && WM[yy * WBW + xx - 1], rt = xx + 1 < WBW && WM[yy * WBW + xx + 1];
          if (up) c = C.goldD; else if (dn || lf || rt) c = C.gold;
        }
        if (c >= 0) px(wx, wy, c);
      }
    }
  }

  // ---- helpers
  function hexCircle(cx, cy, r, rot, c1, c2, sq) {
    const pt = (a, rad) => [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * sq];
    ellipse(cx, cy, r, r * sq, c1);
    ellipse(cx, cy, r * 0.8, r * 0.8 * sq, c2);
    if (r > 5) {
      for (let t = 0; t < 2; t++) for (let k = 0; k < 3; k++) {
        const a0 = rot + t * Math.PI / 3 + k * Math.PI * 2 / 3, a1 = a0 + Math.PI * 2 / 3;
        const p0 = pt(a0, r * 0.8), p1 = pt(a1, r * 0.8);
        line(p0[0], p0[1], p1[0], p1[1], t ? c2 : c1);
      }
      for (let k = 0; k < 16; k++) { const p = pt(-rot * 0.7 + k * Math.PI / 8, r * 0.9); px(p[0], p[1], (k & 1) ? c2 : 35); }
      ellipse(cx, cy, r * 0.36, r * 0.36 * sq, c1, 2);
    }
  }
  function drawCross(x, y, dx, dy, lit) {
    const qx = -dy, qy = dx;
    line(x, y, x + dx * 6, y + dy * 6, C.gold);
    const cx = x + dx * 4, cy = y + dy * 4;
    line(cx - qx * 2, cy - qy * 2, cx + qx * 2, cy + qy * 2, C.gold);
    px(cx, cy, lit && ((tick >> 2) & 1) ? 35 : C.holy0);
    px(x + dx * 6, y + dy * 6, C.holy1);
  }
  function drawPillar(top, bot, hw) {
    const h = Math.round(hw), fl = Math.floor(time * 12);
    for (let x = DX - h - 3; x <= DX + h + 3; x++) {
      const ax = Math.abs(x - DX), f = ax / Math.max(1, hw);
      for (let y = Math.round(top); y <= Math.round(bot); y++) {
        // leading tip rounds off
        const tipCut = bot < GY - 0.5 ? Math.max(0, (y - (bot - 5)) / 5) * hw : 0;
        const e = h - tipCut - ax;
        let c;
        if (e < 0) {
          if (e >= -3 && tipCut === 0 && bay(x, y + fl * 3) < 0.28 + (e + 3) * 0.08) c = e >= -1 ? C.gold : C.goldD; else continue;
        } else if (e < 1) c = C.goldD;
        else if (e < 2) c = C.gold;
        else c = f < 0.42 ? 35 : f < 0.66 ? C.holy0 : C.holy1;
        px(x, y, c);
      }
    }
  }
  function pillarStreaks(top, bot, hw, dense) {
    const span = bot - top + 20;
    for (let s = 0; s < (dense ? 14 : 7); s++) {
      const x = DX + Math.round((hash(s, 1) - 0.5) * 2 * hw * 0.8);
      const len = 6 + Math.floor(hash(s, 2) * 10);
      const y = top - 10 + ((time * (150 + hash(s, 3) * 110) + hash(s, 4) * 300) % span);
      const f = Math.abs(x - DX) / hw;
      const c = dense ? (f < 0.42 ? C.holy1 : 35) : 35;
      for (let j = 0; j < len; j++) { const yy = Math.round(y + j); if (yy >= top && yy <= bot && (dense || (yy & 1))) px(x, yy, c); }
    }
  }
  function groundGlow(cx, rad, k) {
    for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const d = Math.abs(x - cx) / rad;
      if (bay(x, GY) < (1 - d) * k) px(x, GY, d < 0.35 ? 35 : d < 0.6 ? C.holy1 : C.gold);
      if (bay(x, GY + 1) < (0.85 - d) * k) px(x, GY + 1, d < 0.4 ? C.holy1 : C.goldD);
      if (bay(x, GY - 1) < (0.6 - d) * k) px(x, GY - 1, d < 0.3 ? C.holy0 : C.gold);
    }
  }

  return {
    title: 'Genesis',
    pad: [146.8, 185, 220, 293.7],
    seq: [
      ['idle', 0.8],
      ['ray', 1.0],
      ['cast', 1.6, { call: 'GENESIS' }],
      ['descend', 0.22],
      ['pillar', 1.45],
      ['collapse', 0.5],
      ['recover', 1.45],
      ['idle', 0.4],
    ],
    reset() {
      B_on.fill(0); F_on.fill(0);
      circleR = riftR = glow = pillarBot = pillarHW = flare = wingOpen = wingFade = 0;
      hitI = shotI = 0; recoil = 0; burstDone = false;
      Object.assign(pose, { sa: -Math.PI / 2, hx: 3, hy: 3, bx: 0, by: 5 }); Object.assign(shown, pose);
    },
    enter(k, i, dur) {
      if (k === 'ray') shotI = 0;
      if (k === 'cast') { sfx('charge', dur); sfx('choir', dur + 0.4); }
      if (k === 'descend') { sfx('descend'); pillarBot = RY; pillarHW = 5; }
      if (k === 'pillar') {
        pillarBot = GY; hitI = 0; wingOpen = 0.05; wingFade = 1; flare = 1;
        dum.skin = 'holy';
        hitDummy(DX, GY - 18, { push: 2, stop: 6, shake: 12, straw: 16, dmg: roll(612000), sfx: false, impactC: C.gold });
        flashFx(2, 1);
        ringFx(DX, GY, 34, 0.45, RP.holy, 0.22);
        burst(DX, GY - 1, 26, RP.holy, 90, 0.7, 60, { a0: -Math.PI, a1: 0, sz: 0.2 });
        sfx('holySlam');
      }
      if (k === 'collapse') {
        burstDone = false;
        for (let q = 0; q < 16; q++) { const [x, y] = wingPoint(); feather(x, y, rr(1.2, 1.85)); }
        sfx('collapse');
      }
      if (k === 'recover') { dum.skin = 'normal'; pillarHW = 0; wingOpen = 0; }
    },
    update(k, p) {
      const tt = p * stateDur();
      // pose targets
      let t = { sa: -Math.PI / 2, hx: 3, hy: 3, bx: 0, by: 5 };
      if (k === 'ray') t = { sa: -0.2, hx: 6, hy: -1, bx: -3, by: 3 };
      else if (k === 'cast') t = { sa: -Math.PI / 2 - 0.06, hx: 1, hy: -9, bx: -3, by: -6 };
      else if (k === 'descend' || k === 'pillar' || k === 'collapse') t = { sa: -1.05, hx: 5, hy: -7, bx: -4, by: -4 };
      const rate = k === 'descend' ? 30 : 12;
      for (const key in t) pose[key] = ease(pose[key], t[key], rate);
      if (tick % 5 === 0 || k === 'descend') Object.assign(shown, pose);
      if (recoil > 0 && tick % 5 === 0) recoil--;
      const G = geo();
      tipX = G.hx + G.dx * 15; tipY = G.hy + G.dy * 15;

      const casting = k === 'cast' || k === 'descend' || k === 'pillar' || k === 'collapse';
      circleR = ease(circleR, casting ? 18 : 0, casting ? 7 : 5);
      riftR = ease(riftR, (k === 'cast' && p > 0.3) || k === 'descend' || k === 'pillar' || (k === 'collapse' && p < 0.4) ? 1 : 0, k === 'collapse' || k === 'recover' ? 7 : 4);
      glow = ease(glow, casting || k === 'ray' ? 1 : 0, 6);

      if (k === 'ray') while (shotI < SHOTS.length && tt >= SHOTS[shotI]) fire(shotI++);
      if (k === 'cast') {
        if (tick % 2 === 0) { const i = spawn(0, 0, rand() * 6.28, rr(9, 14), 1.5, RP.holy, 11, 3); P_tx[i] = tipX + G.dx * 4; P_ty[i] = tipY + G.dy * 4; }
        if (tick % 2 === 0) spawn(AX + rr(-15, 15), GY - rr(0, 2), rr(-2, 2), rr(-22, -10), rr(0.8, 1.5), RP.holy, -16);
        if (p > 0.3 && tick % 3 === 0) { const a = rand() * 6.28; spawn(DX + Math.cos(a) * 24 * riftR, RY + Math.sin(a) * 6 * riftR, rr(-6, 6), rr(-2, 6), 0.5, RP.holy, 0); }
      }
      if (k === 'idle' && tick % 40 === 0) spawn(AX + rr(-5, 5), GY - 1, rr(-2, 2), rr(-10, -6), rr(0.7, 1.1), RP.holy, -4);
      if (k === 'descend') { pillarBot = lerp(RY, GY, easeIn(p)); pillarHW = 5 + 4 * p; }
      if (k === 'pillar') {
        flare = ease(flare, 0, 7);
        pillarHW = 9 + flare * 3;
        wingOpen = Math.min(1.08, wingOpen + DT / 0.3);
        if (wingOpen > 1 && tt > 0.5) wingOpen = ease(wingOpen, 1, 8);
        dum.shiver = 0.08;
        const HITS = [0.22, 0.44, 0.66, 0.88], HY = [DUM.head, DUM.belly, DUM.chest, DUM.head + 3];
        while (hitI < HITS.length && tt >= HITS[hitI]) {
          const ly = HY[hitI];
          hitDummy(DX + rr(-3, 3) + dumShear(ly), GY + ly - dum.lift, { push: (hitI & 1) ? -1.1 : 1.2, stop: 3, shake: 6, straw: 7, dmg: roll(648000), crit: rand() < 0.45, sfx: false, impactC: C.gold });
          ringFx(DX, GY + ly - dum.lift, 10, 0.2, RP.holy, 0.35);
          flare = 0.6;
          sfx('holyHit', hitI);
          hitI++;
        }
        if (hitI === HITS.length && tt >= 1.14) {
          hitI++;
          hitDummy(DX, GY - 20 - dum.lift, { big: true, push: 2.6, stop: 11, shake: 18, straw: 28, dmg: roll(2480000), crit: true, bigNum: true, sfx: false, impactC: C.gold });
          flashFx(2, 1); flare = 1.6;
          ringFx(DX, GY - 18, 26, 0.4, RP.holy, 0.8);
          ringFx(DX, GY, 40, 0.5, RP.holy, 0.22);
          burst(DX, GY - 18, 40, RP.holy, 120, 0.7, 30, { sz: 0.3 });
          sfx('genesisCrit');
        }
        if (tick % 7 === 0) { const [x, y] = wingPoint(); feather(x, y, rr(1.3, 1.9)); }
        if (tick % 2 === 0) spawn(DX + rr(-pillarHW - 6, pillarHW + 6), GY - rr(0, 2), rr(-4, 4), rr(-40, -18), rr(0.5, 1), RP.holy, -10);
      }
      if (k === 'collapse') {
        const q = Math.min(1, p / 0.4);
        pillarHW = lerp(9, 0.5, easeIn(q));
        wingFade = 1 - q;
        dum.shiver = p < 0.4 ? 0.05 : 0;
        if (p >= 0.4 && !burstDone) {
          burstDone = true; pillarHW = 0; wingOpen = 0;
          ringFx(DX, GY, 44, 0.6, RP.holy, 0.22);
          ringFx(DX, GY - 18, 30, 0.5, RP.holy, 0.9);
          burst(DX, GY - 18, 50, RP.holy, 110, 0.9, 20, { jit: 4, sz: 0.25 });
          for (let n = 0; n < 16; n++) spawn(DX + rr(-1, 1), rr(RY, GY), rr(-70, 70), rr(-20, 20), rr(0.4, 0.8), RP.holy, 0, 0, 0, 1, 3);
          sfx('sparkle');
        }
      }
      dum.lift = ease(dum.lift, k === 'pillar' ? 3 : 0, k === 'pillar' ? 10 : 7);

      // bolts
      for (let i = 0; i < NB; i++) if (B_on[i]) {
        B_x[i] += B_vx[i] * DT; B_y[i] += B_vy[i] * DT;
        spawn(B_x[i] - B_vx[i] * 0.02, B_y[i] - B_vy[i] * 0.02 + rr(-1, 1), rr(-8, 8), rr(-8, 8), 0.3, RP.holy, 0);
        if (B_x[i] >= B_tx[i]) {
          B_on[i] = 0;
          hitDummy(B_x[i], B_y[i], { push: 1, stop: 3, straw: 6, dmg: roll(184000), crit: B_i[i] === 2, sfx: false, impactC: C.gold });
          burst(B_x[i], B_y[i], 12, RP.holy, 70, 0.45, 40);
          ringFx(B_x[i], B_y[i], 7, 0.2, RP.holy, 0.9);
          sfx('rayHit', B_i[i]);
        }
      }
      // feathers
      for (let i = 0; i < NF; i++) if (F_on[i]) {
        F_life[i] -= DT;
        if (F_life[i] <= 0) { F_on[i] = 0; continue; }
        if (F_y[i] < GY - 1) F_y[i] += F_vy[i] * DT * (0.7 + 0.3 * Math.abs(Math.cos(time * 2.4 + F_ph[i])));
        else F_y[i] = GY - 1;
      }
    },
    grade(k, p) {
      let lvl = 0;
      if (k === 'cast') lvl = Math.floor(p * 2.99);
      else if (k === 'descend' || k === 'pillar' || k === 'collapse') lvl = 3;
      else if (k === 'recover') lvl = Math.floor((1 - p) * 3.99);
      return HOLY_DARK[Math.min(3, lvl)];
    },
    drawActor(k, p) {
      const G = geo(), { bx0, by0, fx, fy, hx, hy, dx, dy } = G;
      const bkx = bx0 + 5, bky = by0 + 12;
      const staff = () => {
        line(hx - dx * 6, hy - dy * 6, hx + dx * 14, hy + dy * 14, C.goldD);
        line(hx - dx * 6 + 1, hy - dy * 6, hx + dx * 12 + 1, hy + dy * 12, C.gold);
      };
      const lowered = k === 'idle' || k === 'recover';
      if (lowered) staff();
      line(bkx, bky, bkx + shown.bx, bky + shown.by, C.robeW2);
      px(bkx + shown.bx, bky + shown.by + (shown.by < 0 ? -1 : 1), C.skin);
      const fg = fireGlow();
      drawRows(BISHOP, bx0, by0, { rimL: fg > 0.82 ? 8 : -1, rimR: glow > 0.4 ? ((tick >> 2) & 1 ? C.holy1 : C.gold) : -1, rimRows: [11, 19] });
      if (!lowered) staff();
      line(fx, fy, hx, hy, C.robeW1); line(fx, fy + 1, hx, hy + 1, C.robeW0);
      px(hx - Math.sign(hx - fx), hy + 1, C.gold);
      px(hx, hy, C.skin); px(hx, hy + 1, C.skinD);
    },
    drawFx(k, p) {
      const G = geo();
      // ground circle + soft glow under the bishop, with the robe masked out of the back half
      use(fxg); fxg.clearRect(0, 0, W, H);
      const hv = hover();
      for (let x = AX - 8; x <= AX + 8; x++) {
        const d = Math.abs(x - AX) / 8;
        if (bay(x, GY) < (1 - d) * (0.9 - hv * 0.08)) px(x, GY, d < 0.4 ? C.holy1 : C.gold);
        if (bay(x, GY + 1) < (0.7 - d) * 0.8) px(x, GY + 1, C.goldD);
      }
      ellipse(AX, GY, 7, 1.5, C.goldD, 2);
      if (circleR > 1) {
        hexCircle(AX, GY, circleR, time * 1.6, C.gold, C.goldD, 0.3);
        if (circleR > 12) for (let q = 0; q < 4; q++) { const a = time * 2 + q * 1.6; px(AX + Math.cos(a) * circleR * 0.6, GY - 2 - ((time * 22 + q * 5) % 14), C.holy1); }
      }
      fxg.globalCompositeOperation = 'destination-out';
      fxg.drawImage(bMask, G.bx0, G.by0);
      fxg.globalCompositeOperation = 'source-over';
      use(g); g.drawImage(fxc, 0, 0);

      // halo + staff cross stay bright
      const hx0 = G.bx0 + 6, hy0 = G.by0 - 2;
      R(hx0 - 2, hy0 - 1, 5, 1, C.gold); px(hx0 - 3, hy0, C.gold); px(hx0 + 3, hy0, C.gold); R(hx0 - 2, hy0 + 1, 5, 1, C.goldD);
      const sp = Math.floor(time * 8) % 8, SP = [[-2, -1], [0, -1], [2, -1], [3, 0], [2, 1], [0, 1], [-2, 1], [-3, 0]];
      px(hx0 + SP[sp][0], hy0 + SP[sp][1], 35);
      drawCross(Math.round(G.hx + G.dx * 14), Math.round(G.hy + G.dy * 14), G.dx, G.dy, glow > 0.3);
      if (glow > 0.3) ellipse(tipX + G.dx * 4, tipY + G.dy * 4, 4 + ((tick >> 2) & 1), 4 + ((tick >> 2) & 1), C.holy1, 2);

      // sky rift
      if (riftR > 0.03) {
        const rx = 22 * riftR, ry = 5.5 * riftR;
        // parting clouds
        for (let q = 0; q < 16; q++) {
          const a = q / 16 * Math.PI * 2 + time * 0.25, pr = 1.8 + hash(q, 7) * 1.6;
          const cx = DX + Math.cos(a) * (rx + 3 + pr), cy = RY + Math.sin(a) * (ry + 1.5 + pr * 0.5);
          disc(cx, cy, pr, C.sky3); disc(cx, cy - 1, pr * 0.7, C.sky4);
          px(cx - Math.cos(a) * pr, cy - Math.sin(a) * pr * 0.5, C.goldD);
        }
        hexCircle(DX, RY, rx + 7, -time * 1.2, C.gold, C.goldD, 0.26);
        for (let y = Math.floor(RY - ry - 3); y <= RY + ry + 3; y++) for (let x = Math.floor(DX - rx - 5); x <= DX + rx + 5; x++) {
          const d = Math.hypot((x - DX) / (rx + 0.5), (y - RY) / (ry + 0.5));
          if (d <= 1) px(x, y, d < 0.45 ? 35 : d < 0.72 ? C.holy0 : d < 0.9 ? C.holy1 : C.gold);
          else if (d < 1.3 && bay(x, y + Math.floor(time * 12)) < (1.3 - d) * 1.4) px(x, y, C.goldD);
        }
        // light rays fanning down before the pillar lands
        if (k === 'cast' || k === 'descend') {
          for (let q = 0; q < 7; q++) {
            const a = Math.PI / 2 + (q - 3) * 0.2 + Math.sin(time * 1.5 + q) * 0.04;
            const len = (26 + hash(q, 9) * 18) * riftR;
            for (let j = 4; j < len; j++) {
              const x = DX + Math.cos(a) * (rx * 0.7 * (q - 3) / 3 + j * 0.2 * (q - 3)), y = RY + Math.sin(a) * j;
              if (bay(Math.round(x), Math.round(y)) < 0.55 * (1 - j / len)) px(x, y, j < len * 0.4 ? C.holy1 : C.goldD);
            }
          }
        }
      }
      // wings behind the pillar
      if (wingOpen > 0.02 && pillarHW > 0) drawWings(k === 'collapse' ? wingFade : 1);
      // pillar
      const active = pillarHW > 0.3 && (k === 'descend' || k === 'pillar' || k === 'collapse');
      if (active) {
        const top = RY + 2;
        drawPillar(top, pillarBot, pillarHW);
        if (pillarHW > 3) pillarStreaks(top, pillarBot, pillarHW, true);
        if (k !== 'descend') {
          groundGlow(DX, 18 + pillarHW * 1.6, 1);
          if (pillarHW > 2) {
            // inside the light the hit flash reads as a dark flicker instead of white-on-white
            const fT = dum.flashT, sk = dum.skin;
            if (fT > 0) { dum.flashT = 0; dum.skin = 'normal'; }
            drawDummy();
            dum.flashT = fT; dum.skin = sk;
            pillarStreaks(top, pillarBot, pillarHW, false);
          }
          const sw = Math.round(pillarHW + 5);
          R(DX - sw, GY - 1, sw * 2 + 1, 1, C.holy0); R(DX - sw + 2, GY - 2, sw * 2 - 3, 1, 35);
          R(DX - sw - 2, GY, sw * 2 + 5, 1, C.holy1);
        }
      }
      // bolts
      for (let i = 0; i < NB; i++) if (B_on[i]) {
        const x = Math.round(B_x[i]), y = Math.round(B_y[i]);
        const ux = B_vx[i] / 440, uy = B_vy[i] / 440;
        for (let j = 12; j >= 1; j--) {
          const c = j > 9 ? C.goldD : j > 6 ? C.gold : j > 3 ? C.holy1 : C.holy0;
          px(x - ux * j, y - uy * j, c); if (j < 9) px(x - ux * j, y - uy * j + 1, j < 4 ? C.holy1 : C.gold);
        }
        const s = (tick >> 1) & 1;
        px(x, y - 2 - s, C.holy1); px(x, y + 2 + s, C.holy1); px(x + 2 + s, y, C.holy1); px(x - 2, y, C.holy1);
        px(x, y - 1, C.holy0); px(x, y + 1, C.holy0); px(x + 1, y, C.holy0); px(x - 1, y, C.holy0); px(x, y, 35);
      }
      // feathers
      for (let i = 0; i < NF; i++) if (F_on[i]) {
        const f = F_life[i] / F_max[i];
        if (f < 0.12 && ((tick >> 1) & 1)) continue;
        const sw = Math.cos(time * 2.4 + F_ph[i]);
        const x = F_x[i] + Math.sin(time * 2.4 + F_ph[i]) * 3, y = F_y[i];
        const shp = FSH[sw > 0.35 ? 0 : sw < -0.35 ? 2 : 1];
        const cs = f > 0.3 ? [35, C.holy1, C.goldD] : [C.robeW1, C.robeW2, C.robeW3];
        for (const [ox, oy, tp] of shp) px(Math.round(x) + ox, Math.round(y) + oy, cs[tp]);
      }
    },
  };
})();

SND.choir = (c, o, t, dur) => {
  dur = dur || 2;
  for (const f of [293.66, 369.99, 440, 587.33, 739.99]) for (const d of [0.995, 1.005]) tone(c, o, t, 'triangle', f * d, f * d, dur, 0.016, dur * 0.75);
  const arp = [1174.66, 1479.98, 1760, 2349.3];
  for (let i = 0; i < 10; i++) tone(c, o, t + dur * 0.35 + i * 0.1, 'sine', arp[i % 4], arp[i % 4], 0.5, 0.018);
};
SND.bell = (c, o, t, f, v) => {
  f = f || 880; v = v || 1;
  tone(c, o, t, 'sine', f, f, 1.4, 0.08 * v); tone(c, o, t, 'sine', f * 2.01, f * 2.01, 0.9, 0.035 * v);
  tone(c, o, t, 'sine', f * 3.0, f * 3.0, 0.5, 0.02 * v); tone(c, o, t, 'sine', f * 4.23, f * 4.23, 0.3, 0.012 * v);
};
SND.angelRay = (c, o, t) => { tone(c, o, t, 'square', 1400, 2600, 0.08, 0.025); tone(c, o, t, 'sine', 2093, 1568, 0.18, 0.06); noiseS(c, o, t, 0.12, 0.15, 5000, 'highpass'); };
SND.rayHit = (c, o, t, i) => { SND.hit(c, o, t); SND.bell(c, o, t, [1318.5, 1568, 1760][i % 3], 0.6); };
SND.descend = (c, o, t) => { noiseS(c, o, t, 0.3, 0.5, 6000, 'bandpass', 1.5, 500, 0.25); tone(c, o, t, 'sine', 1760, 440, 0.28, 0.07, 0.2); };
SND.holySlam = (c, o, t) => {
  noiseS(c, o, t, 0.8, 0.9, 900, 'lowpass', 0, 90); tone(c, o, t, 'sine', 110, 38, 0.7, 0.8);
  for (const f of [587.33, 880, 1174.66]) SND.bell(c, o, t + 0.02, f, 0.8);
  for (const f of [146.83, 220, 293.66, 369.99, 440]) tone(c, o, t, 'triangle', f, f, 1.9, 0.022, 0.25);
};
SND.holyHit = (c, o, t, i) => {
  noiseS(c, o, t, 0.08, 0.4, 2000, 'bandpass', 1); tone(c, o, t, 'sine', 160, 70, 0.1, 0.3);
  SND.bell(c, o, t, [880, 987.77, 1108.73, 1318.51, 1479.98][(i || 0) % 5], 0.7);
};
SND.genesisCrit = (c, o, t) => {
  noiseS(c, o, t, 0.6, 1.0, 900, 'lowpass', 0, 80); tone(c, o, t, 'sine', 100, 30, 0.6, 0.9);
  for (const f of [587.33, 739.99, 880, 1174.66, 1760]) SND.bell(c, o, t, f, 0.9);
  for (let i = 0; i < 6; i++) tone(c, o, t + 0.05 + i * 0.05, 'sine', 2400 + i * 300, 2400 + i * 300, 0.25, 0.02);
};
SND.collapse = (c, o, t) => {
  noiseS(c, o, t, 0.45, 0.3, 800, 'bandpass', 2, 5000, 0.3);
  for (let i = 0; i < 10; i++) tone(c, o, t + 0.2 + i * 0.04, 'sine', 3200 - i * 170, 3000 - i * 170, 0.3, 0.022);
};
