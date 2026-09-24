// Night Lord: Avenger. Shadow Partner clone, a giant spinning shuriken that grinds on the
// dummy, a Triple Throw flurry, then Assassinate: blink in, double slash, glowing X.
const SKILL = (function () {
  // crouched ninja (arms, scarf tails and weapons are drawn procedurally)
  const NINJA = sprite([
    '.....oooooo.....',
    '....oWWWWWWo....',
    '..ooVVVVVVVVo...',
    '.oVoVVVVVvVVVo..',
    '..ooWeeWWWeeWo..',
    '...oWexWWWexso..',
    '..oWWWWnnWWWso..',
    '..oWWWWWWWWWWso.',
    '.oWWWWWmmmmWWso.',
    '.oWWWWWWWWWWWso.',
    'oWWWWWWWWWWWWWso',
    'oWWWWWWWWWWWWWso',
    'oWWWWWWWWWWWWWso',
    'oWWWWWWWWWWWWWso',
    'oWWWWWWWWWWWWWso',
    'oWWWWWWWWWWWWWso',
    '.oWWWWWWWWWWWso.',
    '.oWWWWWWWWWWWso.',
    '..ooWWWWWWWWoo..',
    '...oppo..oppo...',
  ], { o: 0, W: C.hair0, s: C.hair1, e: 0, x: 35, n: C.hamPink, m: C.hamPinkD, p: C.hamPink, V: C.ninja2, v: C.crim2 });
  const NR_ = NINJA.length, TOPY = GY - (NR_ - 1), UPPER = 13;
  const VIO_DARK = gradeLevels('#0c0520', [0.24, 0.44, 0.6]);
  const RP_SMOKE = ramp([C.vio1, C.vio2, C.vio3, C.vio3, C.vio4, C.vio5]);
  const RP_SPARK = ramp([35, 34, 39, 40]);
  const RP_VSPARK = ramp([35, C.vio0, C.vio1, C.vio2, C.vio3]);
  const CDX = -13, CDY = -5, DELAY = 6;
  const DEST = DX - 17;

  function remapOf(pairs) { const m = PAL.map((_, i) => i); for (const [a, b] of pairs) m[a] = b; return m; }
  const CLONE_MAP = remapOf([[C.hair0, C.vio2], [C.hair1, C.vio3], [C.hamPink, C.vio1], [C.hamPinkD, C.vio2], [0, C.vio5], [C.ninja0, C.vio3], [C.ninja1, C.vio4], [C.ninja2, C.vio5], [C.ninja3, 0], [C.skin, C.vio3], [C.navy, C.vio0],
    [C.crim1, C.vio2], [C.crim2, C.vio3], [C.crim3, C.vio4], [C.steel, C.vio1], [35, C.vio0], [C.armor1, C.vio2], [C.armor2, C.vio3]]);
  const GHOST_MAP = remapOf([[C.hair0, C.vio0], [C.hair1, C.vio1], [C.hamPink, C.vio0], [C.hamPinkD, C.vio1], [0, C.vio3], [C.ninja0, C.vio0], [C.ninja1, C.vio1], [C.ninja2, C.vio2], [C.ninja3, C.vio3], [C.skin, C.vio0], [C.navy, 35],
    [C.crim1, C.vio0], [C.crim2, C.vio1], [C.crim3, C.vio2], [C.steel, C.vio0], [C.armor1, C.vio1], [C.armor2, C.vio2]]);

  // remapped / dithered pixel helpers
  let MAP = null, DTH = 2;
  function P(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (DTH < 1 && bay(x, y) >= DTH) return;
    px(x, y, MAP ? MAP[c] : c);
  }
  function PL(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      P(x0, y0, c);
      if ((x0 === x1 && y0 === y1) || ++n > 300) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // poses: body lean (lx, ly >= 0), front hand (fx, fy) from front shoulder, back hand (bx, by)
  const PO = {
    ready: { lx: 0, ly: 0, fx: 4, fy: 2, bx: -4, by: 3 },
    seal: { lx: 0, ly: 1, fx: 1, fy: -2, bx: 5, by: -2 },
    charge: { lx: 0, ly: 0, fx: 0, fy: -10, bx: -5, by: 1 },
    throwP: { lx: 1, ly: 1, fx: 9, fy: -2, bx: -6, by: 0 },
    wind: { lx: 0, ly: 0, fx: -3, fy: -5, bx: 3, by: 2 },
    crouch: { lx: 0, ly: 1, fx: 3, fy: 4, bx: -5, by: 3 },
    up: { lx: 0, ly: 0, fx: 1, fy: -11, bx: -4, by: 2 },
    down: { lx: 1, ly: 1, fx: 10, fy: 5, bx: -5, by: 0 },
    high: { lx: 1, ly: 0, fx: 8, fy: -11, bx: -6, by: 2 },
  };
  const pose = Object.assign({}, PO.ready);
  const shown = Object.assign({}, PO.ready);
  let actX = AX, actY = 0, actVis = 1, actGhost = 0, wp = 1, starR = 0, starA = 0, wind = 1, ev = null, bob = 0;
  let dashing = 0, triI = 0, slI = 0, cloneOn = 0, cloneA = 0, prevCVis = 1, prevCGhost = 0, glow = 0;
  let xT = -1;

  function snap() {
    return { x: actX, y: actY, vis: actVis, ghost: actGhost, lx: shown.lx, ly: shown.ly, fx: shown.fx, fy: shown.fy, bx: shown.bx, by: shown.by,
      wp, sr: starR, sa: starA, wind, bob, ev };
  }
  const HN = 64, hist = new Array(HN);
  let cs = null;
  function handPos(s, x, y) {
    const bx0 = Math.round(x) - 8, by0 = TOPY + Math.round(y);
    const ux = Math.round(s.lx), uy = Math.round(s.ly) + s.bob;
    return [Math.round(bx0 + 10 + ux + s.fx), Math.round(by0 + 9 + uy + s.fy)];
  }
  function starCenter(s, x, y) { const h = handPos(s, x, y); return [h[0], h[1] - 2 - s.sr]; }

  // --- projectiles & fx pools ------------------------------------------------
  const BIG = [];      // giant shurikens
  const STARS = [];    // small throwing stars in flight
  const STUCK = [];    // stars stuck in the dummy (dummy local coords)
  const PEND = [];     // queued star releases
  const GHOSTS = [];   // blink afterimages
  const PUFFS = [];    // smoke puffs
  const SLASH = [];    // slash arcs

  // hitDummy + keep the MapleStory number stack readable: a new line replaces any older line in its slot
  function hitD(x, y, o) {
    hitDummy(x, y, o);
    const i = (dmgHead + ND - 1) % ND;
    for (let j = 0; j < ND; j++) if (j !== i && D_on[j] && (o.bigNum ? true : D_slot[j] === D_slot[i] || (D_big[j] && D_slot[j] <= D_slot[i] + 1))) D_on[j] = 0;
  }
  function puff(x, y, r, n) {
    PUFFS.push({ x, y, r, t: 0, life: 0.42, s: Math.floor(rr(0, 999)) });
    burst(x, y, n || 10, RP_SMOKE, 40, 0.5, -20, { jit: r * 0.6, sz: 0.5, drag: 3 });
  }
  function addGhost(s, x, y, life) { GHOSTS.push({ s, x, y, t: 0, life: life || 0.26 }); }
  function launchBig(x, y, ly, clone) {
    BIG.push({ x, y, ly, st: 0, t: 0, hitN: 0, ang: starA, clone, vx: 0, trail: [] });
  }
  function tripleBurst(hx, hy, baseLy, clone) {
    const spread = [0, -6, 5];
    for (let k = 0; k < 3; k++) PEND.push({ at: tick + k * 3, x: hx, y: hy, ly: baseLy + spread[k], clone });
  }
  function launchStar(q) {
    const tx = dumX(DUM.left + 1, q.ly), ty = dumY(q.ly);
    const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy) || 1, v = 430;
    STARS.push({ x: q.x, y: q.y, vx: dx / d * v, vy: dy / d * v, ly: q.ly, clone: q.clone });
    sfx('star');
  }

  // --- drawing ---------------------------------------------------------------
  function drawScarf(ax, ay, w) {
    const ph = Math.floor(time * 12) / 12 * 9;
    const N = 17;
    let x0 = ax, y0 = ay, fx0 = ax, fy0 = ay;
    for (let i = 1; i <= N; i++) {
      const amp = 0.3 + i * 0.1 * (w > 1.4 ? 0.6 : 1);
      const x = ax - i * (1.1 + 0.25 * w);
      const y = ay + i * 0.22 / w + Math.sin(ph - i * 0.55) * amp;
      if (i <= N - 5) {
        PL(x0, y0 + 1, x, y + 1, C.crim3);
        PL(x0, y0, x, y, C.crim2);
        if (y < y0 - 0.2 && (i & 1)) P(x, y, C.crim1);
        fx0 = x; fy0 = y;
      } else {
        // forked tails
        const k = i - (N - 5);
        const y2 = y + k * 0.9 + Math.sin(ph * 1.3 - i) * 0.6;
        PL(x0, y0, x, y, C.crim2);
        PL(fx0, fy0, x + 0.5, y2, C.crim3);
        fx0 = x + 0.5; fy0 = y2;
      }
      x0 = x; y0 = y;
    }
  }
  function smallStar(x, y, f, c1, c2) {
    x = Math.round(x); y = Math.round(y);
    P(x, y, c1);
    if (f) { P(x - 1, y - 1, c2); P(x + 1, y + 1, c2); P(x - 1, y + 1, c2); P(x + 1, y - 1, c2); }
    else { P(x - 1, y, c2); P(x + 1, y, c2); P(x, y - 1, c2); P(x, y + 1, c2); }
  }
  // s: snapshot, (x,y) feet anchor, rim colour or -1
  function drawNinja(s, x, y, rim) {
    const bx0 = Math.round(x) - 8, by0 = TOPY + Math.round(y);
    const ux = Math.round(s.lx), uy = Math.round(s.ly) + s.bob;
    drawScarf(bx0 + 4 + ux, by0 + 7 + uy, s.wind);
    // back arm
    const bsx = bx0 + 5 + ux, bsy = by0 + 9 + uy;
    const bhx = Math.round(bsx + s.bx), bhy = Math.round(bsy + s.by);
    PL(bsx, bsy, bhx, bhy, C.hair1); P(bhx, bhy, C.hamPink);
    // body
    for (let r = 0; r < NR_; r++) {
      const row = NINJA[r], up = r < UPPER, yy = by0 + r + (up ? uy : 0), xo = bx0 + (up ? ux : 0);
      let first = -1, last = -1;
      for (let c = 0; c < row.length; c++) { const v = row[c]; if (v < 0) continue; if (first < 0) first = c; last = c; P(xo + c, yy, v); }
      if (rim >= 0 && r >= 1 && r <= 17 && first >= 0) { if (row[last - 1] >= 0) P(xo + last - 1, yy, rim); }
    }
    // front arm + hand
    const fsx = bx0 + 10 + ux, fsy = by0 + 9 + uy;
    const fhx = Math.round(fsx + s.fx), fhy = Math.round(fsy + s.fy);
    PL(fsx, fsy + 1, fhx, fhy + 1, 0);
    PL(fsx, fsy, fhx, fhy, C.hair0);
    P(fhx, fhy, C.hamPink); P(fhx, fhy + 1, C.hamPinkD);
    if (s.wp === 1) smallStar(fhx + 1, fhy - 1, (tick >> 3) & 1, 35, C.steel);
    if (s.wp === 2) {
      const dx = fhx - fsx, dy = fhy - fsy, d = Math.hypot(dx, dy) || 1, ux2 = dx / d, uy2 = dy / d;
      PL(fhx + ux2, fhy + uy2, fhx + ux2 * 6, fhy + uy2 * 6, C.steel);
      P(fhx + ux2 * 6, fhy + uy2 * 6, 35);
      P(fhx - uy2, fhy + ux2, C.goldD); P(fhx + uy2, fhy - ux2, C.goldD);
    }
  }
  // blade membership for the giant 4-point shuriken; returns colour class
  function bladeCls(dx, dy, r, ang) {
    const d = Math.hypot(dx, dy);
    if (d > r + 0.4) return 0;
    if (d < 1.1) return 4;                 // centre hole
    if (d < r * 0.36 + 0.6) return d > r * 0.36 - 0.4 ? 5 : 2; // hub
    let a = Math.atan2(dy, dx) - ang;
    a = ((a + Math.PI / 4) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4;
    const along = d * Math.cos(a), perp = d * Math.sin(a);
    const w = r * 0.5 * Math.pow(1 - along / (r + 0.4), 1.25) + 0.3;   // straight, symmetric 4-point star
    if (Math.abs(perp) > w) return 0;
    if (along > r - 1.2) return 3;
    return Math.abs(perp) > w - 1 ? 3 : Math.abs(perp) < 0.6 && along > r * 0.4 ? 1 : 2; // symmetric: edges bright, spine accent
  }
  function bigStar(cx, cy, r, ang, dark, halo) {
    cx = Math.round(cx); cy = Math.round(cy);
    const ri = Math.ceil(r) + 3;
    if (halo) for (let y = -ri; y <= ri; y++) for (let x = -ri; x <= ri; x++) {
      const d = Math.hypot(x, y);
      if (d < r - 0.5 || d > r + 3) continue;
      const k = 1 - (d - r + 0.5) / 3.5;
      if (bay(cx + x, cy + y) < k * 0.6) px(cx + x, cy + y, d < r + 1.2 ? C.vio3 : C.vio4);
    }
    // spin blur: symmetric dithered ring at the blade tips
    for (let y = -ri; y <= ri; y++) for (let x = -ri; x <= ri; x++) {
      const d = Math.hypot(x, y);
      if (d > r * 0.62 && d < r + 0.4 && bay(cx + x, cy + y) < 0.28) px(cx + x, cy + y, dark ? C.vio4 : C.vio3);
    }
    const cols = dark ? [0, C.vio2, C.vio3, C.vio1, 0, C.vio2] : [0, C.vio0, C.vio2, C.vio0, 0, C.vio1];
    for (let y = -ri; y <= ri; y++) for (let x = -ri; x <= ri; x++) {
      const c = bladeCls(x, y, r, ang);
      if (!c) continue;
      px(cx + x, cy + y, c === 4 ? (r > 3 ? 0 : 35) : cols[c]);
    }
    if (!dark && r > 3 && ((tick >> 2) & 1)) {
      const a = ang + Math.PI / 4;
      px(cx + Math.round(Math.cos(a) * r * 0.36), cy + Math.round(Math.sin(a) * r * 0.36), 35);
    }
  }
  function drawPuff(pf) {
    const f = pf.t / pf.life, r = pf.r * (0.55 + 0.6 * easeOut(f)), thr = f < 0.45 ? 1.1 : 1.1 - (f - 0.45) * 2;
    const cx = Math.round(pf.x), cy = Math.round(pf.y - f * 4);
    const lobes = [[0, 0, 1], [-0.7, 0.3, 0.7], [0.7, 0.35, 0.7], [-0.35, -0.55, 0.65], [0.45, -0.45, 0.6]];
    for (let pass = 0; pass < 2; pass++) for (const [ox, oy, s] of lobes) {
      const lr = r * s * (pass ? 0.72 : 1), lx = cx + Math.round(ox * r + (pass ? -1 : 0)), ly = cy + Math.round(oy * r + (pass ? -1 : 0));
      const c = pass ? (f < 0.25 ? C.vio1 : C.vio2) : (f < 0.3 ? C.vio2 : C.vio3);
      const ri = Math.ceil(lr);
      for (let y = -ri; y <= ri; y++) for (let x = -ri; x <= ri; x++) {
        if (x * x + y * y > lr * lr) continue;
        if (bay(lx + x + pf.s, ly + y) >= thr) continue;
        px(lx + x, ly + y, c);
      }
    }
  }
  function drawSlashArc(sl) {
    const t = sl.t;
    if (t > 0.18) return;
    const ax = DX - 14, bx = DX + 12;
    const ay = sl.kind ? GY - 5 : GY - 33, by = sl.kind ? GY - 33 : GY - 4;
    const nx = (by - ay), ny = -(bx - ax), nl = Math.hypot(nx, ny);
    const sweep = Math.min(1, t / 0.035);
    DTH = t > 0.1 ? 1 - (t - 0.1) / 0.08 : 2;
    const bulge = sl.kind ? -4 : 4;
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      if (u > sweep) break;
      const b = Math.sin(Math.PI * u);
      const x = lerp(ax, bx, u) + nx / nl * bulge * b, y = lerp(ay, by, u) + ny / nl * bulge * b;
      const w = b * 2.6;
      for (let k = -3; k <= 3; k++) {
        const ak = Math.abs(k);
        if (ak > w + 0.6) continue;
        const c = ak === 0 ? 35 : ak < w - 0.6 ? C.vio0 : ak < w + 0.2 ? C.vio1 : C.vio2;
        P(x + nx / nl * k * 0.8, y + ny / nl * k * 0.8, c);
      }
    }
    DTH = 2;
  }
  function drawX() {
    if (xT < 0 || xT > 1.0) return;
    const cx = dumX(0, -18), cy = dumY(-18);
    const hx = 12, hy = 14;
    const brk = xT > 0.7 ? (xT - 0.7) / 0.3 : 0;
    DTH = brk > 0 ? 1 - brk : 2;
    const fat = xT < 0.07 ? 3 : 2;
    const pulse = (tick >> 2) & 1;
    for (const sgn of [1, -1]) {
      const n = 36;
      for (let i = 0; i <= n; i++) {
        const u = i / n * 2 - 1;
        const x = cx + u * hx, y = cy + u * hy * sgn;
        const taper = 1 - Math.abs(u) * 0.55;
        const w = fat * taper;
        for (let k = -4; k <= 4; k++) {
          const ak = Math.abs(k);
          if (ak > w + 1.4) continue;
          let c = ak < 0.5 ? 35 : ak < w - 0.3 ? (pulse ? C.vio0 : 35) : ak < w + 0.6 ? C.vio1 : C.vio3;
          if (ak >= w + 0.6 && bay(Math.round(x + k), Math.round(y)) > 0.5) continue;
          P(x + k, y, c);
        }
      }
    }
    // centre star glint
    if (xT < 0.5) {
      const L = xT < 0.1 ? 7 : 4 + pulse;
      for (let k = 1; k <= L; k++) { P(cx - k, cy, 35); P(cx + k, cy, 35); if (k < L - 2) { P(cx, cy - k, C.vio0); P(cx, cy + k, C.vio0); } }
    }
    DTH = 2;
  }

  function resetState() {
    Object.assign(pose, PO.ready); Object.assign(shown, PO.ready);
    actX = AX; actY = 0; actVis = 1; actGhost = 0; wp = 1; starR = 0; starA = 0; wind = 1; ev = null; bob = 0;
    dashing = 0; triI = 0; slI = 0; cloneOn = 0; cloneA = 0; prevCVis = 1; prevCGhost = 0; glow = 0; xT = -1;
    BIG.length = STARS.length = STUCK.length = PEND.length = GHOSTS.length = PUFFS.length = SLASH.length = 0;
    const s0 = snap();
    for (let i = 0; i < HN; i++) hist[i] = s0;
    cs = s0;
  }
  resetState();

  const ULT = { throw: 1, avenger: 1, triple: 1, blink: 1, slash: 1, hold: 1, blinkback: 1 };
  // export hook for the sprite-sheet baker (bake/bake.js)
  window.__AV = { drawNinja, bigStar, smallStar, drawPuff, drawSlashArc, drawX, drawScarf, handPos, PO, NINJA, TOPY, CLONE_MAP, GHOST_MAP,
    setMap(m) { MAP = m; }, setDth(d) { DTH = d; }, setXT(v) { xT = v; } };

  return {
    title: 'Avenger (Hamster)',
    pad: [98, 146.8, 174.6, 233.1],
    seq: [
      ['idle', 0.8],
      ['partner', 0.55],
      ['charge', 1.2, { call: 'AVENGER' }],
      ['throw', 0.2],
      ['avenger', 0.75],
      ['triple', 0.8],
      ['blink', 0.25],
      ['slash', 0.5],
      ['hold', 0.45],
      ['blinkback', 0.3],
      ['recover', 1.0],
      ['idle', 0.4],
    ],
    reset() { resetState(); },
    enter(k, i, dur) {
      if (k === 'partner') sfx('swish');
      if (k === 'charge') { sfx('charge', dur); sfx('whirr', dur); }
      if (k === 'throw') {
        const c = starCenter({ lx: shown.lx, ly: shown.ly, fx: shown.fx, fy: shown.fy, bob, sr: starR }, actX, actY);
        launchBig(c[0], c[1], -13, false);
        starR = 0; ev = 'big';
        flashFx(2, 1); sfx('shing'); sfx('whoosh', 0.35);
        burst(c[0], c[1], 14, RP_VSPARK, 80, 0.35, 0);
      }
      if (k === 'triple') { triI = 0; wp = 1; }
      if (k === 'blink') { dashing = 0; }
      if (k === 'slash') { slI = 0; wp = 2; }
      if (k === 'blinkback') { dashing = 0; }
    },
    update(k, p) {
      const dur = stateDur();
      // ---- pose targets
      let t = PO.ready, rate = 12, fast = false;
      if (k === 'partner') t = PO.seal;
      else if (k === 'charge') t = PO.charge;
      else if (k === 'throw') { t = PO.throwP; rate = 40; fast = true; }
      else if (k === 'avenger') t = p < 0.5 ? PO.throwP : PO.ready;
      else if (k === 'triple') {
        t = PO.ready;
        for (const b of [0.1, 0.52]) { if (p >= b - 0.1 && p < b) t = PO.wind; else if (p >= b && p < b + 0.22) { t = PO.throwP; fast = true; rate = 40; } }
      }
      else if (k === 'blink') t = PO.crouch;
      else if (k === 'slash') { t = p < 0.14 ? PO.up : p < 0.46 ? PO.down : PO.high; rate = 60; fast = true; }
      else if (k === 'hold') { t = p < 0.55 ? PO.high : PO.ready; rate = p < 0.55 ? 30 : 8; }
      else if (k === 'blinkback') t = PO.crouch;
      for (const key in t) pose[key] = ease(pose[key], t[key], rate);
      if (tick % 5 === 0 || fast) Object.assign(shown, pose);
      bob = (k === 'idle' || k === 'recover' || k === 'partner') ? (Math.floor(time * 2.4) & 1) : 0;
      if (k === 'slash' || k === 'hold') bob = 0;
      glow = ease(glow, ULT[k] || k === 'charge' ? 1 : 0, 6);
      wind = ease(wind, actGhost ? 2 : (k === 'charge' || ULT[k]) ? 1.35 : 1, 10);

      // ---- state logic
      if (k === 'idle' && tick % 60 === 0) spawn(actX + 3, TOPY + 5, rr(-12, -6), rr(-4, 0), 0.5, RP_SMOKE, -3);
      if (k === 'partner') {
        if (!cloneOn && p >= 0.3) {
          cloneOn = 1;
          puff(AX + CDX, GY + CDY - 10, 6, 16); sfx('poof');
          ringFx(AX + CDX, GY + CDY - 10, 9, 0.25, RP.vio, 0.8);
        }
        if (tick % 3 === 0) { const h = handPos(Object.assign({ bob, sr: 0 }, shown), actX, actY); spawn(h[0] + rr(-2, 2), h[1] + rr(-2, 1), rr(-6, 6), rr(-14, -4), 0.4, RP.vio, 0); }
      }
      if (k === 'charge') {
        wp = p > 0.08 ? 0 : 1;
        starR = p < 0.08 ? 0 : 1.2 + 5.3 * easeOut(clamp((p - 0.08) / 0.72, 0, 1));
        starA += DT * (5 + 26 * p);
        const c = starCenter({ lx: shown.lx, ly: shown.ly, fx: shown.fx, fy: shown.fy, bob, sr: starR }, actX, actY);
        if (tick % 2 === 0) { const i = spawn(0, 0, rand() * 6.28, rr(10, 17), 1.4, RP.vio, 13, 3); P_tx[i] = c[0]; P_ty[i] = c[1]; }
        if (p > 0.5 && tick % 4 === 0) spawn(c[0] + rr(-3, 3), c[1] + rr(-3, 3), rr(-10, 10), rr(-24, -8), 0.35, RP_VSPARK, 0);
      }
      if (k === 'throw' || k === 'avenger') wp = 0;
      if (k === 'avenger' && p > 0.45) wp = 1;
      if (k === 'triple') {
        const bursts = [0.1, 0.52];
        while (triI < 2 && p >= bursts[triI]) {
          const h = handPos(Object.assign({ bob, sr: 0 }, shown), actX, actY);
          tripleBurst(h[0] + 1, h[1] - 1, -15 + triI * 2, false);
          ev = triI === 0 ? 'tri1' : 'tri2';
          sfx('swish'); triI++;
        }
      }
      if (k === 'blink' || k === 'blinkback') {
        const back = k === 'blinkback';
        const p0 = back ? 0.15 : 0.3, p1 = back ? 0.55 : 0.7;
        const from = back ? DEST : AX, to = back ? AX : DEST;
        if (p >= p0 && p < p1) {
          if (!dashing) { dashing = 1; puff(actX, GY - 9, 5, 10); sfx('blink'); ev = 'vanish'; }
          actGhost = 1; actVis = 1;
          const f = easeInOut((p - p0) / (p1 - p0));
          actX = lerp(from, to, f);
          if (tick % 2 === 0) addGhost(Object.assign({}, snap(), { ev: null }), actX, actY, 0.16);
        } else if (p >= p1 && dashing === 1) {
          dashing = 2; actGhost = 0; actX = to;
          puff(actX, GY - 9, 4, 8); ev = 'appear';
          if (back) { sfx('poof'); wp = 1; }
        }
      }
      if (k === 'slash') {
        if (slI === 0 && p >= 0.14) {
          slI = 1; SLASH.push({ t: 0, kind: 0 });
          hitD(DX - 2, GY - 19, { dmg: roll(684000), crit: true, push: 2, stop: 3, straw: 10, shake: 6, sfx: false, impactC: C.vio1 });
          sfx('slash');
        }
        if (slI === 1 && p >= 0.46) {
          slI = 2; SLASH.push({ t: 0, kind: 1 }); xT = 0;
          hitD(DX - 1, GY - 18, { big: true, dmg: roll(4870000), crit: true, bigNum: true, push: 3.4, stop: 10, shake: 18, straw: 30, sfx: false, impactC: C.vio1 });
          flashFx(3, 1); sfx('xslash');
          ringFx(DX, GY - 18, 22, 0.35, RP_VSPARK, 0.9);
          burst(DX, GY - 18, 30, RP_VSPARK, 140, 0.5, 40, { sz: 0.3 });
          for (const s of STUCK) {
            const x = dumX(s.lx, s.ly), y = dumY(s.ly);
            spawn(x, y, rr(-90, -30), rr(-110, -50), 1.0, RP.white, 260, 0, 1);
            burst(x, y, 3, RP_SPARK, 50, 0.3, 100);
          }
          STUCK.length = 0;
        }
      }
      if (k === 'recover') {
        if (cloneOn === 1 && p >= 0.12) {
          cloneOn = 2;
          const cx = cs.x + CDX, cy = GY + CDY - 10;
          puff(cx, cy, 7, 18); sfx('poof');
        }
      }
      if (k === 'idle') wp = 1;
      cloneA = cloneOn === 1 ? Math.min(1, cloneA + DT * 6) : Math.max(0, cloneA - DT * 5);

      // ---- history + clone replay
      hist[tick & (HN - 1)] = snap();
      ev = null;
      cs = hist[(tick - DELAY) & (HN - 1)];
      if (cloneOn === 1) {
        const cx = cs.x + CDX, cy = cs.y + CDY;
        if (cs.ev === 'big') {
          const prev = hist[(tick - DELAY - 1) & (HN - 1)];
          const c = starCenter(prev, cx, cy);
          launchBig(c[0], c[1], -28, true); sfx('shing');
          burst(c[0], c[1], 10, RP_VSPARK, 70, 0.3, 0);
        }
        if (cs.ev === 'tri1') { const h = handPos(cs, cx, cy); tripleBurst(h[0] + 1, h[1] - 1, -24, true); }
        if (cs.ev === 'vanish' || cs.ev === 'appear') puff(cx, GY + cy - 9, 3, 6);
        if (cs.ghost && tick % 2 === 0) addGhost(cs, cx, cy, 0.14);
      }

      // ---- giant shurikens
      for (let i = BIG.length - 1; i >= 0; i--) {
        const b = BIG[i];
        b.t += DT;
        if (tick % 2 === 0) { b.trail.unshift([b.x, b.y]); if (b.trail.length > 3) b.trail.pop(); }
        const tx = dumX(DUM.left, b.ly) - 3, ty = dumY(b.ly);
        if (b.st === 0) {
          b.ang += DT * 24;
          const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy), step = 560 * DT;
          if (d <= step) {
            b.st = 1; b.t = 0; b.x = tx; b.y = ty; b.trail.length = 0;
            ringFx(tx + 3, ty, 9, 0.22, RP_VSPARK, 0.9);
            burst(tx + 3, ty, 14, RP_SPARK, 110, 0.35, 200, { a0: Math.PI * 0.6, a1: Math.PI * 1.4 });
            sfx('grind');
          } else { b.x += dx / d * step; b.y += dy / d * step; }
        } else if (b.st === 1) {
          b.ang += DT * 40;
          b.x = tx + (hash(tick, i) < 0.5 ? 0 : -1); b.y = ty + (hash(tick, i + 7) < 0.5 ? 0 : 1);
          dum.shiver = 0.05;
          const fxp = tx + 3;
          for (let q = 0; q < 3; q++) {
            const up = rand() < 0.6;
            spawn(fxp, ty + rr(-4, 4), rr(-150, -20), up ? rr(-130, -30) : rr(10, 70), rr(0.15, 0.4), q === 2 ? RP_VSPARK : RP_SPARK, 320);
          }
          while (b.hitN < 5 && b.t >= b.hitN * 0.105) {
            hitD(fxp + 1, ty + rr(-2, 2), { dmg: roll(b.clone ? 352000 : 386000), crit: b.hitN === 4 || rand() < 0.3, push: 0.8, stop: 1, straw: 5, shake: 3, flash: 0.03, sfx: false, impactC: C.vio1 });
            sfx('tink', b.hitN);
            b.hitN++;
          }
          if (b.t >= 0.54) { b.st = 2; b.vx = 80; sfx('whoosh', 0.25); }
        } else {
          b.ang += DT * 30;
          b.vx += 2200 * DT; b.x += b.vx * DT; b.y = ty;
          if (b.x > W + 14) BIG.splice(i, 1);
        }
      }
      // ---- small stars
      for (let i = PEND.length - 1; i >= 0; i--) if (PEND[i].at <= tick) { launchStar(PEND[i]); PEND.splice(i, 1); }
      for (let i = STARS.length - 1; i >= 0; i--) {
        const s = STARS[i];
        s.x += s.vx * DT; s.y += s.vy * DT;
        const face = dumX(DUM.left + 1, s.ly);
        if (s.x >= face) {
          const ly = Math.round(s.y - GY + dum.lift);
          STUCK.push({ lx: DUM.left + 1 + (STUCK.length % 2), ly, f: STUCK.length & 1 });
          hitD(face, s.y, { dmg: roll(s.clone ? 151000 : 168000), crit: rand() < 0.45, push: 0.7, stop: 1, straw: 4, shake: 3, flash: 0.03, sfx: false, impactC: C.steel });
          burst(face, s.y, 4, RP_SPARK, 60, 0.25, 150, { a0: Math.PI * 0.7, a1: Math.PI * 1.3 });
          sfx('stick');
          STARS.splice(i, 1);
        }
      }
      for (let i = GHOSTS.length - 1; i >= 0; i--) { GHOSTS[i].t += DT; if (GHOSTS[i].t > GHOSTS[i].life) GHOSTS.splice(i, 1); }
      for (let i = PUFFS.length - 1; i >= 0; i--) { PUFFS[i].t += DT; if (PUFFS[i].t > PUFFS[i].life) PUFFS.splice(i, 1); }
      for (let i = SLASH.length - 1; i >= 0; i--) { SLASH[i].t += DT; if (SLASH[i].t > 0.2) SLASH.splice(i, 1); }
      if (xT >= 0) {
        xT += DT;
        if (xT > 0.7 && xT < 1.0 && tick % 2 === 0) {
          const u = rr(-1, 1), sg = rand() < 0.5 ? 1 : -1;
          spawn(dumX(0, -18) + u * 12, dumY(-18) + u * 14 * sg, rr(-20, 20), rr(-40, -10), 0.4, RP_VSPARK, 0);
        }
        if (xT > 1.0) xT = -1;
      }
    },
    grade(k, p) {
      let lvl = 0;
      if (k === 'charge') lvl = Math.floor(clamp(p * 1.6, 0, 1) * 3.99);
      else if (ULT[k]) lvl = 3;
      else if (k === 'recover') lvl = Math.floor((1 - p) * 3.99);
      return VIO_DARK[Math.min(3, lvl)];
    },
    drawOnDummy(k, p) {
      for (const s of STUCK) {
        const x = dumX(s.lx, s.ly), y = dumY(s.ly);
        px(x - 1, y, 35); px(x, y, C.steel); px(x, y - 1, C.armor1); px(x, y + 1, C.armor2); px(x - 2, y + (s.f ? -1 : 1), C.steel);
      }
    },
    drawActor(k, p) {
      if (actVis && !actGhost) {
        const s = snap();
        drawNinja(s, actX, actY, glow > 0.3 ? ((tick >> 2) & 1 ? C.vio1 : C.vio2) : (fireGlow() > 0.9 ? C.hair1 : -1));
      }
    },
    drawFx(k, p) {
      // shadow partner: drawn after the grade so the dark clone still reads during the ult
      if (cloneA > 0 && cs.vis && !cs.ghost) {
        MAP = CLONE_MAP;
        const flick = ((tick >> 2) % 6) === 0;
        DTH = cloneA < 1 ? cloneA : flick ? 0.5 : 2;
        drawNinja(cs, cs.x + CDX, cs.y + CDY, C.vio2);
        MAP = null; DTH = 2;
      }
      // afterimages
      for (const gh of GHOSTS) {
        MAP = GHOST_MAP; DTH = (1 - gh.t / gh.life) * 0.6;
        drawNinja(gh.s, gh.x, gh.y, -1);
      }
      MAP = null; DTH = 2;
      if (actGhost) { MAP = GHOST_MAP; drawNinja(snap(), actX, actY, -1); MAP = null; }
      // charging shurikens (clone's then ninja's)
      if (cloneA > 0 && cs.sr > 0.5 && cs.vis) { const c = starCenter(cs, cs.x + CDX, cs.y + CDY); bigStar(c[0], c[1], cs.sr, cs.sa, true, cs.sr > 3); }
      if (starR > 0.5) {
        const c = starCenter({ lx: shown.lx, ly: shown.ly, fx: shown.fx, fy: shown.fy, bob, sr: starR }, actX, actY);
        bigStar(c[0], c[1], starR, starA, false, starR > 3);
      }
      // giant shurikens in flight / grinding
      for (const b of BIG) {
        for (let q = b.trail.length - 1; q >= 0; q--) {
          const [tx, ty] = b.trail[q];
          for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (bladeCls(x, y, 6.5, b.ang - (q + 1) * 0.5) >= 2 && bay(Math.round(tx) + x, Math.round(ty) + y) < 0.5 - q * 0.12) px(Math.round(tx) + x, Math.round(ty) + y, q ? C.vio4 : C.vio3);
        }
        if (b.st === 0 || b.st === 2) { const dir = b.st === 2 ? 1 : 1; line(b.x - 8 * dir, b.y - 3, b.x - 18 * dir, b.y - 3, C.vio3); line(b.x - 8, b.y + 3, b.x - 15, b.y + 3, C.vio4); }
        bigStar(b.x, b.y, 6.5, b.ang, b.clone, true);
      }
      // small stars
      for (const s of STARS) {
        const d = Math.hypot(s.vx, s.vy), ux = s.vx / d, uy = s.vy / d;
        for (let q = 1; q <= 4; q++) px(s.x - ux * q * 2, s.y - uy * q * 2, q < 3 ? C.vio2 : C.vio3);
        MAP = s.clone ? CLONE_MAP : null;
        smallStar(s.x, s.y, (tick >> 1) & 1, 35, C.steel);
        MAP = null;
      }
      for (const sl of SLASH) drawSlashArc(sl);
      drawX();
      for (const pf of PUFFS) drawPuff(pf);
    },
  };
})();

