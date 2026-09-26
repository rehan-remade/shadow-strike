// Shadow Strike playable class: ARCH MAGE (magician). The blue robed ice mage of src/skills/02-blizzard.js
// (tall bent pointed hat with a white fur band, white beard, staff with an ice crystal), who also casts the fire
// meteor of src/skills/03-meteor.js. Everything is drawn into index grids (auto ink outline) or palette canvases,
// deterministic (hash/bay only). Contract: bake/RPG_CLASSES.md.
window.RPG_CLASS_ARCHMAGE = function (BK) {
  'use strict';
  const { Sheet, png, Grid } = BK;
  const TAU = Math.PI * 2, PI = Math.PI;
  const FW = 48, FH = 40, CX = 24, FY = 37;          // frame, anchor column, feet row
  const WH = 35;                                       // palette white

  // ------------------------------------------------------------------ helpers
  function GX(w, h) {
    const G = Grid(w, h);
    const val = (c, a, b2, x, y) => (typeof c === 'function' ? c(a, b2, x, y) : c);
    G.p = (x, y, c) => { if (c !== undefined && c !== null && c >= 0) G.set(x, y, c); };
    G.r = (x, y, ww, hh, c) => { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) G.p(x + i, y + j, val(c, i, j, x + i, y + j)); };
    G.e = (cx, cy, rx, ry, c) => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) G.p(x, y, val(c, dx, dy, x, y));
      }
    };
    G.walk = (x0, y0, x1, y1, fn) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, n = 0;
      for (;;) {
        fn(x0, y0, n);
        if ((x0 === x1 && y0 === y1) || ++n > 400) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    G.ln = (x0, y0, x1, y1, c) => G.walk(x0, y0, x1, y1, (x, y) => G.p(x, y, c));
    G.g = (x, y) => G.get(Math.round(x), Math.round(y));
    // behind-only plot (used after outline() for glows and sparkles)
    G.q = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h && G.get(x, y) < 0) G.set(x, y, c); };
    return G;
  }
  function cvs(G, map) {
    const c = mk(G.w, G.h); use(c.getContext('2d'));
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { const v = G.a[y * G.w + x]; if (v >= 0) px(x, y, map ? map[v] : v); }
    use(g); return c;
  }
  function paint(w, h, fn) { const c = mk(w, h); use(c.getContext('2d')); fn(c); use(g); return c; }
  const dz = (x, y, k) => bay(x, y) < k;
  const cl01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

  // pale violet afterimage remap by luminance (like ninja_ghost)
  const GHOST = PAL.map((hex, i) => {
    if (i === 0) return C.vio3;
    const n = parseInt(hex.slice(1), 16), L = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
    return L < 0.1 ? C.vio3 : L < 0.2 ? C.vio2 : L < 0.36 ? C.vio1 : L < 0.75 ? C.vio0 : WH;
  });

  // ------------------------------------------------------------------ staff + crystal
  // grip (gx,gy), angle a (direction toward the crystal), `up` px of shaft above the grip, `down` below.
  // Returns the crystal centre (projectile spawn point).
  function staff(G, gx, gy, a, up, down, lit) {
    const dx = Math.cos(a), dy = Math.sin(a);
    G.walk(gx - dx * down, gy - dy * down, gx + dx * up, gy + dy * up, (x, y, n) => G.p(x, y, n % 5 === 3 ? C.wood : C.woodL));
    // gold collar + prongs
    const cx0 = gx + dx * (up + 1), cy0 = gy + dy * (up + 1);
    G.p(cx0, cy0, C.goldD);
    G.p(cx0 - dy + dx, cy0 + dx + dy, C.gold); G.p(cx0 + dy + dx, cy0 - dx + dy, C.gold);
    // crystal: a diamond sampled along the staff axis
    const kx = gx + dx * (up + 4), ky = gy + dy * (up + 4);
    const rx = Math.round(kx), ry = Math.round(ky);
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      const X0 = rx + x, Y0 = ry + y, ox = X0 - kx, oy = Y0 - ky;
      const s = ox * dx + oy * dy, k = -ox * dy + oy * dx;
      if (Math.abs(k) / 1.55 + Math.abs(s - 0.2) / 3.0 > 1) continue;
      let c = k < -0.55 ? C.ice1 : k > 0.55 ? C.ice3 : s > 0.4 ? C.ice0 : C.ice2;
      if (s > 1.7) c = WH;
      if (lit && Math.abs(k) < 0.6 && s > -1.2) c = WH;
      if (lit && k < -0.55) c = C.ice0;
      G.p(X0, Y0, c);
    }
    return [kx, ky];
  }
  function glowAt(G, x, y, lvl, f) {
    if (lvl <= 0) return;
    const r = 4 + (f & 1);
    const n = Math.ceil(r * 6.5);
    for (let i = 0; i < n; i++) { if (i % 2) continue; const a = i / n * TAU + f * 0.4; G.q(x + Math.cos(a) * r, y + Math.sin(a) * r, i % 4 ? C.ice2 : C.ice1); }
    if (lvl >= 2) {
      const R2 = 6 + (f & 1);
      for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { G.q(x + ux * R2, y + uy * R2, WH); G.q(x + ux * (R2 + 1), y + uy * (R2 + 1), C.ice1); }
      for (const [ux, uy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) G.q(x + ux * 4, y + uy * 4, C.ice0);
    }
    if (lvl >= 3) {
      const R3 = 9;
      const m = Math.ceil(R3 * 6.5);
      for (let i = 0; i < m; i++) { if (i % 3) continue; const a = i / m * TAU; G.q(x + Math.cos(a) * R3, y + Math.sin(a) * R3 * 0.9, i % 2 ? C.ice1 : C.ice0); }
      for (const [ux, uy] of [[1, 0], [0, -1], [0, 1]]) for (let k = 7; k <= 11; k++) G.q(x + ux * k, y + uy * k, k < 9 ? WH : C.ice1);
    }
  }
  function sparkles(G, seed, n, cx, cy, rx, ry) {
    for (let i = 0; i < n; i++) {
      const a = hash(i, seed) * TAU, d = 0.75 + 0.35 * hash(i, seed + 7);
      const x = Math.round(cx + Math.cos(a) * rx * d), y = Math.round(cy + Math.sin(a) * ry * d);
      if (hash(i, seed + 3) < 0.35) { G.q(x, y, WH); G.q(x - 1, y, C.ice1); G.q(x + 1, y, C.ice1); G.q(x, y - 1, C.ice1); G.q(x, y + 1, C.ice1); }
      else G.q(x, y, hash(i, seed + 5) < 0.5 ? C.ice0 : C.ice2);
    }
  }

  // ------------------------------------------------------------------ arms
  // mode: 'bb' back arm behind the body (dark, no inner outline), 'bf' back arm reaching in front, 'f' front arm.
  function arm(G, s, h, mode) {
    const sx = s[0], sy = s[1], hx = h[0], hy = h[1];
    const L = Math.hypot(hx - sx, hy - sy) || 1, ex = hx - (hx - sx) / L * 1.6, ey = hy - (hy - sy) / L * 1.6;
    if (mode !== 'bb') {
      const inkAround = (x, y, x0, y0, x1, y1) => { for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) if (G.get(x + i, y + j) >= 0) G.set(x + i, y + j, 0); };
      G.walk(sx, sy, ex, ey, (x, y) => inkAround(x, y, -1, -1, 2, 2));
      inkAround(Math.round(hx), Math.round(hy), -2, -1, 1, 2);
    }
    const c1 = mode === 'f' ? C.robeB1 : C.robeB2;
    const c0 = mode === 'f' ? C.robeB0 : C.robeB1;
    G.walk(sx, sy, ex, ey, (x, y) => { G.p(x, y, c0); G.p(x + 1, y, c1); G.p(x, y + 1, c1); G.p(x + 1, y + 1, c1); });
    // fur cuff at the wrist
    const cx0 = Math.round(ex), cy0 = Math.round(ey);
    G.p(cx0, cy0, mode === 'bb' ? C.hair1 : C.hair0); G.p(cx0 + 1, cy0 + 1, C.hair1);
    const X0 = Math.round(hx), Y0 = Math.round(hy);
    const sk = C.skin;
    G.p(X0 - 1, Y0, sk); G.p(X0, Y0, sk); G.p(X0 - 1, Y0 + 1, sk); G.p(X0, Y0 + 1, C.skinD);
  }

  // ------------------------------------------------------------------ the mage (side view, facing right)
  // composite src grid over dst (non-empty pixels win)
  function over(dst, src) { for (let i = 0; i < src.a.length; i++) if (src.a[i] >= 0) dst.a[i] = src.a[i]; }
  function mage(o) {
    const G = GX(FW, FH), G0 = GX(FW, FH), G1 = GX(FW, FH);
    const b = o.b || 0, sq = o.sq || 0, u = b + sq, lx = o.lean || 0, sway = o.sway || 0, flare = o.flare || 0, lift = o.lift || 0;
    const top = 24 + u, hemY = 36 - lift, hx = CX + lx;
    const row = (y) => {
      const t = (y - top) / (hemY - top), hw = 3.6 + t * 3.4 + flare * t * t, cc = CX - 0.5 + lx * (1 - t) + sway * t * t;
      return { t, hw, cc, xl: Math.round(cc - hw), xr: Math.round(cc + hw) };
    };
    const shF = [CX + 1 + lx, top + 2], shB = [CX - 3 + lx, top + 2];
    const st = o.st || [CX + 7, 28, -PI / 2, 11, 9];
    let tip = null;
    // ---- back layer
    if (o.ba) arm(G0, shB, o.ba, 'bb');
    if (o.stBehind) tip = staff(G0, st[0], st[1], st[2], st[3], st[4], o.glow > 0);
    G0.outline(); over(G, G0);
    // ---- body layer
    const L = G1;
    const feet = o.feet || [[-4, 0], [1, 0]];
    for (const [fx, fy] of feet) {
      const x = CX + fx, y = FY + fy;
      for (let yy = hemY; yy < y; yy++) L.r(x, yy, 2, 1, C.robeB3);
      L.r(x, y, 3, 1, C.hairB); L.p(x + 1, y - 1 < hemY ? -1 : y - 1, C.hairB); L.p(x + 2, y, C.dirt);
    }
    for (let y = top; y <= hemY; y++) {
      const R0 = row(y);
      for (let x = R0.xl; x <= R0.xr; x++) {
        const nx = (x - R0.cc) / R0.hw;
        let c = nx < -0.4 ? C.robeB2 : C.robeB1;
        if (x === R0.xr && R0.t > 0.12 && y < hemY) c = C.robeB0;
        if (y === hemY) c = (x + (o.hs || 0)) % 3 === 0 ? C.ice1 : C.ice0;
        else if (y === hemY - 1 && (x + (o.hs || 0)) % 3 === 1) c = C.ice1;
        L.p(x, y, c);
      }
      if (R0.t > 0.45 && y < hemY - 1) L.p(Math.round(R0.cc - R0.hw * 0.05 + (R0.t - 0.45) * sway * 0.8), y, C.robeB2);
    }
    { const y = top + 6, R0 = row(y); for (let x = R0.xl; x <= R0.xr; x++) L.p(x, y, (x - R0.cc) / R0.hw < -0.4 ? C.goldD : C.gold); L.p(R0.xr - 1, y, C.ice2); L.p(R0.xr - 1, y + 1, C.goldD); }
    { const R0 = row(top); L.r(R0.xl, top, R0.xr - R0.xl + 1, 1, C.robeB2); }
    if (!o.stBehind) tip = staff(L, st[0], st[1], st[2], st[3], st[4], o.glow > 0);
    const fa = o.fa || [st[0], st[1]];
    if (o.ba2) arm(L, shB, o.ba2, 'bf');
    arm(L, shF, fa, 'f');
    // head: back hair, face, nose, eye
    const hy = u;
    L.r(hx - 3, 21 + hy, 2, 5, (i, j) => (i === 0 || j === 4 ? C.hair1 : C.hair0)); L.p(hx - 2, 26 + hy, C.hair1);
    L.r(hx - 1, 21 + hy, 5, 3, (i, j) => (i === 0 ? C.skinD : C.skin));
    L.p(hx + 4, 22 + hy, C.skin); L.p(hx + 4, 23 + hy, C.skinD);
    if (o.eyes === 'shut') { L.p(hx + 1, 22 + hy, 0); L.p(hx + 2, 22 + hy, 0); L.p(hx + 3, 21 + hy, 0); }
    else { L.p(hx + 2, 21 + hy, 0); L.p(hx + 2, 22 + hy, 0); }
    const BEARD = [[1, 3], [-1, 4], [-1, 4], [0, 4], [0, 4], [1, 4], [1, 3], [2, 3], [3, 3]];
    BEARD.forEach(([a0, a1], j) => {
      const y = 23 + hy + j, sh = j >= 4 ? Math.round((o.bs || 0) * (j - 3) / 5) : 0;
      for (let x = hx + a0; x <= hx + a1; x++) {
        let c = C.hair0;
        if (x === hx + a0 && j > 0) c = C.hair1;
        if (j >= 6 && (x + j) % 2) c = C.hair1;
        L.p(x + sh, y, c);
      }
    });
    // hat: fur band + cone bending back
    L.r(hx - 5, 19 + hy, 11, 2, (i, j) => (i === 0 || (j === 1 && (i + (o.hs || 0)) % 2) ? C.hair1 : C.hair0));
    const bend = 5.5 + (o.hb || 0);
    for (let y = 18 + hy; y >= 10 + hy; y--) {
      const t = (18 + hy - y) / 8, hw = 4.1 * (1 - t) + 0.45, cc = hx - 0.2 - bend * Math.pow(t, 1.6);
      for (let x = Math.round(cc - hw); x <= Math.round(cc + hw); x++) {
        const nx = (x - cc) / Math.max(hw, 0.6);
        L.p(x, y, nx < -0.3 ? C.robeB2 : nx > 0.55 && t < 0.8 ? C.robeB0 : C.robeB1);
      }
      if (t === 1) L.p(Math.round(cc) - 1, y + 1, C.robeB2);
    }
    L.p(hx + 1, 16 + hy, C.ice0);   // little frost star on the hat
    L.outline(); over(G, L);
    // post-outline light (only on empty pixels)
    const f = o.f || 0;
    glowAt(G, tip[0], tip[1], o.glow || 0, f);
    if (o.tw) { const x = Math.round(tip[0]) + 3, y = Math.round(tip[1]) - 3; G.q(x, y, WH); G.q(x, y - 1, C.ice1); G.q(x + 1, y, C.ice1); }
    if (o.spark) sparkles(G, 40 + o.spark, 14, CX, 26 + u, 14, 13);
    if (o.frost) { for (let x = CX - 12; x <= CX + 12; x++) if (bay(x, FY) < 0.5 - Math.abs(x - CX) / 26) G.q(x, FY, C.ice1); }
    G.hand = tip;
    return G;
  }

  // ------------------------------------------------------------------ back view on a rope
  function climb(k) {
    const G = GX(FW, FH), G0 = GX(FW, FH), G1 = GX(FW, FH), bob = k & 1, top = 24 + bob;
    const upL = k === 0, upR = k === 2;                   // which knee is raised (hem lifts on that side)
    const L = G0;
    // boots
    const bootL = [CX - 5, upL ? 34 : 37], bootR = [CX + 2, upR ? 34 : 37];
    for (const [x, y] of [bootL, bootR]) { L.r(x, y, 3, 1, C.hairB); L.r(x, y - 1, 3, 1, C.robeB3); }
    for (let y = top; y <= 36; y++) {
      const t = (y - top) / (36 - top), hw = 3.8 + t * 3.2, cc = CX - 0.5;
      for (let x = Math.round(cc - hw); x <= Math.round(cc + hw); x++) {
        const left = x < cc, hemY = (left && upL) || (!left && upR) ? 33 : 36;
        if (y > hemY) continue;
        const nx = (x - cc) / hw;
        let c = Math.abs(nx) > 0.62 ? C.robeB2 : C.robeB1;
        if (y === hemY) c = (x + k) % 3 === 0 ? C.ice1 : C.ice0;
        else if (Math.abs(x - cc) < 0.6 && y > top + 7) c = C.robeB2;   // back seam
        L.p(x, y, c);
      }
    }
    { const y = top + 6; for (let x = CX - 6; x <= CX + 5; x++) if (L.get(x, y) >= 0) L.p(x, y, Math.abs(x - CX + 0.5) > 4 ? C.goldD : C.gold); }
    L.r(CX - 5, top, 10, 1, C.robeB2);
    // arms: the lower hand grips the rope behind the head (hidden), elbow out; the upper hand reaches over the hat
    const sL = [CX - 5, top + 1], sR = [CX + 3, top + 1];
    const lowArm = (s, side) => { const e = [s[0] + side * 3, top - 4]; arm(L, s, e, 'f'); arm(L, e, [CX + (side < 0 ? -1 : 2), top - 7], 'f'); };
    if (!upL) lowArm(sL, -1);
    if (!upR) lowArm(sR, 1);
    // back of the head: white hair, ears; fur band; the cone seen from behind, tip flopping over toward us
    L.r(CX - 3, 21 + bob, 6, 3, (i, j) => ((i === 0 || i === 5 || j === 2) ? C.hair1 : C.hair0));
    L.r(CX - 2, 24 + bob, 4, 1, C.hair1);
    L.p(CX - 4, 22 + bob, C.skinD); L.p(CX + 3, 22 + bob, C.skinD);
    L.r(CX - 6, 19 + bob, 11, 2, (i, j) => (i === 0 || i === 10 || (j === 1 && (i + k) % 3 === 0) ? C.hair1 : C.hair0));
    const sw = [0, 0.5, 1, 0.5][k];
    for (let y = 18 + bob; y >= 13 + bob; y--) {
      const t = (18 + bob - y) / 5, hw = 4.3 * (1 - t * 0.75), cc = CX - 0.5 - (1 + sw) * t * t;
      for (let x = Math.round(cc - hw); x <= Math.round(cc + hw); x++) {
        const nx = (x - cc) / Math.max(hw, 0.6);
        L.p(x, y, Math.abs(nx) > 0.55 ? C.robeB2 : C.robeB1);
      }
    }
    // flopped tip hanging down the left side of the cone
    const tx = CX - 5 - Math.round(sw);
    L.p(tx + 1, 13 + bob, C.robeB2); L.p(tx, 14 + bob, C.robeB2); L.p(tx - 1, 15 + bob, C.robeB1); L.p(tx - 1, 16 + bob, C.robeB2); L.p(tx - 2, 17 + bob, C.robeB2);
    // staff slung across the back (closest to us), crystal up past the right elbow
    const tip = staff(L, CX + 2, 28 + bob, -1.02, 10, 9, false);
    L.outline(); over(G, L);
    // raised arm on top (reaching past the hat to the rope)
    if (upL || upR) {
      const s = upL ? sL : sR, side = upL ? -1 : 1;
      const A = G1;
      arm(A, s, [s[0] + side * 3, top - 7], 'f');
      arm(A, [s[0] + side * 3, top - 7], [CX + (upL ? 0 : 1), 11 + bob], 'f');
      A.outline(); over(G, A);
    }
    G.hand = tip;
    return G;
  }

  // ------------------------------------------------------------------ poses
  const up = -PI / 2;
  const IDLE_ST = [CX + 7, 28, up, 11, 9];
  const ANIMS = [
    ['idle', 6, 1, [{}, { hs: 1, tw: 1 }, { b: 1, fa: [CX + 7, 29], hs: 0 }, { b: 1, fa: [CX + 7, 29], hs: 1 }]],
    ['run', 12, 1, [
      { lean: 1, sway: -2, flare: 1, feet: [[-7, -1], [4, 0]], st: [CX + 8, 27, up + 0.55, 11, 8], ba: [CX - 7, 30], bs: -1 },
      { b: 1, lean: 1, sway: -3, feet: [[-3, -1], [0, 0]], st: [CX + 8, 28, up + 0.6, 11, 8], ba: [CX - 5, 32], bs: -2, hs: 1 },
      { lean: 1, sway: -2, flare: 1, hs: 2, feet: [[-6, 0], [3, -1]], st: [CX + 8, 27, up + 0.55, 11, 8], ba: [CX - 7, 30], bs: -1 },
      { b: 1, lean: 1, sway: -1, hs: 1, feet: [[-2, 0], [1, -1]], st: [CX + 8, 28, up + 0.5, 11, 8], ba: [CX - 5, 32], bs: -2 }]],
    ['jump', 10, 0, [{ lean: 1, lift: 2, flare: 1, sway: 1, feet: [[-4, -1], [2, -2]], st: [CX + 8, 25, up + 0.35, 11, 8], ba: [CX - 9, 27], bs: 1 }]],
    ['fall', 10, 1, [
      { lift: 3, flare: 3, feet: [[-4, 0], [2, 0]], st: [CX + 8, 24, up + 0.25, 11, 8], ba: [CX - 9, 22], bs: -1 },
      { lift: 3, flare: 2, hs: 1, feet: [[-4, 0], [2, -1]], st: [CX + 8, 23, up + 0.25, 11, 8], ba: [CX - 9, 21], bs: -2 }]],
    ['jump2', 14, 0, [
      { lift: 2, flare: 4, feet: [[-4, -1], [2, 0]], st: [CX + 10, 25, up + 0.3, 11, 8], ba: [CX - 11, 25], spark: 1, glow: 1 },
      { lift: 1, flare: 3, sway: -1, hs: 1, feet: [[-4, 0], [2, 0]], st: [CX + 10, 24, up + 0.35, 11, 8], ba: [CX - 11, 23], spark: 2, glow: 2, f: 1 }]],
    ['attack', 16, 0, [
      { sway: 1, st: [CX + 6, 24, up + 0.12, 10, 9], ba: [CX - 5, 31] },
      { lean: 1, sway: -2, st: [CX + 9, 27, -0.2, 8, 7], ba: [CX - 7, 30], bs: -1 },
      { lean: 1, sway: -3, hs: 1, st: [CX + 9, 27, -0.2, 8, 7], ba: [CX - 7, 30], bs: -1, glow: 2 },
      { sway: -1, st: [CX + 8, 28, up + 0.5, 11, 8], ba: [CX - 5, 31] }]],
    ['cast', 8, 1, [
      { st: [CX + 8, 20, up + 0.06, 10, 10], ba: [CX - 9, 25], glow: 1, flare: 1, frost: 1 },
      { st: [CX + 8, 20, up + 0.06, 10, 10], ba: [CX - 9, 24], glow: 2, flare: 1, sway: -1, hs: 1, frost: 1, f: 1 }]],
    ['skill', 12, 0, [
      { st: [CX + 8, 18, up + 0.08, 10, 9], ba2: [CX + 8, 24], glow: 2, flare: 1 },
      { lean: 1, sway: -3, flare: 2, bs: -1, st: [CX + 9, 25, -0.75, 10, 8], ba2: [CX + 7, 27], glow: 3, hs: 1 },
      { lean: 1, sway: -2, flare: 1, bs: -1, st: [CX + 9, 25, -0.75, 10, 8], ba2: [CX + 7, 27], glow: 2, f: 1 }]],
    ['climb', 8, 1, [{ climb: 0 }, { climb: 1 }, { climb: 2 }, { climb: 3 }]],
    ['crouch', 10, 0, [{ sq: 2, flare: 2, st: [CX + 7, 30, up, 11, 7], feet: [[-5, 0], [2, 0]] }]],
    ['hurt', 10, 0, [{ lean: -2, sway: 2, flare: 1, hb: 3, eyes: 'shut', st: [CX + 6, 27, up + 0.7, 10, 8], ba: [CX - 9, 23], feet: [[-3, 0], [2, -1]], bs: 2 }]],
  ];
  const FRAMES = [];
  for (const [, , , list] of ANIMS) for (const o of list) FRAMES.push(o.climb !== undefined ? climb(o.climb) : mage(o));
  for (const [name, map] of [['pc_archmage', null], ['pc_archmage_ghost', GHOST]]) {
    const sh = Sheet(name, FW, FH, 8, { px: CX, py: FY });
    const anims = {};
    let i = 0;
    for (const [an, fps, loop, list] of ANIMS) {
      const idx = [];
      for (let q = 0; q < list.length; q++) {
        const G = FRAMES[i];
        sh.add(cvs(G, map), 0, 0, [Math.round(G.hand[0]) - CX, FY - Math.round(G.hand[1])]);
        idx.push(i++);
      }
      anims[an] = { fps, loop: !!loop, frames: idx };
    }
    sh.done();
    const A = BK.OUT.atlas.sheets[name]; A.anims = anims; A.hands = A.extra; delete A.extra;
  }

  // ------------------------------------------------------------------ portrait 34x34
  {
    const G = GX(34, 34);
    // robe shoulders
    G.r(3, 26, 28, 8, (i, j, x) => (x < 11 ? C.robeB2 : x > 27 ? C.robeB0 : C.robeB1));
    G.r(3, 26, 28, 1, C.robeB2);
    // staff + crystal on the right
    for (let y = 15; y < 34; y++) G.p(29, y, y % 5 === 3 ? C.wood : C.woodL);
    G.p(29, 14, C.goldD); G.p(28, 13, C.gold); G.p(30, 13, C.gold);
    G.e(29, 9.5, 1.6, 3.6, (dx, dy) => (dy < -0.55 ? WH : dx < -0.3 ? C.ice1 : dx > 0.3 ? C.ice3 : dy < 0 ? C.ice0 : C.ice2));
    // long white hair at the back
    G.r(7, 13, 4, 13, (i, j) => (i === 0 || (i + j) % 4 === 0 ? C.hair1 : C.hair0));
    // face
    G.e(18, 17, 8.5, 7.5, (dx, dy) => (dx < -0.55 || dy < -0.55 ? C.skinD : C.skin));
    G.e(26, 18, 2.4, 2.2, (dx, dy) => (dy > 0.3 ? C.skinD : C.skin)); G.p(25, 17, C.robeW0);
    // bushy brows + eyes
    G.r(15, 14, 4, 2, (i, j) => (j ? C.hair1 : C.hair0)); G.r(21, 14, 4, 2, (i, j) => (j ? C.hair1 : C.hair0)); G.p(25, 14, C.hair0);
    G.r(16, 16, 2, 2, 0); G.p(16, 16, WH); G.r(22, 16, 2, 2, 0); G.p(22, 16, WH);
    // beard + moustache
    for (let y = 20; y <= 33; y++) {
      const t = (y - 20) / 13, hw = 9.5 * (1 - t * 0.62), bx = 19.5 + t * 2;
      for (let x = Math.round(bx - hw); x <= Math.round(bx + hw); x++) { const nx = (x - bx) / hw; G.p(x, y, nx < -0.6 ? C.hair1 : ((x + y) % 4 === 0 && t > 0.2) ? C.hair1 : nx > 0.75 ? C.robeW1 : C.hair0); }
    }
    G.r(15, 20, 12, 2, (i, j) => (j ? C.hair1 : C.hair0)); G.r(20, 22, 3, 1, C.robeW2);
    // hat band + bent cone
    G.r(5, 9, 24, 3, (i, j) => (i === 0 || (j === 2 && i % 2) ? C.hair1 : C.hair0));
    for (let y = 0; y < 9; y++) {
      const t = y / 8, hw = 9 * t + 0.8, hx = 17 - Math.pow(1 - t, 1.5) * 10;
      for (let x = Math.round(hx - hw); x <= Math.round(hx + hw); x++) G.p(x, y, x < hx - hw * 0.3 ? C.robeB2 : x > hx + hw * 0.55 ? C.robeB0 : C.robeB1);
    }
    G.p(20, 5, C.ice0); G.p(19, 6, C.ice1); G.p(21, 6, C.ice1); G.p(20, 7, C.ice1);
    G.outline();
    for (const [x, y] of [[31, 6], [26, 5], [31, 13]]) G.q(x, y, C.ice1);
    const face = cvs(G, null);
    png('portrait_pc_archmage', paint(34, 34, (c) => {
      for (let y = 0; y < 34; y++) for (let x = 0; x < 34; x++) { const d = Math.hypot(x - 17, y - 14) / 22; px(x, y, dz(x, y, 1 - d) ? C.vio4 : C.vio5); }
      c.getContext('2d').drawImage(face, 0, 0);
      R(0, 0, 34, 1, 0); R(0, 33, 34, 1, 0); R(0, 0, 1, 34, 0); R(33, 0, 1, 34, 0);
      R(1, 1, 32, 1, C.gold); R(1, 1, 1, 32, C.gold); R(1, 32, 32, 1, C.goldD); R(32, 1, 1, 32, C.goldD);
      R(2, 2, 30, 1, 0); R(2, 31, 30, 1, 0); R(2, 2, 1, 30, 0); R(31, 2, 1, 30, 0);
      for (const [x, y] of [[1, 1], [32, 1], [1, 32], [32, 32]]) px(x, y, C.holy0);
    }));
  }

  // ------------------------------------------------------------------ ported drawing (02-blizzard / 03-meteor)
  // ice spear: tip at (x,y), pointing along ang
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
        const c = edge ? C.ice3 : k === 0 ? (i < 2 ? WH : C.ice0) : Math.abs(k) === ww ? C.ice2 : C.ice1;
        px(cx + qx * k, cy + qy * k, c);
      }
    }
  }
  const TAILC = [WH, C.fireY, C.fireO, C.fireR, C.crim2, C.crim3, C.crim4];
  function drawMeteor(x, y, r, dx, dy, tail, seed, spin, step) {
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
    for (let a = -1.3; a <= 1.3; a += 0.18) {
      const ca = Math.cos(a), sa = Math.sin(a), nx = dx * ca - dy * sa, ny = dx * sa + dy * ca;
      px(x + nx * (r + 1), y + ny * (r + 1), Math.abs(a) < 0.6 ? C.fireY : C.fireO);
    }
    const ri = Math.ceil(r), cs = Math.cos(spin), sn = Math.sin(spin);
    for (let oy = -ri; oy <= ri; oy++) for (let ox = -ri; ox <= ri; ox++) {
      const d = Math.hypot(ox, oy);
      if (d > r + 0.2) continue;
      const n = d > 0 ? (ox * dx + oy * dy) / d : 0;
      let c;
      if (d > r - 1) c = n > 0.35 ? C.fireO : n > -0.1 ? C.fireR : C.rock2;
      else {
        const u2 = ox * cs - oy * sn, v2 = ox * sn + oy * cs;
        const cr = Math.abs(vnoise(u2 * 0.5 + seed * 5, v2 * 0.5 + 3) - 0.5);
        if (cr < 0.06 && r > 3) c = cr < 0.025 ? C.fireY : C.fireO;
        else if (n > 0.55 && d > r * 0.55) c = C.fireR;
        else if (ox - oy * 0.3 < -r * 0.35 && n < 0) c = C.rock0;
        else c = (ox + oy > r * 0.5) ? C.rock2 : C.rock1;
      }
      px(x + ox, y + oy, c);
    }
    if (r <= 4) px(x + dx, y + dy, C.fireY);
  }
  function flame(x, y, h, seed, step) {
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
  function fxSheet(name, w, h, n, meta, draw) {
    const sh = Sheet(name, w, h, Math.min(n, 10), Object.assign({ px: 0, py: 0 }, meta, { loop: !!meta.loop, anims: { play: { fps: meta.fps, loop: !!meta.loop, frames: Array.from({ length: n }, (_, i) => i) } } }));
    for (let f = 0; f < n; f++) sh.add(paint(w, h, () => draw(f)), 0, 0);
    sh.done();
  }

  // ------------------------------------------------------------------ icons 14x14
  {
    const sh = Sheet('icons_archmage', 14, 14, 5, { names: { j: 0, k: 1, l: 2, u: 3, sp: 4 } });
    const bg = () => R(0, 0, 14, 14, C.vio5);
    // j: ice bolt
    sh.add(paint(14, 14, () => {
      bg();
      for (const [x, y, c] of [[2, 11, C.ice3], [1, 9, C.ice2], [4, 12, C.ice2], [3, 7, C.ice1], [5, 10, C.ice1]]) px(x, y, c);
      line(3, 10, 5, 8, C.ice3);
      drawSpear(12, 2, -PI / 4, 10, true);
      px(12, 2, WH); px(13, 1, C.ice1);
    }), 0, 0);
    // k: blizzard: storm circle raining spears
    sh.add(paint(14, 14, () => {
      bg();
      for (let x = 1; x <= 12; x++) { const e = Math.abs(x - 6.5) / 6; px(x, 2, e > 0.8 ? C.ice3 : C.ice2); if (e < 0.85) px(x, 3, C.ice3); if (e < 0.6) px(x, 1, C.ice3); }
      R(4, 2, 6, 1, C.ice1); px(6, 2, WH); px(7, 2, WH);
      for (const [x, y] of [[4, 11], [8, 13], [11, 9]]) { line(x + 2, y - 4, x, y, C.ice2); px(x + 2, y - 4, C.ice3); px(x, y, WH); px(x + 1, y - 2, C.ice0); }
      for (const [x, y] of [[2, 6], [9, 6], [6, 9], [1, 12], [12, 12]]) px(x, y, C.ice0);
    }), 0, 0);
    // l: meteor
    sh.add(paint(14, 14, () => {
      bg();
      drawMeteor(5, 9, 2.6, -0.62, 0.78, 9, 1, 0.6, 2);
      px(1, 13, C.fireO); px(9, 13, C.fireR); px(12, 12, C.fireO);
    }), 0, 0);
    // u: ice strike: crystals erupting from the ground
    sh.add(paint(14, 14, () => {
      bg();
      R(1, 12, 12, 1, C.ice3); px(0, 12, C.ice4); px(13, 12, C.ice4);
      const spike = (cx, hgt, w) => {
        for (let y = 0; y < hgt; y++) { const ww = Math.min(w, Math.floor((hgt - y) / 2)); for (let x = -ww; x <= ww; x++) px(cx + x, 11 - y, x === -ww ? C.ice0 : x === ww ? C.ice3 : x < 0 ? C.ice1 : C.ice2); }
        px(cx, 11 - hgt, WH);
      };
      spike(3, 6, 1); spike(11, 5, 1); spike(7, 10, 2);
      px(1, 4, C.ice0); px(12, 3, C.ice1); px(10, 1, WH);
    }), 0, 0);
    // sp: teleport: a dithered afterimage and the mage blinking in with sparkles
    sh.add(paint(14, 14, () => {
      bg();
      const mini = (ox, cHat, cRobe, cBand, dith) => {
        for (let y = 0; y < 12; y++) for (let x = 0; x < 7; x++) {
          const X0 = ox + x, Y0 = 1 + y;
          let c = -1;
          if (y < 4) { const hw = y * 0.8; if (Math.abs(x - 3.5 + (3 - y) * 0.5) <= hw + 0.3) c = cHat; }
          else if (y === 4) c = cBand;
          else if (y === 5 || y === 6) c = x >= 3 && x <= 5 ? (y === 6 && x === 5 ? C.hair0 : C.skin) : x >= 1 && x <= 5 ? C.hair0 : -1;
          else { const hw = 1.5 + (y - 7) * 0.6; if (Math.abs(x - 3) <= hw) c = cRobe; }
          if (c < 0) continue;
          if (dith && bay(X0, Y0) > 0.5) continue;
          if (dith) c = C.vio2;
          px(X0, Y0, c);
        }
      };
      mini(0, C.vio2, C.vio2, C.vio2, 1);
      mini(6, C.robeB1, C.robeB1, C.hair0, 0);
      px(5, 2, WH); px(4, 2, C.ice1); px(6, 2, C.ice1); px(5, 1, C.ice1); px(5, 3, C.ice1);
      px(13, 11, C.ice0); px(5, 12, C.ice1); px(12, 1, C.ice1);
    }), 0, 0);
    sh.done();
  }

  // ------------------------------------------------------------------ FX
  // bolt: ice shard flying right with a sparkle trail
  fxSheet('fx_mage_bolt', 14, 8, 2, { px: 7, py: 4, fps: 12, loop: 1 }, (f) => {
    line(0, 4, 5, 4, C.ice4); line(3, 4, 6, 4, C.ice3);
    for (let q = 0; q < 5; q++) { const x = Math.floor(hash(q, f + 3) * 6), y = 4 + Math.round((hash(q, f + 9) - 0.5) * 5); px(x, y, q === 0 ? WH : q & 1 ? C.ice1 : C.ice2); }
    const PROF = [0, 0, 1, 1, 2, 2, 2, 1, 1];
    PROF.forEach((hh, i) => {
      const x = 13 - i;
      for (let k = -hh; k <= hh; k++) {
        let c = k === 0 ? (i < 3 ? WH : C.ice0) : k === -hh ? C.ice1 : k === hh ? C.ice3 : k < 0 ? C.ice0 : C.ice2;
        if (i === 8) c = C.ice2;
        px(x, 4 + k, c);
      }
    });
    px(9 - f * 2, 3, WH);
  });
  // spear: falling ice spear pointing down, tip at the pivot
  fxSheet('fx_mage_spear', 10, 22, 2, { px: 5, py: 21, fps: 12, loop: 1 }, (f) => {
    for (let q = 0; q < 4; q++) { const x = 1 + Math.floor(hash(q, f + 21) * 8), y = Math.floor(hash(q, f + 33) * 4); line(x, y, x, y + 1 + (q & 1), q & 1 ? C.ice3 : C.ice2); }
    for (let i = 0; i < 19; i++) {
      const y = 21 - i, hwf = i < 8 ? i / 8 * 2.6 : i < 14 ? 2.6 - (i - 8) * 0.12 : 1.9 - (i - 14) * 0.45;
      const hw = Math.max(0, Math.round(hwf));
      for (let k = -hw; k <= hw; k++) {
        let c = k === 0 ? (i < 5 ? WH : C.ice0) : k === -hw ? C.ice0 : k === hw ? C.ice3 : k < 0 ? C.ice1 : C.ice2;
        if (i >= 16 && k !== 0) c = C.ice3;
        px(5 + k, y, c);
      }
      if (i > 3 && i < 15) { px(5 - hw - 1, y, C.ice4); px(5 + hw + 1, y, C.ice4); }
    }
    px(4, 14 - f * 5, WH);
  });
  // circle: flat rotating ice magic circle
  fxSheet('fx_mage_circle', 48, 14, 4, { px: 24, py: 7, fps: 10, loop: 1 }, (f) => {
    const rot = f * (TAU / 3) / 4;
    magicCircle(24, 7, 22.5, rot, C.ice2, C.ice3, 0.27, { runes: 20 });
    ellipse(24, 7, 23.5, 6.4, C.ice3, 3, rot);
    for (let q = 0; q < 3; q++) { const a = -rot * 1.5 + q * TAU / 3; px(24 + Math.cos(a) * 12, 7 + Math.sin(a) * 3.2, WH); }
    px(24, 7, C.ice0);
  });
  // meteor: molten rock falling down-left, flaming tail streaming up-right
  fxSheet('fx_mage_meteor', 48, 48, 4, { px: 32, py: 32, fps: 12, loop: 1 }, (f) => {
    const dx = -0.6, dy = 0.8;
    for (let q = 0; q < 8; q++) {
      const s0 = hash(q, f + 60), s1 = hash(q + 20, f + 60);
      const ox = 26 + s0 * 22, oy = 4 + s1 * 30, len = 3 + Math.floor(hash(q, f + 70) * 5);
      line(ox, oy, ox - dx * len, oy - dy * len, q & 1 ? C.crim2 : C.fireR);
    }
    drawMeteor(32, 32, 6, dx, dy, 20, 1, f * PI / 2, f);
    for (let q = 0; q < 5; q++) { const t = hash(q, f + 80); px(32 + 0.6 * t * 20 + (hash(q, f + 90) - 0.5) * 10, 32 - 0.8 * t * 20 + (hash(q, f + 95) - 0.5) * 8, q & 1 ? C.fireY : C.fireO); }
  });
  // boom: big fire explosion dome with ground rings, fire pillars, debris and smoke
  {
    const OX = 40, OY = 63;
    const PILLARS = [[-22, 0.10, 14], [-13, 0.04, 26], [-5, 0.0, 36], [5, 0.07, 32], [14, 0.02, 24], [23, 0.12, 15], [-30, 0.18, 8], [31, 0.2, 9]];
    const ET = [0.02, 0.07, 0.13, 0.2, 0.28, 0.37, 0.47, 0.58, 0.7, 0.84];
    const SMOKE = [C.rock0, C.rock1, C.rock1, C.rock2];
    fxSheet('fx_mage_boom', 80, 64, 10, { px: OX, py: OY, fps: 20, loop: 0 }, (f) => {
      const eT = ET[f], step = f;
      // smoke (behind)
      if (eT > 0.2) for (let q = 0; q < 9; q++) {
        const t = eT - 0.2 - hash(q, 3) * 0.1; if (t < 0) continue;
        const sx = OX + (hash(q, 1) - 0.5) * 44, sy = OY - 12 - hash(q, 2) * 14 - t * 38, r = 2.5 + hash(q, 4) * 2.5 + t * 4;
        const fade = cl01((eT - 0.45) / 0.4);
        for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
          const d = Math.hypot(x, y) / r; if (d > 1) continue;
          const X0 = Math.round(sx + x), Y0 = Math.round(sy + y);
          if (bay(X0, Y0) < fade + d * 0.25) continue;
          px(X0, Y0, SMOKE[Math.min(3, Math.floor((d + (y > 0 ? 0.3 : 0)) * 3))]);
        }
      }
      // ground shock rings
      if (eT < 0.6) {
        const rr0 = 8 + 34 * easeOut(Math.min(1, eT / 0.45));
        ellipse(OX, OY - 1, rr0, rr0 * 0.16, eT < 0.3 ? C.fireY : C.fireO, eT > 0.4 ? 2 : 0);
        ellipse(OX, OY - 1, rr0 * 0.8, rr0 * 0.8 * 0.16, C.crim2, 3);
      }
      if (eT < 0.25) { const r2 = 6 + eT * 110; ellipse(OX, OY - 16, r2, r2 * 0.7, WH, 2); }
      // fire pillars
      for (let i = 0; i < PILLARS.length; i++) {
        const [pdx, del, mh] = PILLARS[i];
        const t = eT - del; if (t < 0 || t > 0.8) continue;
        const hgt = Math.round(mh * (t < 0.1 ? easeOut(t / 0.1) : 1 - easeIn((t - 0.1) / 0.7)));
        const w = mh > 20 ? 2 : 1;
        for (let y = 0; y < hgt; y++) {
          const fr = y / hgt;
          if (fr > 0.8 && hash(step + i, y) < 0.5) continue;
          const half = Math.round(w * (1 - fr * 0.6) + (hash(step, i * 40 + y) > 0.7 ? 1 : 0));
          const ox = Math.round(Math.sin(y * 0.45 + step * 1.7 + i) * fr * 1.5);
          for (let x = -half; x <= half; x++) {
            const edge = Math.abs(x) === half;
            px(OX + pdx + x + ox, OY - y, edge ? (fr > 0.55 ? C.crim2 : C.fireR) : fr > 0.7 ? C.fireR : (x === 0 && fr < 0.45) ? C.fireY : C.fireO);
          }
        }
      }
      // debris chunks (behind the dome)
      for (let q = 0; q < 12; q++) {
        const side = q & 1 ? 1 : -1, vx = side * (20 + hash(q, 11) * 45), vy = -(60 + hash(q, 12) * 60), s = hash(q, 13) < 0.5 ? 3 : 2;
        const t = eT - 0.04; if (t <= 0) continue;
        let x = OX + (hash(q, 14) - 0.5) * 8 + vx * t, y = OY - 6 + vy * t + 125 * t * t;
        if (y > OY - s + 1) y = OY - s + 1;
        if (f === 9 && q % 3 === 0) continue;
        x = Math.round(x); y = Math.round(y);
        R(x, y, s, s, C.rock1); px(x, y, C.rock0); px(x + s - 1, y + s - 1, C.rock2);
        if (eT < 0.6) px(x + (s > 2 ? 1 : 0), y + 1, (q + f) & 1 ? C.fireO : C.fireY);
      }
      // dome
      if (eT < 0.85) {
        const R0 = 9 + 23 * easeOut(Math.min(1, eT / 0.26)), fade = Math.max(0, (eT - 0.3) / 0.55), ext = Math.ceil(R0) + 1;
        for (let y = -ext; y <= 0; y++) for (let x = -ext; x <= ext; x++) {
          const X0 = OX + x, Y0 = OY + y;
          const n = vnoise(X0 / 4 + eT * 6, Y0 / 4 - eT * 14);
          const d = Math.hypot(x, y * 1.15) / Math.max(1, R0) + (n - 0.5) * 0.35 + fade * 0.55;
          if (d > 1) continue;
          if (fade > 0 && bay(X0, Y0) < fade * 1.1 - (1 - d) * 0.3) continue;
          px(X0, Y0, d < 0.3 ? WH : d < 0.5 ? C.fireY : d < 0.7 ? C.fireO : d < 0.87 ? C.fireR : C.crim2);
        }
      }
      // flames licking along the ground late
      if (eT > 0.35) for (let q = 0; q < 7; q++) { const hh = (1 - cl01((eT - 0.35) / 0.5)) * (2 + hash(q, 7) * 4); if (hh > 0.3) flame(OX - 24 + q * 8 + Math.round(hash(q, 8) * 3), OY, hh, q * 3, step); }
      // embers
      for (let q = 0; q < 10; q++) { const t = eT - hash(q, 20) * 0.2; if (t < 0.1) continue; px(OX + (hash(q, 21) - 0.5) * 60 + Math.sin(t * 8 + q) * 2, OY - 4 - t * 70 * (0.5 + hash(q, 22)), (q + f) & 1 ? C.fireO : C.fireY); }
    });
  }
  // icestrike: ice crystals erupting from the ground in a ring, then shattering
  {
    const OX = 32, OY = 47;
    const N = 10, CR = [];
    for (let k = 0; k < N; k++) {
      const a = k / N * TAU + 0.31, s = Math.sin(a);
      CR.push({ a, x: OX + Math.cos(a) * 23, y: Math.min(OY, Math.round(OY - 6 + s * 6)), h: Math.round((12 + hash(k, 1) * 12) * (s > 0 ? 1.1 : 0.75)), w: 1 + (hash(k, 2) < 0.55 ? 1 : 0) + (s > 0.3 ? 1 : 0), back: s < -0.05, del: hash(k, 3) * 0.9, lean: Math.cos(a) * 0.28 });
    }
    CR.push({ a: PI / 2, x: OX - 5, y: OY - 5, h: 16, w: 2, back: 0, del: 0.6, lean: -0.15 });
    CR.push({ a: PI / 2, x: OX + 4, y: OY - 6, h: 21, w: 2, back: 0, del: 0.3, lean: 0.1 });
    CR.sort((p, q) => p.y - q.y);
    function prism(c, gr, crack, dith) {
      const hh = Math.round(c.h * gr); if (hh < 1) return;
      for (let y = 0; y < hh; y++) {
        const yy = Math.round(c.y - y), tipd = hh - y, ww = Math.min(c.w, Math.floor(tipd * 0.7));
        const xc = c.x + c.lean * y;
        for (let x = -ww; x <= ww; x++) {
          const X0 = Math.round(xc + x);
          if (dith && bay(X0, yy) < dith) continue;
          let col = Math.abs(x) === ww ? (x < 0 ? C.ice0 : C.ice3) : x < 0 ? C.ice1 : x === 0 ? C.ice0 : C.ice2;
          if (ww === 0) col = C.ice0;
          if (c.back) col = col === C.ice0 ? C.ice1 : col === C.ice1 ? C.ice2 : col === C.ice2 ? C.ice3 : C.ice4;
          if (y === 0) col = c.back ? C.ice4 : C.ice3;
          px(X0, yy, col);
        }
      }
      px(Math.round(c.x + c.lean * hh), Math.round(c.y - hh), c.back ? C.ice1 : WH);
      if (crack) { let x = c.x, y = c.y - hh * 0.4; for (let s = 0; s < 3; s++) { const nx = x + (hash(s, c.a * 10) - 0.5) * 3, ny = y - 2 - hash(s + 4, c.a * 10) * 2; line(x, y, nx, ny, WH); x = nx; y = ny; } }
    }
    fxSheet('fx_mage_icestrike', 64, 48, 8, { px: OX, py: OY, fps: 20, loop: 0 }, (f) => {
      // frost ring on the ground
      if (f < 7) {
        const k = f < 5 ? 1 : 1 - (f - 4) / 3;
        for (let x = 4; x < 60; x++) for (let y = OY - 13; y <= OY; y++) {
          const d = Math.hypot((x - OX) / 27, (y - (OY - 6)) / 6.8);
          if (d > 1) continue;
          if (bay(x, y) < (d > 0.78 ? 0.8 : 0.25) * k) px(x, y, d > 0.78 ? (f < 2 ? C.ice0 : C.ice1) : C.ice3);
        }
        if (f < 2) ellipse(OX, OY - 6, 25 + f * 2, 6.6, WH, 2);
      }
      const GR = [0.2, 0.62, 1.05, 1.0, 1.0, 0.75, 0.4, 0];
      for (const c of CR) {
        const gr = f < 3 ? cl01(GR[f] + (0.45 - c.del * 0.5) * (f < 2 ? 1 : 0)) : GR[f];
        prism(c, gr, f === 4, f === 5 ? 0.35 : f === 6 ? 0.65 : 0);
      }
      // glints
      if (f === 3 || f === 4) for (let q = 0; q < 6; q++) { const c = CR[Math.floor(hash(q, f) * CR.length)], x = Math.round(c.x + c.lean * c.h * 0.6), y = Math.round(c.y - c.h * 0.6); px(x, y, WH); px(x - 1, y, C.ice1); px(x + 1, y, C.ice1); px(x, y - 1, C.ice1); px(x, y + 1, C.ice1); }
      // shards flying out after the shatter
      if (f >= 4) {
        const t = f - 3.5;
        CR.forEach((c, i) => {
          for (let s = 0; s < 3; s++) {
            const vx = Math.cos(c.a) * (2 + hash(i, s + 30) * 3) + (hash(i, s + 40) - 0.5) * 3, vy = -(2.5 + hash(i, s + 50) * 3.5);
            const x = Math.round(c.x + vx * t), y = Math.round(c.y - c.h * 0.5 + vy * t + 0.9 * t * t);
            if (y > OY || (f === 7 && s > 0)) continue;
            px(x, y, s === 0 ? WH : s === 1 ? C.ice1 : C.ice2);
            if (s === 1 && f < 7) px(x + 1, y, C.ice2);
          }
        });
      }
      if (f === 7) for (let q = 0; q < 8; q++) px(OX + (hash(q, 70) - 0.5) * 50, OY - 2 - hash(q, 71) * 24, q & 1 ? C.ice1 : C.ice0);
    });
  }
};
