// Shadow Strike: BISHOP class (priest). Ported from the Genesis prototype (src/skills/04-genesis.js):
// white-and-gold robes, tall mitre, small halo, gold cross staff, Angel Ray bolts, winged holy pillar.
// Contract: bake/RPG_CLASSES.md. Everything here is self-contained and deterministic.
window.RPG_CLASS_BISHOP = function (BK) {
  const { Sheet, png, Grid, OUT } = BK;
  const FW = 48, FH = 40, PX = 24, PY = 37;          // character frame + feet anchor
  const WHITE = 35;

  // ---------------------------------------------------------------- grid helpers
  function gl(G, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      G.set(x0, y0, c);
      if ((x0 === x1 && y0 === y1) || ++n > 400) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  const empty = (G, x, y) => G.get(x, y) < 0;
  const setE = (G, x, y, c) => { if (empty(G, Math.round(x), Math.round(y))) G.set(x, y, c); };
  function toC(G, map) { const c = mk(G.w, G.h); use(c.getContext('2d')); for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { const v = G.a[y * G.w + x]; if (v >= 0) px(x, y, map ? map[v] : v); } use(g); return c; }
  function paint(w, h, fn) { const c = mk(w, h); use(c.getContext('2d')); fn(c); use(g); return c; }

  // pale violet ghost remap (like ninja_ghost), chosen by palette luminance
  const GHOST = PAL.map((hex, i) => {
    if (i === 0) return C.vio3;
    const t = parseInt(hex.slice(1), 16), l = (0.3 * (t >> 16) + 0.59 * ((t >> 8) & 255) + 0.11 * (t & 255)) / 255;
    return l > 0.9 ? WHITE : l > 0.72 ? C.vio0 : l > 0.5 ? C.vio1 : l > 0.3 ? C.vio2 : C.vio3;
  });

  // ---------------------------------------------------------------- body (front, facing right)
  // Rows follow the prototype BISHOP sprite with the hand-drawn ink removed; ink comes from Grid.outline().
  const LG = { W: C.robeW0, w: C.robeW1, d: C.robeW2, k: C.robeW3, G: C.gold, g: C.goldD, s: C.skin, S: C.skinD, e: 0, h: C.hair1, B: C.hair0, Y: C.holy0 };
  const HEAD = sprite([
    '..............',
    '......W.......',
    '.....WGW......',
    '.....WGW......',
    '....wWGWW.....',
    '....wWGWW.....',
    '....wWYWW.....',
    '...gGGGGG.....',
    '...ghSsss.....',
    '..g.hSsess....',
    '..g..hsBB.....',
  ], LG);
  const ROBE = sprite([
    '....WwBBBW....',   // 11 shoulders + beard
    '...WwwWBGWW...',
    '...dwwWWGWW...',
    '..dwwwWWGWWW..',
    '..dwwwWWGWWW..',
    '..dwwWWWGWWW..',
    '..dwwWWWGWWW..',
    '.dwwwWWWGWWWW.',
    '.dwwwWWWGWWWW.',
    '.GGGGGGGGGGGG.',   // 20 gold hem
    '..kddddddddd..',   // 21 underside
  ], LG);
  const FEET = { stand: [[4, 0], [9, 0]], tuck: [], wide: [[3, 0], [10, 0]], runA: [[2, 0], [11, 0]], runB: [[6, 0], [8, -1]], runC: [[3, 0], [10, 0]], runD: [[5, -1], [8, 0]], land: [[3, 0], [10, 0]] };

  function bishop(o) {
    o = Object.assign({ bob: 0, lean: 0, sway: 0, drop: [], flare: 0, feet: 'stand', eye: 'n', hover: 0, back: [-1, 5], hand: [3, 3], sa: -Math.PI / 2, grip: 5, len: 11,
      behind: false, glow: 0, flash: 0, tele: 0, halo: [0, 0], f: 0, ground: 0 }, o);
    const G = Grid(FW, FH), bx0 = 17;
    const list = [];
    for (let r = 0; r < 11; r++) list.push([HEAD[r], r]);
    for (let r = 11; r < 22; r++) if (o.drop.indexOf(r) < 0) list.push([ROBE[r - 11], r]);
    const feetY = PY - o.hover, n = list.length, rowY = {};
    list.forEach(([, r], i) => { rowY[r] = feetY - (n - i) + (r <= 13 ? o.bob : 0); });
    const dxOf = r => (r <= 10 ? o.lean : r <= 14 ? Math.round(o.lean / 2) : 0) + (r >= 18 ? o.sway : r >= 16 ? Math.round(o.sway / 2) : 0);
    const shY = rowY[11] + 1, fx = bx0 + 9 + Math.round(o.lean / 2), bkx = bx0 + 5 + Math.round(o.lean / 2);
    const hx = fx + o.hand[0], hy = shY + o.hand[1];
    const dx = Math.cos(o.sa), dy = Math.sin(o.sa);
    let qx = -dy, qy = dx; if (qy < -0.01 || (Math.abs(qy) < 0.01 && qx < 0)) { qx = -qx; qy = -qy; }
    const T = [Math.round(hx + dx * o.len), Math.round(hy + dy * o.len)];
    // the cross head snaps to the nearest 45 degrees so it always reads as a clean cross
    const oct = Math.round(o.sa / (Math.PI / 4)), sdx = Math.round(Math.cos(oct * Math.PI / 4)), sdy = Math.round(Math.sin(oct * Math.PI / 4));
    const diag = sdx !== 0 && sdy !== 0, PL = diag ? 5 : 6, BA = diag ? 3 : 4, BW = diag ? 1 : 2;
    let pqx = -sdy, pqy = sdx;
    const tip = [T[0] + sdx * PL, T[1] + sdy * PL];
    const staff = () => {
      gl(G, hx - dx * o.grip + qx, hy - dy * o.grip + qy, T[0] + qx, T[1] + qy, C.goldD);
      gl(G, hx - dx * o.grip, hy - dy * o.grip, T[0], T[1], C.gold);
      G.set(hx - dx * o.grip + qx, hy - dy * o.grip + qy, C.robeW3);
      // cross head
      for (let k = 1; k <= PL; k++) G.set(T[0] + sdx * k, T[1] + sdy * k, C.gold);
      const cx = T[0] + sdx * BA, cy = T[1] + sdy * BA;
      for (let k = -BW; k <= BW; k++) G.set(cx + pqx * k, cy + pqy * k, Math.abs(k) === BW ? C.goldD : C.gold);
      if (diag) { G.set(cx + pqx * 2, cy + pqy * 2, C.goldD); G.set(cx - pqx * 2, cy - pqy * 2, C.goldD); }
      G.set(cx, cy, o.glow ? WHITE : C.holy0); G.set(tip[0], tip[1], C.holy1);
      G.set(T[0], T[1], C.goldD);
    };
    // back arm (behind the body)
    const bky = shY, bhx = bkx + o.back[0], bhy = bky + o.back[1];
    gl(G, bkx, bky, bhx, bhy, C.robeW2); gl(G, bkx, bky + 1, bhx, bhy + 1, C.robeW2); gl(G, bkx + 1, bky, bhx + 1, bhy, C.robeW1);
    G.set(bhx, bhy + (o.back[1] < 0 ? -1 : 1), C.skin); G.set(bhx + 1, bhy + (o.back[1] < 0 ? -1 : 1), C.skinD);
    if (o.behind) staff();
    // body rows, bottom first so a bobbing upper body overlaps the robe below it
    for (let i = list.length - 1; i >= 0; i--) {
      const [row, r] = list[i], y = rowY[r], dxr = dxOf(r);
      let first = -1, last = -1;
      row.forEach((c, k) => { if (c < 0) return; if (first < 0) first = k; last = k; G.set(bx0 + k + dxr, y, c); });
      const fl = r >= 20 ? o.flare : r >= 18 ? Math.max(0, o.flare - 1) : 0;
      for (let k = 1; k <= fl; k++) { G.set(bx0 + first - k + dxr, y, row[first]); G.set(bx0 + last + k + dxr, y, r === 21 ? C.robeW2 : row[last]); }
      if (r === 21 && fl) G.set(bx0 + first - fl + dxr, y, C.robeW3);
    }
    // eye variants
    const ey = rowY[9], ex = bx0 + 7 + o.lean;
    if (o.eye === 'hurt') { G.set(ex, ey, C.skinD); G.set(ex, ey - 1, 0); G.set(ex - 1, ey, 0); }
    else if (o.eye === 'closed') { G.set(ex, ey, C.skinD); G.set(ex - 1, ey, 0); }
    // feet
    for (const [c, oy] of FEET[o.feet]) { G.set(bx0 + c, feetY + oy, C.goldD); if (c <= 3) G.set(bx0 + c - 1, feetY + oy, C.goldD); if (c >= 10) G.set(bx0 + c + 1, feetY + oy, C.goldD); }
    // staff + front arm
    if (!o.behind) staff();
    gl(G, fx, shY, hx, hy, C.robeW0); gl(G, fx, shY + 1, hx, hy + 1, C.robeW1); gl(G, fx - 1, shY + 1, hx - 1, hy + 2, C.robeW2);
    const sgn = Math.sign(hx - fx) || 1;
    G.set(hx - sgn, hy, C.gold); G.set(hx - sgn, hy + 1, C.goldD);
    G.set(hx, hy, C.skin); G.set(hx, hy + 1, C.skinD);
    G.outline();

    // ---- post-outline light: halo, glows, flashes (no ink so they glow)
    const tx = bx0 + 6 + o.lean + o.halo[0], ty = rowY[1] - 3 + o.halo[1];
    const HX = [[-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1]];
    for (const [a, b] of HX) G.set(tx + a, ty + b, C.gold);
    G.set(tx - 3, ty, C.gold); G.set(tx + 3, ty, C.gold);
    for (let a = -2; a <= 2; a++) G.set(tx + a, ty + 1, C.goldD);
    setE(G, tx - 4, ty, 0); setE(G, tx + 4, ty, 0);
    const SP = [[-2, -1], [0, -1], [2, -1], [3, 0], [2, 1], [0, 1], [-2, 1], [-3, 0]], sp = SP[(o.f * 3) % 8];
    G.set(tx + sp[0], ty + sp[1], WHITE);
    const ccx = T[0] + sdx * BA, ccy = T[1] + sdy * BA; qx = pqx; qy = pqy;
    if (o.glow) {
      const r = 3 + o.glow;
      for (let i = 0; i < 28; i++) {
        const a = i / 28 * Math.PI * 2 + o.f * 0.4, x = Math.round(ccx + Math.cos(a) * r), y = Math.round(ccy + Math.sin(a) * r);
        if ((i + o.f) % 3) setE(G, x, y, i % 2 ? C.holy1 : C.gold);
      }
      for (let k = 1; k <= 1 + o.glow; k++) { setE(G, ccx + qx * (2 + k), ccy + qy * (2 + k), k > 2 ? C.gold : C.holy1); setE(G, ccx - qx * (2 + k), ccy - qy * (2 + k), k > 2 ? C.gold : C.holy1); }
      for (let k = 1; k <= o.glow; k++) setE(G, tip[0] + sdx * k, tip[1] + sdy * k, k > 1 ? C.holy1 : WHITE);
      if (o.glow >= 2) for (let q = 0; q < 6; q++) {
        const a = hash(q, o.f + 3) * 6.28, rr2 = 5 + hash(q, o.f + 9) * 4;
        const x = Math.round(ccx + Math.cos(a) * rr2), y = Math.round(ccy + Math.sin(a) * rr2);
        setE(G, x, y, q & 1 ? WHITE : C.holy1);
        if (o.glow >= 3 && (q & 1)) { setE(G, x + 1, y, C.gold); setE(G, x - 1, y, C.gold); setE(G, x, y + 1, C.gold); setE(G, x, y - 1, C.gold); }
      }
    }
    if (o.flash) {
      const L = 1 + o.flash;
      for (let k = 1; k <= L + 1; k++) { setE(G, tip[0] + k, tip[1], k <= L - 1 ? WHITE : C.holy1); }
      for (let k = 1; k <= L; k++) { setE(G, tip[0], tip[1] - k, k < L ? C.holy0 : C.holy1); setE(G, tip[0], tip[1] + k, k < L ? C.holy0 : C.holy1); }
      if (o.flash >= 2) { for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) setE(G, tip[0] + a * 2, tip[1] + b * 2, C.gold); setE(G, tip[0] - 2, tip[1], C.holy1); }
    }
    if (o.ground) { // soft gold glow under hovering feet
      for (let x = PX - 8; x <= PX + 8; x++) {
        const d = Math.abs(x - PX) / 8;
        if (bay(x, PY) < (1 - d) * 0.9) setE(G, x, PY, d < 0.4 ? C.holy1 : C.gold);
        if (bay(x + 1, PY - 1) < (0.6 - d) * 0.7) setE(G, x, PY - 1, C.goldD);
      }
    }
    if (o.tele) { // dissolve from the feet up into holy sparkles (teleport)
      const cut = feetY - Math.round(26 * o.tele);
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        const v = G.get(x, y); if (v < 0) continue;
        const k = (y - cut) / 8;
        if (k > 0 && bay(x, y) < Math.min(1, k)) G.a[y * FW + x] = (hash(x, y) < 0.12 && k < 1.6) ? C.holy1 : -1;
      }
      for (let q = 0; q < 14; q++) {
        const x = PX + Math.round((hash(q, 21 + o.f) - 0.5) * 20), y = feetY - Math.round(hash(q, 33 + o.f) * 30);
        const c = q % 3 === 0 ? WHITE : q % 3 === 1 ? C.holy1 : C.gold;
        setE(G, x, y, c); if (q % 4 === 0) { setE(G, x - 1, y, C.gold); setE(G, x + 1, y, C.gold); setE(G, x, y - 1, C.gold); setE(G, x, y + 1, C.gold); }
      }
      // light column streaks
      for (let k = 0; k < 5; k++) { const x = PX - 6 + k * 3, y1 = feetY - 4 - Math.round(hash(k, o.f) * 10), len = 5 + Math.round(hash(k, 7 + o.f) * 8); for (let j = 0; j < len; j++) if ((j + k) & 1) setE(G, x, y1 - j, j < 2 ? C.holy1 : C.goldD); }
      // ring at the feet
      for (let i = 0; i < 24; i++) { if (i % 2) continue; const a = i / 24 * 6.28; setE(G, Math.round(PX + Math.cos(a) * (6 + o.f * 2)), Math.round(PY - 1 + Math.sin(a) * 1.5), i % 4 ? C.holy1 : C.gold); }
    }
    return { G, hand: [tip[0] - PX, PY - tip[1]] };
  }

  // ---------------------------------------------------------------- back view (climb)
  // Seen from behind on a rope that runs up the anchor column (PX). Hand over hand: one arm reaches high and grips
  // above the mitre, the other is bent with the fist on the rope at chest height; they swap every step. The same-side
  // knee lifts (hem hitches up, the foot tucks), the other foot hangs; in the pull frames both feet clamp the rope.
  const LB = Object.assign({}, LG, { o: C.gold, x: C.robeW2 });
  const BHEAD = sprite([   // 15 wide, column 7 = PX. Mitre back: white with a gold orphrey stripe, gold band.
    '.......w.......',   // 0 mitre tip
    '......wGW......',
    '......wGW......',
    '.....wwGWW.....',
    '.....wwGWW.....',
    '.....wwGWW.....',
    '.....GGGGG.....',   // 6 band
    '.....gGYGg.....',   // 7 band lower
    '....hBBBBBh....',   // 8 white hair under the mitre
    '.....hBBBh.....',   // 9 nape
  ], LB);
  const BROBE = sprite([
    '...dwwGGGwwd...',   // 0 shoulders + gold collar
    '..dwwWGGGWwwd..',   // 1 yoke of the chasuble orphrey
    '..dwwWWGWWwwd..',   // 2
    '..dwwWWGWWwwd..',   // 3
    '..dwwWWGWWwwd..',   // 4
    '..dwwWWGWWwwd..',   // 5
    '.dwwwWWGWWwwwd.',   // 6
    '.dwwwWWGWWwwwd.',   // 7
    '.dwwwWWGWWwwwd.',   // 8
    'dwwwwWWGWWwwwwd',   // 9
    'GGGGGGGGGGGGGGG',   // 10 gold hem
    '.kddddddddddddk',   // 11 underside
  ], LB);
  function Lay() { return Grid(FW, FH); }
  function comp(G, L, ol) { if (ol) L.outline(); for (let i = 0; i < L.a.length; i++) if (L.a[i] >= 0) G.a[i] = L.a[i]; }
  // thick 2px sleeve segment: lit upper/outer edge, mid body, shaded underside
  function sleeve(L, x0, y0, x1, y1, side) {
    gl(L, x0, y0 + 1, x1, y1 + 1, C.robeW2);
    gl(L, x0 - side, y0, x1 - side, y1, C.robeW1);
    gl(L, x0, y0, x1, y1, C.robeW0);
  }
  // k0: left hand high, right fist at the chest, left knee up. k1: the pull (body rises 1, hands slide 2 down the
  // body, feet clamp the rope). k2/k3 mirror it.
  function bishopBack(k) {
    const G = Grid(FW, FH), x0 = PX - 7, lift = k & 1;
    const yR = PY - 12 - lift, yH = yR - 10, hi = k < 2 ? -1 : 1;       // hi: which side holds the high grip (-1 left)
    const knee = k === 0 ? -1 : k === 2 ? 1 : 0, sway = [-1, 0, 1, 0][k];
    const fy0 = PY - lift;
    // ---- feet (under the hem)
    const foot = (x, y, tuck) => { G.set(x, y, C.goldD); G.set(x + 1, y, tuck ? C.robeW3 : C.goldD); G.set(x, y - 1, C.robeW3); G.set(x + 1, y - 1, C.robeW3); };
    if (knee === 0) { foot(PX - 2, fy0 + 1); foot(PX + 1, fy0 + 1); }                 // both feet clamp the rope
    else { foot(knee < 0 ? PX + 1 : PX - 2, PY); foot(knee < 0 ? PX - 5 + sway : PX + 4 + sway, PY - 1, true); }
    // ---- robe (hem sways; on the raised-knee side the outer corner hitches up)
    for (let r = 11; r >= 0; r--) {
      const y = yR + r, d = r >= 8 ? sway : r >= 6 ? Math.round(sway / 2) : 0;
      BROBE[r].forEach((c, i) => {
        if (c < 0) return;
        const o = knee < 0 ? 6 - i : knee > 0 ? i - 8 : -1;         // distance into the raised side
        if (r === 11 && o >= 2) return;                                // hem hitched up by the knee
        G.set(x0 + i + d, y, c);
      });
    }
    // ---- head: mitre back, hair, lappets hanging down the nape
    for (let r = 0; r < 10; r++) BHEAD[r].forEach((c, i) => { if (c >= 0) G.set(x0 + i, yH + r, c); });
    for (const lx of [PX - 1, PX + 1]) { for (let j = 8; j <= 10; j++) G.set(lx, yH + j, lx < PX ? C.goldD : C.gold); G.set(lx, yH + 11, C.goldD); }
    G.outline();
    // ---- halo: a flat gold ring floating round the mitre, passing behind it
    { const hy = yH + 4;
      for (const s of [-1, 1]) { setE(G, PX + s * 4, hy, C.holy1); setE(G, PX + s * 5, hy, C.gold); setE(G, PX + s * 6, hy + 1, C.gold); setE(G, PX + s * 5, hy + 1, C.goldD); setE(G, PX + s * 4, hy + 1, C.goldD); }
      G.set(PX + (k < 2 ? 5 : -5), hy, WHITE); }
    // ---- arms: shoulder -> elbow (out to the side) -> gold cuff -> fist on the rope
    const arm = (side, fy, pose) => {
      const L = Lay(), sx = PX + side * 4, sy = yR + 1;
      const high = pose === 'high';
      const ex = PX + side * 7, ey = high ? fy + 7 : sy + 5;
      const wx = PX + side * 2, wy = fy + (high ? 2 : 1);
      sleeve(L, sx, sy, ex, ey, side); sleeve(L, ex, ey, wx, wy, side);
      L.set(ex + side, ey, C.robeW1); L.set(ex + side, ey + 1, C.robeW2);      // elbow point
      if (high) { L.set(wx - side, wy, C.gold); L.set(wx, wy, C.gold); L.set(wx + side, wy, C.goldD); }   // flared cuff
      else { L.set(wx, wy - 1, C.gold); L.set(wx, wy, C.gold); L.set(wx, wy + 1, C.goldD); }
      for (let q = -1; q <= 1; q++) { L.set(PX + q, fy, q ? C.skin : C.skinD); L.set(PX + q, fy + 1, q === side ? C.skin : C.skinD); }
      comp(G, L, true);
    };
    const TOP = yH - 3 + lift * 2, LOW = yR + 1 + lift * 2;
    arm(-hi, LOW, 'low'); arm(hi, TOP, 'high');
    return { G, hand: [0, PY - TOP] };
  }

  // ---------------------------------------------------------------- character sheet
  const U = -Math.PI / 2;
  const ANIMS = [
    ['idle', 6, 1, [{ bob: 0 }, { bob: 0, sway: 0 }, { bob: 1 }, { bob: 1 }]],
    ['run', 12, 1, [
      { lean: 1, bob: 0, sway: -1, feet: 'runA', hand: [4, 0], sa: -1.2, back: [-4, 3] },
      { lean: 1, bob: 1, sway: 0, feet: 'runB', hand: [4, 1], sa: -1.25, back: [-3, 4] },
      { lean: 1, bob: 0, sway: 1, feet: 'runC', hand: [4, 0], sa: -1.2, back: [-2, 4] },
      { lean: 1, bob: 1, sway: 0, feet: 'runD', hand: [4, 1], sa: -1.25, back: [-3, 4] }]],
    ['jump', 10, 0, [{ drop: [16], flare: 1, feet: 'tuck', hand: [3, -2], sa: -1.15, back: [-4, 1] }]],
    ['fall', 8, 1, [{ flare: 2, feet: 'wide', hand: [3, -3], sa: -1.0, back: [-4, -2], sway: 0 }, { flare: 1, feet: 'wide', hand: [3, -4], sa: -1.0, back: [-4, -3], sway: 1 }]],
    ['jump2', 12, 0, [{ hand: [4, -6], sa: U, len: 9, grip: 6, back: [-3, -5], tele: 0.6, eye: 'closed' }, { hand: [3, -3], sa: -1.3, back: [-3, -1], tele: 0.25, glow: 1 }]],
    ['attack', 16, 0, [
      { hand: [2, -2], sa: -1.15, back: [-2, 4], lean: -1, grip: 5, len: 10 },
      { hand: [5, 0], sa: -0.12, back: [-4, 2], lean: 1, grip: 7, len: 9, flash: 1, sway: -1 },
      { hand: [4, 0], sa: -0.12, back: [-4, 2], lean: 1, grip: 7, len: 9, flash: 2, glow: 1, sway: -1 },
      { hand: [4, 1], sa: -0.5, back: [-3, 3], grip: 6, len: 10 }]],
    ['cast', 8, 1, [{ hand: [4, -6], sa: U, len: 9, grip: 6, back: [-3, -3], glow: 1, eye: 'closed' }, { hand: [4, -6], sa: U, len: 9, grip: 6, back: [-3, -4], glow: 2, eye: 'closed', bob: 1 }]],
    ['skill', 12, 0, [
      { hand: [4, -5], sa: -1.3, len: 9, grip: 6, back: [-3, -6], glow: 1, hover: 1, ground: 1 },
      { hand: [5, -6], sa: -1.25, len: 9, grip: 6, back: [-4, -9], glow: 2, hover: 2, ground: 1 },
      { hand: [5, -6], sa: -1.25, len: 9, grip: 6, back: [-4, -9], glow: 3, hover: 2, ground: 1, eye: 'closed' }]],
    ['climb', 8, 1, [{ back_: 0 }, { back_: 1 }, { back_: 2 }, { back_: 3 }]],
    ['crouch', 10, 0, [{ drop: [15, 16], flare: 1, feet: 'land', bob: 1, hand: [4, 2], sa: -1.35, back: [-2, 4] }]],
    ['hurt', 10, 0, [{ lean: -2, sway: 1, hand: [4, -2], sa: -0.7, back: [-5, -1], eye: 'hurt', halo: [-1, -1], flare: 1, feet: 'wide', grip: 4, len: 11 }]],
  ];
  const frames = [], anims = {};
  let fi = 0;
  for (const [an, fps, loop, list] of ANIMS) {
    const idx = [];
    for (const p of list) { frames.push(p.back_ !== undefined ? bishopBack(p.back_) : bishop(Object.assign({ f: fi }, p))); idx.push(fi++); }
    anims[an] = { fps, loop: !!loop, frames: idx };
  }
  for (const [name, map] of [['pc_bishop', null], ['pc_bishop_ghost', GHOST]]) {
    const sh = Sheet(name, FW, FH, 16, { px: PX, py: PY });
    for (const fr of frames) sh.add(toC(fr.G, map), 0, 0, fr.hand);
    sh.done();
    const A = OUT.atlas.sheets[name]; A.anims = anims; A.hands = A.extra; delete A.extra;
  }

  // ---------------------------------------------------------------- portrait 34x34
  {
    const G = Grid(34, 34);
    const E = (cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const ddx = (x - cx) / rx, ddy = (y - cy) / ry; if (ddx * ddx + ddy * ddy <= 1) G.set(x, y, fn(ddx, ddy, x, y)); } };
    // robe shoulders + gold stole
    for (let y = 25; y < 34; y++) { const hw = 9 + (y - 25) * 0.9; for (let x = Math.round(17 - hw); x <= Math.round(18 + hw); x++) { const nx = (x - 17.5) / hw; G.set(x, y, nx < -0.7 ? C.robeW2 : nx < -0.25 ? C.robeW1 : C.robeW0); } }
    for (let y = 26; y < 34; y++) { for (const sx of [11, 23]) { const x = sx + Math.round((y - 26) * (sx < 17 ? -0.25 : 0.25)); G.set(x, y, C.gold); G.set(x + 1, y, C.goldD); } }
    for (let y = 28; y < 34; y += 3) { G.set(11 - Math.round((y - 26) * 0.25), y, C.holy0); G.set(23 + Math.round((y - 26) * 0.25) + 1, y, C.gold); }
    // face
    E(18, 17, 6.5, 6.5, (ddx, ddy) => (ddx < -0.55 || ddy > 0.7 ? C.skinD : C.skin));
    // beard: big white beard from the cheeks down over the chest
    for (let y = 18; y <= 31; y++) { const t = (y - 18) / 13, hw = 7.5 * (1 - t * t * 0.75), bx = 18.5 + t * 1.5; for (let x = Math.round(bx - hw); x <= Math.round(bx + hw); x++) { if (y < 21 && Math.abs(x - 20) < 3 && y < 20) continue; const nx = (x - bx) / hw; G.set(x, y, nx < -0.45 ? C.hair1 : ((x + y * 2) % 5 === 0 ? C.hair1 : C.hair0)); } }
    for (let x = 16; x <= 23; x++) G.set(x, 20, C.hair0); G.set(19, 21, C.skinD); G.set(20, 21, C.crim3); G.set(21, 21, C.skinD);
    // hair at the back of the head
    for (let y = 13; y <= 19; y++) { G.set(11, y, C.hair1); G.set(12, y, y % 2 ? C.hair0 : C.hair1); }
    // eyes (kind, half closed), brows, nose
    for (const ex of [17, 22]) { G.set(ex, 16, 0); G.set(ex + 1, 16, 0); G.set(ex, 17, C.skinD); }
    G.set(16, 14, C.hair0); G.set(17, 14, C.hair0); G.set(18, 14, C.hair1); G.set(22, 14, C.hair0); G.set(23, 14, C.hair0);
    G.set(25, 16, C.skin); G.set(25, 17, C.skin); G.set(26, 17, C.skin); G.set(25, 18, C.skinD); G.set(26, 18, C.skinD);
    // mitre: tall, white, gold band + central orphrey + cross
    for (let y = 1; y <= 11; y++) { const t = (y - 1) / 10, hw = 0.6 + Math.pow(t, 0.8) * 6.6; for (let x = Math.round(17.5 - hw); x <= Math.round(17.5 + hw); x++) { const nx = (x - 17.5) / hw; G.set(x, y, nx < -0.6 ? C.robeW1 : nx > 0.75 ? C.robeW1 : C.robeW0); } }
    for (let y = 2; y <= 11; y++) G.set(17, y, C.gold), G.set(18, y, y < 5 ? C.gold : C.robeW0);
    for (let x = 14; x <= 21; x++) G.set(x, 6, C.gold); G.set(17, 6, C.holy0); G.set(18, 6, C.gold);
    for (let y = 4; y <= 9; y++) G.set(17, y, C.gold); G.set(18, 5, C.goldD); G.set(18, 7, C.goldD);
    for (let x = 10; x <= 25; x++) { G.set(x, 11, C.goldD); G.set(x, 10, C.gold); } G.set(17, 10, C.crim1); G.set(21, 10, C.ice2); G.set(13, 10, C.ice2);
    // lappet ribbon behind
    for (let y = 12; y <= 22; y++) { G.set(9 - Math.round((y - 12) * 0.15), y, C.goldD); G.set(10 - Math.round((y - 12) * 0.15), y, C.gold); }
    G.outline();
    const face = toC(G, null);
    const c = paint(34, 34, (cv2) => {
      for (let y = 0; y < 34; y++) for (let x = 0; x < 34; x++) { const d = Math.hypot(x - 17, y - 12) / 22; px(x, y, bay(x, y) < 1 - d ? C.vio4 : C.vio5); }
      // halo ring behind the mitre
      for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2, x = 17.5 + Math.cos(a) * 12.5, y = 9 + Math.sin(a) * 4.5; px(x, y, Math.sin(a) < 0 ? C.gold : C.goldD); px(x, y + 1, Math.sin(a) < 0 ? C.goldD : C.vio5); if (Math.sin(a) < -0.5) px(x, y - 1, C.holy1); }
      cv2.getContext('2d').drawImage(face, 0, 2);
      R(0, 0, 34, 1, 0); R(0, 33, 34, 1, 0); R(0, 0, 1, 34, 0); R(33, 0, 1, 34, 0);
      R(1, 1, 32, 1, C.gold); R(1, 1, 1, 32, C.gold); R(1, 32, 32, 1, C.goldD); R(32, 1, 1, 32, C.goldD);
      R(2, 2, 30, 1, 0); R(2, 31, 30, 1, 0); R(2, 2, 1, 30, 0); R(31, 2, 1, 30, 0);
      for (const [x, y] of [[1, 1], [32, 1], [1, 32], [32, 32]]) px(x, y, C.holy0);
    });
    png('portrait_pc_bishop', c);
  }

  // ---------------------------------------------------------------- bolt drawing (shared by icons + fx)
  // Angel Ray bolt from the prototype: gold trail, white core, twinkling 4-point head.
  function bolt(x, y, ux, uy, s, n) {
    n = n || 12;
    for (let j = n; j >= 1; j--) {
      const f = j / n, c = f > 0.75 ? C.goldD : f > 0.5 ? C.gold : f > 0.25 ? C.holy1 : C.holy0;
      if (f > 0.75 && ((j + s) & 1)) continue;
      px(x - ux * j, y - uy * j, c); if (f < 0.75) px(x - ux * j, y - uy * j + 1, f < 0.34 ? C.holy1 : C.gold);
    }
    px(x, y - 2 - s, C.holy1); px(x, y + 2 + s, C.holy1); px(x + 2 + s, y, C.holy1); px(x - 2, y, C.holy1);
    px(x, y - 1, C.holy0); px(x, y + 1, C.holy0); px(x + 1, y, C.holy0); px(x - 1, y, C.holy0); px(x, y, WHITE);
  }


  // ---------------------------------------------------------------- icons 14x14
  {
    const sh = Sheet('icons_bishop', 14, 14, 5, { names: { j: 0, k: 1, l: 2, u: 3, sp: 4 } });
    const icon = fn => { const c = paint(14, 14, () => { R(0, 0, 14, 14, C.vio5); fn(); }); sh.add(c, 0, 0); };
    // j: holy arrow
    icon(() => { const ux = 0.894, uy = -0.447; bolt(10, 5, ux, uy, 0, 10); for (const [x, y] of [[3, 3], [6, 11], [11, 10]]) px(x, y, C.goldD); });
    const art = (rows) => rows.forEach((r, y) => Array.from(r).forEach((ch, x) => { const c = { W: WHITE, Y: C.holy1, H: C.holy0, G: C.gold, D: C.goldD, V: C.vio1, v: C.vio2 }[ch]; if (c !== undefined) px(x, y, c); }));
    // k: angel ray (an angel wing over a horizontal holy beam)
    icon(() => art([
      '.......DGD....',
      'DGGGGGGWWG....',
      'YWWWWWWHWG....',
      '.DGGGGGWHG....',
      '.YWWWWWHWG....',
      '..DGGGGWHG....',
      '..YWWWWHWG....',
      '....DGGWHGD.D.',
      '....YWWHYGGGGG',
      '...YHWWWHHHHHY',
      '..HWWWWWWWWWWW',
      '...YHWWWHHHHHY',
      '....DGYGGGGGGG',
      '.....D.D.D.D.D',
    ]));
    // l: genesis (winged pillar)
    icon(() => art([
      '..............',
      '.D...GGGG...D.',
      'WD..........DW',
      'WWD...HH...DWW',
      'YWWD.GWWG.DWWY',
      '.YWWDGWWGDWWY.',
      '..YWWGWWGWWY..',
      '...YDGWWGDY...',
      '....DGWHGD....',
      '.....GWWG.....',
      '.....GHWG.....',
      '....GHWWHG....',
      '..DGHWWWWHGD..',
      '.DGYYHWWHYYGD.',
    ]));
    // u: heal (gold cross with rising sparkles)
    icon(() => {
      R(5, 2, 4, 10, C.goldD); R(2, 5, 10, 4, C.goldD);
      R(6, 3, 2, 8, C.gold); R(3, 6, 8, 2, C.gold); R(6, 6, 2, 2, WHITE); px(6, 3, C.holy0); px(3, 6, C.holy0);
      for (const [x, y, c] of [[1, 2, WHITE], [12, 3, C.holy1], [11, 11, WHITE], [2, 11, C.holy1], [12, 8, C.gold]]) px(x, y, c);
      px(1, 1, C.holy1); px(0, 2, C.holy1); px(2, 2, C.holy1); px(1, 3, C.holy1); px(1, 2, WHITE);
    });
    // sp: teleport (a sparkle trail arcing up into a burst star)
    icon(() => art([
      '..............',
      '..........Y...',
      '..........W...',
      '.........YWY..',
      '.......YHWWWHY',
      '.........YWY..',
      '....V.....W...',
      '.......H..Y...',
      '...V..Y.......',
      '.....G........',
      '.DGGGDG.......',
      'G..YWY.G......',
      '.DGGGGGD......',
      '..............',
    ]));
    sh.done();
  }

  // ---------------------------------------------------------------- fx_bishop_arrow 14x7
  {
    const sh = Sheet('fx_bishop_arrow', 14, 7, 2, { px: 7, py: 3, fps: 12, anims: { play: { fps: 12, loop: true, frames: [0, 1] } } });
    for (let s = 0; s < 2; s++) sh.add(paint(14, 7, () => bolt(10, 3, 1, 0, s, 10)), 0, 0);
    sh.done();
  }

  // ---------------------------------------------------------------- Angel Ray: angel + sustained holy beam
  // The angel hovers behind the bishop; the beam starts at fx_bishop_beamhead (staff tip), is tiled right with
  // fx_bishop_beam segments and ends in fx_bishop_beamend. All light: gold rims instead of ink.
  function glowRim(G) { // like Grid.outline(), but a luminous gold rim (darker under the shape, as in the genesis wings)
    const b = G.a.slice();
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (G.a[y * G.w + x] < 0) {
      if (G.get(x, y - 1) >= 0) b[y * G.w + x] = C.goldD;
      else if (G.get(x, y + 1) >= 0 || G.get(x - 1, y) >= 0 || G.get(x + 1, y) >= 0) b[y * G.w + x] = C.gold;
    }
    G.a.set(b);
  }
  const BRIGHT = {}; BRIGHT[C.goldD] = C.gold; BRIGHT[C.gold] = C.holy1; BRIGHT[C.holy1] = C.holy0; BRIGHT[C.holy0] = WHITE; BRIGHT[C.skin] = C.holy1; BRIGHT[C.skinD] = C.gold;

  // ---- fx_bishop_angel 40x48, pivot bottom centre (20,47)
  {
    const AW = 40, AH = 48;
    // wing: leading-edge arm + layered feather strokes (ported from the genesis wings, scaled down). Local coords,
    // extends to +x from the root; v: 1/2 feathers, 3 feather tips, 4 coverts, 5 arm
    // wing: per-column silhouette like the genesis pillar wings (leading edge arcs up and out, feathers hang below it
    // with scalloped tips), covert row + feather seams for detail. Local coords extend to +x from the root; s mirrors.
    function drawWing(G, rx, ry, s, len, ht, flap) {
      const P = (x, y, c) => G.set(rx + s * x, ry + y, c);
      for (let x = 0; x <= len; x++) {
        const u = x / len, top = Math.round(-(ht + flap * 1.5) * Math.pow(Math.sin(u * Math.PI / 2), 0.75));
        const th = u < 0.6 ? lerp(5, 11, u / 0.6) : lerp(11, 3.5, (u - 0.6) / 0.4);
        const ph = (len - x) % 3, tip = ph === 1 ? 1 : ph === 0 ? -1 : 0;    // 3-column feathers: point, body, notch
        const bot = Math.round(top + th + tip);
        const cov = Math.round(top + Math.max(2, th * 0.38));
        for (let y = top; y <= bot; y++) {
          const f = (y - top) / Math.max(1, bot - top);
          let c;
          if (y <= top + 1) c = WHITE;                                                   // leading edge
          else if (y < cov) c = C.holy0;                                                 // coverts
          else if (y === cov) c = x % 2 ? C.gold : C.holy1;                              // covert scallop
          else if (ph === 0) c = f > 0.7 ? C.gold : C.holy1;                             // seam between flight feathers
          else c = f > 0.8 ? C.holy1 : f > 0.55 ? C.holy0 : WHITE;
          P(x, y, c);
        }
      }
    }
    const LA = { W: WHITE, H: C.holy0, Y: C.holy1, G: C.gold, g: C.goldD, s: C.skin, S: C.skinD };
    const BODY = sprite([   // x 15.., y 8..: head in profile facing right, white robe with gold sash + orphrey
      '.....YYY......',   // 8  golden hair
      '....YYYYG.....',   // 9
      '...GYYYGss....',   // 10
      '...GYYGsss....',   // 11
      '...gGYGsSs....',   // 12
      '....gGGss.....',   // 13
      '.....GYHH.....',   // 14 neck
      '....YHWWWH....',   // 15
      '....YHWWWWH...',   // 16 shoulders (profile: narrow)
      '....YHWWWWH...',   // 17
      '....YHHWWWH...',   // 18
      '....YHHWWWH...',   // 19
      '....gGGGGGG...',   // 20 sash
      '...YHHWGWWH...',   // 21
      '..YHHWWGWWWH..',   // 22
      '..YHHWWGWWWH..',   // 23
      '..YHHWWGWWWH..',   // 24
      '.YHHWWWGWWWWH.',   // 25
      '.YHHWWWGWWWWH.',   // 26
      '.YHHWWWGWWWWH.',   // 27
      'YHHWWWWGWWWWWH',   // 28
      'YHHWWWWGWWWWWH',   // 29
    ], LA);
    // the full figure as an index grid (wings, then body + arms), gold-rimmed
    function figure(flap, bob) {
      const Wg = Grid(AW, AH);
      drawWing(Wg, 18, 17 + bob, -1, 15, 12, flap);            // back wing, sweeping up-left
      drawWing(Wg, 23, 15 + bob, 1, 13, 11, flap);             // near wing, up-right behind the head
      glowRim(Wg);
      const B = Grid(AW, AH), bx = 15, by = 8 + bob;
      BODY.forEach((row, r) => row.forEach((c, i) => { if (c >= 0) B.set(bx + i, by + r, c); }));
      // robe tail: trails left and dissolves into light (hovering, no feet)
      for (let y = 30; y <= 43; y++) {
        const t = (y - 29) / 15, cx = 21.5 - t * 4, hw = 7 * Math.pow(1 - t, 0.75) + 0.5;
        for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
          const e = (x - cx) / hw; if (Math.abs(e) > 1) continue;
          if (t > 0.35 && bay(x, y + bob) > 1.35 - t * 1.25) continue;
          const stripe = Math.round(cx + 0.5 + t * 1.5) === x;
          B.set(x, y + bob, stripe ? (t > 0.6 ? C.holy1 : C.gold) : e < -0.7 ? C.holy1 : e < -0.35 ? C.holy0 : WHITE);
        }
      }
      // far arm (a touch higher, shaded) and near arm reaching forward, bell sleeves drooping, open palms
      const armL = (sx, y0, hx, hy, lit) => {
        gl(B, sx, y0, hx - 1, hy, lit ? WHITE : C.holy0); gl(B, sx, y0 + 1, hx - 1, hy + 1, lit ? C.holy0 : C.holy1);
        gl(B, sx, y0 + 2, hx - 3, hy + 2, C.holy1); B.set(hx - 3, hy + 3, C.holy1); B.set(hx - 4, hy + 3, C.holy1);   // bell sleeve droops
        B.set(hx - 1, hy, C.gold); B.set(hx - 1, hy + 1, C.gold); B.set(hx - 2, hy + 2, C.gold); B.set(hx - 3, hy + 3, C.goldD);   // cuff
        B.set(hx, hy, C.skin); B.set(hx, hy + 1, lit ? C.skin : C.skinD); B.set(hx + 1, hy, C.skin); B.set(hx, hy - 1, lit ? C.skin : C.skinD);
      };
      armL(23, 15 + bob, 30, 15 + bob, false);
      armL(22, 17 + bob, 31, 18 + bob, true);
      B.set(22, 11 + bob, C.goldD);                            // eye
      glowRim(B);
      for (let i = 0; i < B.a.length; i++) if (B.a[i] >= 0) Wg.a[i] = B.a[i];
      return Wg;
    }
    function halo(G, bob, k, fade) {
      const hx = 21, hy = 5 + bob;
      for (let a = -3; a <= 3; a++) { if (bay(hx + a, hy - 1) < fade) G.set(hx + a, hy - 1, Math.abs(a) < 2 ? C.holy1 : C.gold); if (bay(hx + a, hy + 1) < fade) G.set(hx + a, hy + 1, C.goldD); }
      if (fade >= 1) { G.set(hx - 4, hy, C.gold); G.set(hx + 4, hy, C.gold); G.set(hx - 3 + (k % 3) * 3, hy - 1, WHITE); }
    }
    function handGlow(G, bob, k) {   // casting light in the open palms
      const cx = 34, cy = 17 + bob, L = [2, 3, 2, 3, 2, 3][k];
      const S2 = (x, y, c) => { if (G.get(x, y) < 0 || c === WHITE) G.set(x, y, c); };
      S2(cx, cy, WHITE); S2(cx - 1, cy, C.holy0); S2(cx + 1, cy, C.holy0); S2(cx, cy - 1, C.holy0); S2(cx, cy + 1, C.holy0);
      for (let j = 2; j <= L; j++) { S2(cx + j, cy, j < L ? C.holy1 : C.gold); S2(cx, cy - j, j < L ? C.holy1 : C.gold); S2(cx, cy + j, j < L ? C.holy1 : C.gold); }
      S2(cx + 1, cy - 1, C.gold); S2(cx + 1, cy + 1, C.gold); S2(cx - 1, cy - 1, C.goldD); S2(cx - 1, cy + 1, C.goldD);
    }
    function motes(G, k, n, spread) {   // twinkling light motes drifting up around the angel
      for (let q = 0; q < n; q++) {
        const lt = (hash(q, 77) + k / 6) % 1, x = Math.round(20 + (hash(q, 78) - 0.5) * spread), y = Math.round(42 - hash(q, 79) * 12 - lt * 28);
        if (G.get(x, y) >= 0) continue;
        G.set(x, y, lt < 0.3 ? WHITE : lt < 0.6 ? C.holy1 : C.gold);
        if (q % 4 === 0 && lt < 0.5) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (G.get(x + a, y + b) < 0) G.set(x + a, y + b, C.gold);
      }
    }
    const sh = Sheet('fx_bishop_angel', AW, AH, 6, { px: 20, py: 47, fps: 12, anims: { appear: { fps: 12, loop: false, frames: [0, 1, 2] }, play: { fps: 12, loop: true, frames: [3, 4, 5] } } });
    const FLAP = [0, 0, 0, 1, 0, -1], BOB = [0, 0, 0, 0, -1, -1];
    for (let k = 0; k < 6; k++) {
      const F = figure(FLAP[k], BOB[k]), G = Grid(AW, AH);
      if (k === 0) { // sparkles converging from all around onto the figure's silhouette
        const cells = []; for (let i = 0; i < F.a.length; i++) if (F.a[i] >= 0) cells.push(i);
        for (let q = 0; q < 34; q++) {
          const i = cells[Math.floor(hash(q, 11) * cells.length)], tx = i % AW, ty = Math.floor(i / AW);
          const a = hash(q, 12) * 6.283, r = 6 + hash(q, 13) * 9, x = clamp(Math.round(tx + Math.cos(a) * r), 1, AW - 2), y = clamp(Math.round(ty + Math.sin(a) * r * 0.8), 1, AH - 2);
          G.set(x, y, q % 3 === 0 ? WHITE : q % 3 === 1 ? C.holy1 : C.gold);
          if (q % 5 === 0) for (const [p, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) G.set(x + p, y + b, C.gold);
        }
        for (let y = 12; y <= 32; y++) for (let x = 14; x <= 28; x++) { const d = Math.hypot((x - 21) / 7, (y - 22) / 10); if (d < 1 && bay(x, y) < (1 - d) * 0.35) G.set(x, y, d < 0.45 ? C.holy1 : C.goldD); }
      } else if (k === 1) { // faint outline: the gold rim, flickering in, with a dithered pale body
        for (let i = 0; i < F.a.length; i++) {
          const v = F.a[i], x = i % AW, y = Math.floor(i / AW); if (v < 0) continue;
          const edge = F.get(x - 1, y) < 0 || F.get(x + 1, y) < 0 || F.get(x, y - 1) < 0 || F.get(x, y + 1) < 0;
          if (edge) { if (bay(x, y) < 0.85) G.a[i] = y > 30 ? C.gold : C.holy1; }
          else if (bay(x, y) < 0.1) G.a[i] = C.goldD;
        }
        motes(G, 1, 12, 34); halo(G, 0, k, 0.6);
      } else if (k === 2) { // fully formed, flaring bright
        for (let i = 0; i < F.a.length; i++) { const v = F.a[i]; if (v >= 0) G.a[i] = BRIGHT[v] !== undefined ? BRIGHT[v] : v; }
        halo(G, 0, k, 1); handGlow(G, 0, 1);
        for (let q = 0; q < 16; q++) { const a = q / 16 * 6.283, x = Math.round(21 + Math.cos(a) * 17), y = Math.round(22 + Math.sin(a) * 19); if (q & 1) G.set(x, y, C.holy1); else { G.set(x, y, WHITE); G.set(x + 1, y, C.gold); G.set(x - 1, y, C.gold); } }
      } else { // hovering loop: wing beat + shimmer
        G.a.set(F.a);
        // shimmer: a bright glint band sweeping across the feathers
        const gx = [6, 16, 28][k - 3];
        for (let i = 0; i < G.a.length; i++) { const x = i % AW, y = Math.floor(i / AW), v = G.a[i]; if ((v === C.holy0 || v === C.holy1) && Math.abs(x + y * 0.5 - gx - 8) < 1.5) G.a[i] = v === C.holy1 ? C.holy0 : WHITE; }
        halo(G, BOB[k], k, 1); handGlow(G, BOB[k], k); motes(G, k, 10, 36);
      }
      sh.add(toC(G, null), 0, 0);
    }
    sh.done();
  }

  // ---- beam profile shared by the segment, head and end. d: distance from the beam centre (px), p: phase along the
  // beam (period 16, so tiles are seamless), lvl: 0 full / 1 thin / 2 fading line. Returns a colour or -1.
  function beamPx(x, y, d, p, lvl) {
    const TAU = Math.PI * 2, w = ((p % 16) + 16) % 16;
    const band = Math.sin(TAU * 2 * w / 16) * 0.6 + Math.sin(TAU * w / 16 + 1.3) * 0.3;   // shimmer ripples, scroll with p
    const core = [2, 1, 0.5][lvl], dd = d - band * [0.7, 0.45, 0][lvl] * (d > 2.5 ? 1 : 0.4);
    if (lvl === 2) {
      if (d < 1) return w % 8 === 3 ? C.gold : C.holy1;
      if (d < 2) return bay(x, y) < 0.22 ? C.goldD : -1;
      return -1;
    }
    if (dd < core) return WHITE;
    if (dd < core + 1) return C.holy0;
    if (dd < core + 2) return C.holy1;
    if (dd < core + 3) return C.gold;
    if (dd < core + 4) return bay(x, y) < (lvl ? 0.45 : 0.75) ? C.goldD : -1;
    // outer halo: sparse glitter that flows with the beam (hashed on the phase, so it tiles)
    const hr = lvl ? 3 : 10.5 - (core + 4), f = (d - core - 4) / hr;
    if (f >= 1) return -1;
    const k = (1 - f) * (lvl ? 0.3 : 0.55) * (0.9 + 0.2 * Math.sin(TAU * 2 * (w + 3) / 16));
    if (hash(w, y + 300) < 0.035 * (1 - f)) return C.holy1;                     // glitter flowing with the beam
    return bay(x, y) < k ? (f < 0.45 ? C.gold : C.goldD) : -1;
  }
  // bright dashes flowing inside the beam (period 16)
  function beamDashes(set, cy, p0, lvl) {
    if (lvl === 2) return;
    const rows = lvl ? [[-2, 0, 3], [1, 9, 3]] : [[-4, 2, 4], [-3, 11, 3], [3, 6, 5], [2, 14, 3], [-5, 8, 2], [4, 0, 2]];
    for (const [dy, off, len] of rows) for (let j = 0; j < len; j++) set(off + j, cy + dy, Math.abs(dy) >= 4 ? C.holy1 : C.holy0, p0);
  }

  // ---- fx_bishop_beam 16x22, pivot (0,11): tileable segment, bands scroll right 4 px per frame
  {
    const BW2 = 16, BH2 = 22, CY = 10.5;
    const sh = Sheet('fx_bishop_beam', BW2, BH2, 6, { px: 0, py: 11, fps: 12, anims: { play: { fps: 12, loop: true, frames: [0, 1, 2, 3] } } });
    for (let f = 0; f < 6; f++) sh.add(paint(BW2, BH2, () => {
      const lvl = f < 4 ? 0 : f - 3, sc = f < 4 ? f * 4 : 0;
      for (let y = 0; y < BH2; y++) for (let x = 0; x < BW2; x++) { const c = beamPx(x, y, Math.abs(y + 0.5 - (CY + 0.5)), x - sc, lvl); if (c >= 0) px(x, y, c); }
      beamDashes((x, y, c) => px(((x + sc) % 16 + 16) % 16, y, c), 11, 0, lvl);
      // motes in the halo, drifting right with the bands
      if (lvl < 2) for (let q = 0; q < (lvl ? 2 : 4); q++) { const x = ((Math.floor(hash(q, 5) * 16) + sc * (q & 1 ? 2 : 1)) % 16), y = q & 1 ? 1 + Math.floor(hash(q, 6) * 3) : 18 + Math.floor(hash(q, 6) * 3); px(x, lvl ? (y < 11 ? y + 3 : y - 3) : y, q < 2 ? C.holy1 : C.gold); }
    }), 0, 0);
    sh.done();
  }

  // ---- fx_bishop_beamhead 24x30, pivot (8,15): star-burst + holy sigil ring at the staff tip
  {
    const HW = 24, HH = 30, CX = 8, CY = 14.5;
    const sh = Sheet('fx_bishop_beamhead', HW, HH, 4, { px: 8, py: 15, fps: 12, anims: { play: { fps: 12, loop: true, frames: [0, 1, 2, 3] } } });
    for (let f = 0; f < 4; f++) sh.add(paint(HW, HH, () => {
      const G = Grid(HW, HH), S2 = (x, y, c) => G.set(x, y, c), E2 = (x, y, c) => { if (G.get(Math.round(x), Math.round(y)) < 0) G.set(x, y, c); };
      // beam leaving to the right (same phase as the first tile), fading in from the burst
      for (let y = 0; y < HH; y++) for (let x = CX; x < HW; x++) { const c = beamPx(x, y, Math.abs(y - CY), x - CX - f * 4, 0); if (c >= 0) S2(x, y, c); }
      beamDashes((x, y, c) => { const xx = CX + (((x + f * 4) % 16) + 16) % 16; if (xx > CX + 5 && xx < HW) S2(xx, y, c); }, 15, 0, 0);
      // sigil ring seen edge-on (the beam passes through it): outer gold ring + rotating rune dots, inner pale ring
      const rx = 5.5, ry = 11;
      for (let i = 0; i < 64; i++) {
        const a = i / 64 * 6.283, x = CX - 0.5 + Math.cos(a) * rx, y = CY + Math.sin(a) * ry, back = Math.cos(a) < 0;
        S2(x + 0.5, y + 0.5, back ? C.goldD : C.gold); if (!back && Math.abs(Math.sin(a)) > 0.5) E2(x + 1.5, y + 0.5, C.goldD);
      }
      for (let q = 0; q < 6; q++) { const a = (q / 6 + f / 24) * 6.283, x = CX + Math.cos(a) * rx, y = CY + 0.5 + Math.sin(a) * ry; S2(x, y, Math.cos(a) > 0 ? WHITE : C.holy1); if (Math.cos(a) > 0.3) { E2(x + 1, y, C.holy1); E2(x - 1, y, C.holy1); } }
      for (let i = 0; i < 40; i++) { if ((i + f) % 3 === 0) continue; const a = i / 40 * 6.283; E2(CX + Math.cos(a) * 3 + 0.5, CY + 0.5 + Math.sin(a) * 7.5, C.holy1); }
      // rays: long vertical spikes, shorter back + diagonals, pulsing
      const L = [[0, -1, 11 + (f & 1)], [0, 1, 11 + (f & 1)], [-1, 0, 7 - (f & 1)], [-1, -1, 5 + ((f + 1) & 1)], [-1, 1, 5 + ((f + 1) & 1)], [1, -1, 6 + (f & 1)], [1, 1, 6 + (f & 1)]];
      for (const [dx, dy, len] of L) for (let j = 3; j <= len; j++) {
        const c = j <= len * 0.45 ? WHITE : j <= len * 0.75 ? C.holy1 : C.gold;
        const x = CX + dx * j, y = (dy < 0 ? 14 : 15) + dy * j;
        S2(x, y, c); if (dx === 0 && j < len * 0.6) { E2(x - 1, y, C.gold); }
      }
      // core burst
      const R0 = 4.2 + (f % 2) * 0.6;
      for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
        const d = Math.hypot(x + 0.5 - CX, y + 0.5 - (CY + 0.5));
        if (d < R0 - 1.8) S2(x, y, WHITE); else if (d < R0 - 0.8) S2(x, y, C.holy0); else if (d < R0) S2(x, y, C.holy1);
        else if (d < R0 + 1.2 && bay(x, y) < 0.7) E2(x, y, C.gold);
        else if (d < R0 + 3 && bay(x + f, y) < 0.18) E2(x, y, C.goldD);
      }
      // orbiting sparkles
      for (let q = 0; q < 5; q++) { const a = hash(q, 3) * 6.283 + f * 0.5, r = 6 + hash(q, 4) * 4, x = Math.round(CX + Math.cos(a) * r), y = Math.round(CY + Math.sin(a) * r * 1.3); E2(x, y, q & 1 ? WHITE : C.holy1); if (q === f) { E2(x - 1, y, C.gold); E2(x + 1, y, C.gold); E2(x, y - 1, C.gold); E2(x, y + 1, C.gold); } }
      for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) { const v = G.get(x, y); if (v >= 0) px(x, y, v); }
    }), 0, 0);
    sh.done();
  }

  // ---- fx_bishop_beamend 24x30, pivot (4,15): splashing radiant burst at the beam tip, sparks flying forward
  {
    const EW = 24, EH = 30, CX = 8, CY = 14.5;
    const sh = Sheet('fx_bishop_beamend', EW, EH, 4, { px: 4, py: 15, fps: 12, anims: { play: { fps: 12, loop: true, frames: [0, 1, 2, 3] } } });
    for (let f = 0; f < 4; f++) sh.add(paint(EW, EH, () => {
      const G = Grid(EW, EH), S2 = (x, y, c) => G.set(x, y, c), E2 = (x, y, c) => { if (G.get(Math.round(x), Math.round(y)) < 0) G.set(x, y, c); };
      // incoming beam
      for (let y = 0; y < EH; y++) for (let x = 0; x < CX; x++) { const c = beamPx(x, y, Math.abs(y - CY), x - 4 - f * 4, 0); if (c >= 0) S2(x, y, c); }
      // splash crescents rolling outward to the right (looping over the 4 frames)
      for (let k = 0; k < 2; k++) {
        const lt = ((f + k * 2) / 4) % 1, r = 5 + lt * 9;
        for (let i = 0; i <= 28; i++) {
          const a = -1.25 + i / 28 * 2.5, x = CX + Math.cos(a) * r, y = CY + 0.5 + Math.sin(a) * r * 1.15;
          if (lt > 0.5 && (i + f) % 2) continue;
          E2(x, y, lt < 0.3 ? WHITE : lt < 0.55 ? C.holy1 : lt < 0.8 ? C.gold : C.goldD);
          if (lt < 0.45) E2(x - 1, y, C.gold);
        }
      }
      // splash rays fanning forward
      for (let q = 0; q < 7; q++) {
        const a = (q - 3) * 0.42 + (hash(q, f + 20) - 0.5) * 0.3, len = 6 + Math.round(hash(q, f + 30) * 5);
        for (let j = 4; j <= len; j++) { const x = CX + Math.cos(a) * j, y = CY + 0.5 + Math.sin(a) * j; if (j > len - 2 && (j + q) & 1) continue; E2(x, y, j < len * 0.55 ? WHITE : j < len * 0.8 ? C.holy1 : C.gold); }
      }
      // sparks flying forward (each loops seamlessly over the 4 frames)
      for (let q = 0; q < 14; q++) {
        const lt = (hash(q, 40) + f / 4) % 1, a = (hash(q, 41) - 0.5) * 2.6, r = 5 + lt * 10;
        const x = Math.round(CX + Math.cos(a) * r), y = Math.round(CY + Math.sin(a) * r + lt * lt * 3);
        E2(x, y, lt < 0.35 ? WHITE : lt < 0.65 ? C.holy1 : C.gold);
        if (lt < 0.5 && q % 3 === 0) { E2(x - 1, y, C.gold); E2(x - 2, y, C.goldD); }
      }
      // radiant core
      const R0 = 5 + (f & 1) * 0.8;
      for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) {
        const d = Math.hypot((x + 0.5 - CX) * 1.05, y + 0.5 - (CY + 0.5));
        if (d < R0 - 2) S2(x, y, WHITE); else if (d < R0 - 1) S2(x, y, C.holy0); else if (d < R0) S2(x, y, C.holy1);
        else if (d < R0 + 1.3 && bay(x, y) < 0.75) E2(x, y, C.gold);
        else if (d < R0 + 4 && bay(x + f * 2, y) < 0.2 * (1 - (d - R0) / 4)) E2(x, y, C.goldD);
      }
      // 4-point twinkle on the core
      const T = [3, 5, 4, 6][f];
      for (let j = 1; j <= T; j++) { S2(CX + R0 - 1 + j, 15, j < T - 1 ? WHITE : C.holy1); S2(CX, 14 - R0 + 1 - j, j < T - 1 ? C.holy0 : C.gold); S2(CX, 15 + R0 - 1 + j, j < T - 1 ? C.holy0 : C.gold); }
      for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) { const v = G.get(x, y); if (v >= 0) px(x, y, v); }
    }), 0, 0);
    sh.done();
  }

  // ---------------------------------------------------------------- fx_bishop_heal 56x56
  {
    const N = 10, sh = Sheet('fx_bishop_heal', 56, 56, 10, { px: 28, py: 55, fps: 20, anims: { play: { fps: 20, loop: false, frames: [...Array(N).keys()] } } });
    for (let i = 0; i < N; i++) sh.add(paint(56, 56, () => {
      const t = i / (N - 1), cx = 28, gy = 54;
      // ground rings expanding
      const r1 = 5 + 20 * easeOut(Math.min(1, t * 1.3));
      if (t < 0.9) { ellipse(cx, gy, r1, r1 * 0.22, t < 0.5 ? C.holy1 : C.gold, t > 0.5 ? 2 : 0); ellipse(cx, gy, r1 * 0.7, r1 * 0.16, C.goldD, 2); }
      // soft light column around the caster
      const colK = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.7);
      for (let y = 14; y <= gy; y++) for (let x = cx - 11; x <= cx + 11; x++) {
        const d = Math.abs(x - cx) / 11, h = (gy - y) / 40;
        if (bay(x, y) < colK * (1 - d) * (1 - h) * 0.55) px(x, y, d < 0.35 ? C.holy1 : C.goldD);
      }
      // rising sparkles
      for (let q = 0; q < 22; q++) {
        const t0 = hash(q, 1) * 0.45, lt = (t - t0) / 0.55; if (lt < 0 || lt > 1) continue;
        const x = cx + Math.round((hash(q, 2) - 0.5) * 34 + Math.sin(lt * 5 + q) * 1.5), y = Math.round(gy - 2 - hash(q, 3) * 8 - lt * (26 + hash(q, 4) * 18));
        const c = lt < 0.35 ? WHITE : lt < 0.65 ? C.holy1 : lt < 0.85 ? C.gold : C.goldD;
        px(x, y, c);
        if (q % 3 === 0 && lt < 0.7) { px(x - 1, y, C.gold); px(x + 1, y, C.gold); px(x, y - 1, C.gold); px(x, y + 1, C.gold); if (lt < 0.35) { px(x, y - 2, C.holy1); px(x, y + 2, C.holy1); } }
      }
      // cross flash
      const ct = [0, 0.55, 1, 1, 0.9, 0.7, 0.45, 0.2, 0, 0][i];
      if (ct > 0) {
        const hh = Math.round(22 * Math.min(1, ct * 1.4)), bw = Math.round(15 * Math.min(1, ct * 1.4)), ty = 28 - Math.round(hh / 2) - 2, arm = Math.round(hh * 0.3);
        const cells = [];
        for (let y = 0; y < hh; y++) for (let x = -1; x <= 1; x++) cells.push([cx + x, ty + y, Math.abs(x)]);
        for (let x = -Math.floor(bw / 2); x <= Math.floor(bw / 2); x++) for (let y = -1; y <= 1; y++) cells.push([cx + x, ty + arm + y, Math.abs(y)]);
        const fade = ct < 0.8;
        // gold rim
        for (const [x, y] of cells) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!fade || bay(x + a, y + b) < ct) px(x + a, y + b, C.gold);
        for (const [x, y, e] of cells) if (!fade || bay(x, y) < ct + 0.2) px(x, y, e ? C.holy0 : WHITE);
        if (i === 2) { // radial burst
          for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; for (let r = 13; r < 19; r++) if ((r + k) % 2 === 0) px(cx + Math.cos(a) * r, ty + arm + Math.sin(a) * r, r < 15 ? C.holy1 : C.gold); }
        }
        if (i >= 2 && i <= 4) ellipse(cx, ty + arm, 10 + (i - 2) * 5, 10 + (i - 2) * 5, i === 2 ? C.holy1 : C.gold, i === 4 ? 2 : 3);
      }
    }), 0, 0);
    sh.done();
  }

  // ---------------------------------------------------------------- fx_bishop_pillar 32x140
  {
    const PW = 32, PH = 140, PCX = 16, PGY = 139, TOP = 27;
    // wings: a clean angel-wing silhouette (leading edge arcs up and out, scalloped feather tips below)
    const WBW = 20, WBH = 30, WOX = 1, WOY = 20;
    const WM = new Int8Array(WBW * WBH);
    function buildWing(open, flap) {
      WM.fill(0);
      const Wd = Math.max(2, Math.round(11 * open)), Ht = 11 * open + flap * 2;
      for (let x = 0; x <= Wd; x++) {
        const u = x / Wd, top = -Ht * Math.pow(Math.sin(u * Math.PI / 2), 0.7);
        const th = (u < 0.7 ? lerp(3, 11, u / 0.7) : lerp(11, 8, (u - 0.7) / 0.3)) * (0.5 + 0.5 * open), sc = ((x + 1) % 3 === 0) ? -1 : 0;
        const bot = top + th + sc;
        for (let y = Math.round(top); y <= Math.round(bot); y++) {
          const yy = y + WOY, xx = x + WOX; if (xx < 0 || xx >= WBW || yy < 0 || yy >= WBH) continue;
          const f = (y - top) / Math.max(1, th);
          WM[yy * WBW + xx] = f < 0.3 ? 1 : ((x % 3 === 1) && f > 0.45) ? 3 : f > 0.6 ? 2 : 1;
        }
      }
    }
    function drawWings(open, flap, fade, rootY) {
      buildWing(open, flap);
      const INT = [0, WHITE, C.holy0, C.holy1];
      for (let s = -1; s <= 1; s += 2) {
        const rx = PCX + (s > 0 ? 2 : -3);
        for (let yy = 0; yy < WBH; yy++) for (let xx = 0; xx < WBW; xx++) {
          const v = WM[yy * WBW + xx], wx = rx + s * (xx - WOX), wy = rootY + yy - WOY;
          if (fade < 1 && bay(wx, wy) > fade) continue;
          let c = -1;
          if (v) c = INT[v];
          else {
            const up = yy > 0 && WM[(yy - 1) * WBW + xx], dn = yy + 1 < WBH && WM[(yy + 1) * WBW + xx];
            const lf = xx > 0 && WM[yy * WBW + xx - 1], rt = xx + 1 < WBW && WM[yy * WBW + xx + 1];
            if (up) c = C.goldD; else if (dn || lf || rt) c = C.gold;
          }
          if (c >= 0 && wx >= 0 && wx < PW) px(wx, wy, c);
        }
      }
    }
    function drawPillar(top, bot, hw, fl) {
      const h = Math.round(hw);
      for (let x = PCX - h - 3; x <= PCX + h + 3; x++) {
        const ax = Math.abs(x - PCX), f = ax / Math.max(1, hw);
        for (let y = Math.round(top); y <= Math.round(bot); y++) {
          const tipCut = bot < PGY - 0.5 ? Math.max(0, (y - (bot - 5)) / 5) * hw : 0;
          const e = h - tipCut - ax;
          let c;
          if (e < 0) { if (e >= -3 && tipCut === 0 && bay(x, y + fl * 3) < 0.28 + (e + 3) * 0.08) c = e >= -1 ? C.gold : C.goldD; else continue; }
          else if (e < 1) c = C.goldD;
          else if (e < 2) c = C.gold;
          else c = f < 0.42 ? WHITE : f < 0.66 ? C.holy0 : C.holy1;
          px(x, y, c);
        }
      }
    }
    function streaks(top, bot, hw, fr, dense) {
      const span = bot - top + 20;
      for (let s = 0; s < (dense ? 10 : 5); s++) {
        const x = PCX + Math.round((hash(s, 1) - 0.5) * 2 * hw * 0.8), len = 6 + Math.floor(hash(s, 2) * 10);
        const y = top - 10 + ((fr / 20 * (150 + hash(s, 3) * 110) + hash(s, 4) * 300) % span);
        const f = Math.abs(x - PCX) / hw, c = dense ? (f < 0.42 ? C.holy1 : WHITE) : C.holy1;
        for (let j = 0; j < len; j++) { const yy = Math.round(y + j); if (yy >= top && yy <= bot && (dense || (yy & 1))) px(x, yy, c); }
      }
    }
    // per-frame: [pillar bottom, half width, wing open, wing fade, ground flash, orb]
    const F = [
      [34, 2, 0, 0, 0, 0.6], [92, 3.5, 0, 0, 0, 0.8], [PGY, 6, 0.15, 1, 1, 1], [PGY, 8.5, 0.5, 1, 1, 1],
      [PGY, 6.5, 0.85, 1, 0.8, 1], [PGY, 6, 1.05, 1, 0.6, 1], [PGY, 6.5, 1, 1, 0.6, 1], [PGY, 6, 1.02, 1, 0.6, 1],
      [PGY, 5.5, 1, 1, 0.5, 1], [PGY, 3.5, 1, 0.6, 0.4, 0.7], [PGY, 1, 1, 0.25, 0.2, 0.4], [PGY, 0, 0, 0, 0, 0],
    ];
    const sh = Sheet('fx_bishop_pillar', PW, PH, 12, { px: 16, py: 139, fps: 20, anims: { play: { fps: 20, loop: false, frames: [...Array(12).keys()] } } });
    F.forEach(([bot, hw, open, fade, gflash, orb], i) => sh.add(paint(PW, PH, () => {
      const flap = [0, 0, 0, 0, 1, 0, -1, 0, 1, 0, 0, 0][i];
      // halo orb at the top (the light's source), wings spread behind it
      if (hw > 0.3) {
        drawPillar(TOP, bot, hw, i);
        if (hw > 3) streaks(TOP, bot, hw, i, true);
        if (hw > 3 && bot === PGY) streaks(TOP, bot, hw, i + 7, false);
      }
      if (open > 0.02 && fade > 0) drawWings(Math.min(1.08, open), flap, fade, TOP + 2);
      if (orb > 0) {
        const r = 2 + orb * 3;
        disc(PCX, TOP, r + 1, C.gold); disc(PCX, TOP, r, C.holy1); disc(PCX, TOP, r * 0.6, WHITE);
        ellipse(PCX, TOP - r - 3, 4, 1, C.gold); px(PCX - 2, TOP - r - 4, C.holy0); px(PCX + 1 + (i & 1), TOP - r - 4, WHITE);
      }
      if (gflash > 0 && bot === PGY) {
        const sw = Math.round(hw + 5 + gflash * 4);
        for (let x = PCX - sw - 3; x <= PCX + sw + 3; x++) {
          const d = Math.abs(x - PCX) / (sw + 3);
          if (bay(x, PGY) < (1.1 - d) * gflash * 1.3) px(x, PGY, d < 0.4 ? WHITE : d < 0.7 ? C.holy1 : C.gold);
          if (bay(x, PGY - 1) < (0.9 - d) * gflash) px(x, PGY - 1, d < 0.4 ? C.holy0 : C.gold);
          if (bay(x, PGY - 2) < (0.6 - d) * gflash) px(x, PGY - 2, C.holy1);
        }
        // rising motes around the base
        for (let q = 0; q < 10; q++) { const x = PCX + Math.round((hash(q, i) - 0.5) * (sw * 2 + 6)), y = PGY - 2 - Math.round(hash(q, i + 30) * 22 * gflash); px(x, y, q & 1 ? C.holy1 : C.gold); }
      }
      if (i >= 9) { // collapse: burst of sparks + drifting feathers
        const k = (i - 8) / 3;
        for (let q = 0; q < 26; q++) {
          const y = TOP + 10 + Math.round(hash(q, 5) * 120), x = PCX + Math.round((hash(q, 6) - 0.5) * 2 * (3 + k * 12));
          if (i === 11 && q & 1) continue;
          px(x, y, k < 0.7 ? WHITE : q % 3 ? C.holy1 : C.gold);
        }
        for (let q = 0; q < 7; q++) {
          const x = PCX + Math.round((hash(q, 70) - 0.5) * 28), y = TOP + 4 + Math.round(hash(q, 71) * 20 + (i - 9) * 5);
          const cs = i < 11 ? [WHITE, C.holy1, C.goldD] : [C.robeW1, C.robeW2, C.robeW3];
          px(x, y, cs[0]); px(x + 1, y, cs[1]); px(x - 1, y + 1, cs[2]);
        }
      }
    }), 0, 0));
    sh.done();
  }
};