SND.shing = (c, o, t) => { tone(c, o, t, 'triangle', 2900, 2700, 0.4, 0.08); tone(c, o, t, 'sine', 4300, 4150, 0.3, 0.05); tone(c, o, t, 'square', 1450, 1400, 0.08, 0.02); noiseS(c, o, t, 0.1, 0.25, 6000, 'highpass'); };
SND.whirr = (c, o, t, d) => {
  d = d || 1; const n = Math.floor(d / 0.05);
  for (let i = 0; i < n; i++) { const k = i / n; noiseS(c, o, t + i * 0.05, 0.04, 0.04 + 0.16 * k, 700 + 2200 * k, 'bandpass', 3); }
  tone(c, o, t, 'sawtooth', 60, 150, d, 0.025, d * 0.8);
};
SND.grind = (c, o, t) => {
  for (let i = 0; i < 15; i++) noiseS(c, o, t + i * 0.036, 0.05, 0.22, 2400 + hash(i, 3) * 3200, 'bandpass', 6);
  tone(c, o, t, 'sawtooth', 880, 640, 0.58, 0.04, 0.04); tone(c, o, t, 'square', 1560, 1250, 0.55, 0.012);
};
SND.tink = (c, o, t, n) => { const f = 2300 + (n || 0) * 180; tone(c, o, t, 'square', f, f * 0.85, 0.06, 0.035); noiseS(c, o, t, 0.05, 0.3, 3200, 'highpass'); tone(c, o, t, 'sine', 170, 70, 0.08, 0.28); };
SND.swish = (c, o, t) => { noiseS(c, o, t, 0.13, 0.3, 1400, 'bandpass', 2, 5200, 0.06); };
SND.star = (c, o, t) => { noiseS(c, o, t, 0.07, 0.14, 3500, 'bandpass', 3, 7000, 0.02); tone(c, o, t, 'triangle', 3200, 2800, 0.05, 0.02); };
SND.stick = (c, o, t) => { tone(c, o, t, 'sine', 520, 170, 0.06, 0.25); noiseS(c, o, t, 0.04, 0.3, 2600, 'bandpass', 3); tone(c, o, t, 'square', 2800, 2600, 0.04, 0.015); };
SND.poof = (c, o, t) => { noiseS(c, o, t, 0.38, 0.4, 900, 'lowpass', 0, 180, 0.03); tone(c, o, t, 'sine', 240, 110, 0.16, 0.08); };
SND.blink = (c, o, t) => { tone(c, o, t, 'sine', 300, 1900, 0.1, 0.09); noiseS(c, o, t, 0.13, 0.25, 3000, 'highpass', 0, 9000, 0.02); };
SND.slash = (c, o, t) => { noiseS(c, o, t, 0.14, 0.5, 1200, 'bandpass', 1.5, 7500, 0.03); tone(c, o, t, 'triangle', 3300, 2600, 0.2, 0.05); SND.hit(c, o, t + 0.01); };
SND.xslash = (c, o, t) => {
  noiseS(c, o, t, 0.2, 0.6, 900, 'bandpass', 1.2, 8000, 0.03); SND.shing(c, o, t + 0.02); SND.hitBig(c, o, t + 0.02);
  for (let i = 0; i < 6; i++) tone(c, o, t + 0.08 + i * 0.03, 'sine', 3600 - i * 250, 3000 - i * 250, 0.2, 0.025);
};
