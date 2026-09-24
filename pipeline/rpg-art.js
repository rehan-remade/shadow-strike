// Shadow Strike RPG art: tiles, parallax sets, props, portal, NPCs, monsters, items, effects and logo.
// Everything is procedural, palette-indexed and deterministic (engine rng/hash/bay only).
window.RPG_ART = function (BK) {
  'use strict';
  const { Sheet, png, Grid, OUT } = BK;
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------ palette additions
  const pc = (n, hex) => { if (C[n] === undefined) { PAL.push(hex); C[n] = PAL.length - 1; } return C[n]; };
  [['cap0', '#ffcf8f'], ['cap1', '#ff9148'], ['cap2', '#e2562c'], ['cap3', '#a3301f'], ['cap4', '#5c1a16'],
    ['sh0', '#d4fff2'], ['sh1', '#7fe0c6'], ['sh2', '#3ca89e'], ['sh3', '#236a7a'], ['sh4', '#173e52'],
    ['slug0', '#fde8c6'], ['blush', '#f2877f'], ['leafL', '#a6cf58'], ['barkD', '#3a2820'],
  ].forEach(([n, h]) => pc(n, h));
  const ramp8 = (p, hs) => hs.map((h, i) => pc(p + i, h));
  const TH = {
    town: {
      seed: 11, sky: [C.sky1, C.sky2, C.sky3, C.sky4, C.sky5, C.sky6, C.sky7, C.sky8], hz: 150,
      moon: { x: 254, y: 40, r: 11, c: [C.moon, C.sky9, C.sky8], glow: 4, halo: 12, cs: 0.6 }, star: [C.moon, C.sky9, C.sky6], nstar: 70,
      clouds: [[20, 22, 60], [120, 58, 90], [210, 84, 70], [290, 30, 40], [40, 100, 80]],
      mtnF: pc('t_mf', '#3f3a6c'), mtnN: C.mtn, rim: C.sky5, rimN: pc('t_rn', '#3f4a78'), snow: C.sky6,
      far2: pc('t_f2', '#2a3158'), far: C.tree1, fogA: C.sky4, fogB: C.sky5, mid: C.tree3, mid2: C.tree4, midRim: C.tree2,
    },
    grove: {
      seed: 23, sky: ramp8('gv', ['#0b1a22', '#0f252c', '#143134', '#1b413d', '#275346', '#3b6a50', '#5d8558', '#94a766']), hz: 150,
      moon: { x: 70, y: 36, r: 9, c: ramp8('gm', ['#eef8d6', '#bcd6a4', '#8fb088']), glow: 3, halo: 10, cres: 0.55, cs: 0.5 },
      star: [C.gm0, C.gm1, C.gv5], nstar: 45,
      clouds: [[30, 52, 80], [150, 70, 110], [250, 40, 60], [200, 96, 90], [10, 112, 70]],
      mtnF: pc('g_mf', '#2a4d4b'), mtnN: pc('g_mn', '#1f3c3d'), rim: pc('g_rim', '#44705e'), rimN: pc('g_rn', '#2e5450'), snow: C.gv6,
      far2: pc('g_f2', '#1b3638'), far: pc('g_f', '#142a2e'), fogA: pc('g_fa', '#2c5048'), fogB: pc('g_fb', '#3f6a54'),
      mid: pc('g_m', '#0c1d21'), mid2: pc('g_m2', '#071316'), midRim: pc('g_mr', '#183530'),
    },
    deep: {
      seed: 37, sky: ramp8('dp', ['#04071a', '#070c23', '#0a112d', '#0e1838', '#122045', '#172953', '#1e3363', '#283f74']), hz: 160,
      moon: { x: 226, y: 58, r: 25, c: ramp8('dm', ['#e8eeff', '#b8c4e8', '#8e9dce']), glow: 5, halo: 22, cs: 0.34 },
      star: [C.dm0, C.dm1, C.dp6], nstar: 120,
      clouds: [[10, 96, 70], [120, 110, 100], [270, 104, 60]],
      mtnF: pc('d_mf', '#1c2856'), mtnN: pc('d_mn', '#141e44'), rim: pc('d_rim', '#34498a'), rimN: pc('d_rn', '#22306a'), snow: pc('d_snow', '#4a62a8'),
      far2: pc('d_f2', '#111a3c'), far: pc('d_f', '#0d1531'), fogA: pc('d_fa', '#1c2a5a'), fogB: pc('d_fb', '#283b72'),
      mid: pc('d_m', '#080f25'), mid2: pc('d_m2', '#050a1a'), midRim: pc('d_mr', '#152248'),
    },
    glade: {
      seed: 53, sky: ramp8('gl', ['#0e040b', '#1a0710', '#290b17', '#3c0f1f', '#521428', '#6b1b2e', '#862634', '#a63838']), hz: 150,
      moon: { x: 78, y: 46, r: 16, c: ramp8('bm', ['#ffb48c', '#e8604a', '#b03434']), glow: 5, halo: 18, cs: 0.45, hot: 1 },
      star: [C.bm0, C.gl6, C.gl5], nstar: 36,
      clouds: [[150, 30, 90], [220, 66, 110], [10, 90, 80], [260, 100, 60]],
      mtnF: pc('r_mf', '#461830'), mtnN: pc('r_mn', '#351226'), rim: pc('r_rim', '#6e2440'), rimN: pc('r_rn', '#4e1a32'), snow: 0,
      far2: pc('r_f2', '#2c0e20'), far: pc('r_f', '#230a1a'), fogA: pc('r_fa', '#4f1a2c'), fogB: pc('r_fb', '#6c2636'),
      mid: pc('r_m', '#170713'), mid2: pc('r_m2', '#10040c'), midRim: pc('r_mr', '#321022'),
    },
  };
  pc('cry0', '#fbe8ff');

  // ------------------------------------------------------------------ grid helpers
  function GX(w, h) {
    const G = Grid(w, h);
    const val = (c, a, b, x, y, d) => (typeof c === 'function' ? c(a, b, x, y, d) : c);
    G.p = (x, y, c) => { if (c !== undefined && c !== null) G.set(x, y, c); };
    G.r = (x, y, ww, hh, c) => { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) G.p(x + i, y + j, val(c, i, j, x + i, y + j)); };
    G.e = (cx, cy, rx, ry, c) => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
        if (d <= 1) G.p(x, y, val(c, dx, dy, x, y, d));
      }
    };
    G.ln = (x0, y0, x1, y1, c) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, n = 0;
      for (;;) { G.p(x0, y0, val(c, n, 0, x0, y0)); if ((x0 === x1 && y0 === y1) || ++n > 400) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    };
    G.under = (x, y, c) => { if (G.get(Math.round(x), Math.round(y)) < 0) G.set(x, y, c); };
    G.re = (x, y, c) => { if (G.get(Math.round(x), Math.round(y)) >= 0) G.set(x, y, c); };
    return G;
  }
  function cloneG(G) { const N = GX(G.w, G.h); N.a.set(G.a); return N; }
  function ditherG(G, k, ox) { const N = cloneG(G); for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (bay(x + (ox || 0), y) >= k) N.a[y * G.w + x] = -1; return N; }
  function mirrorG(G) { const N = GX(G.w, G.h); for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) N.a[y * G.w + x] = G.a[y * G.w + (G.w - 1 - x)]; return N; }
  function stamp(dst, src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const v = src.a[y * src.w + x]; if (v >= 0) dst.set(x + ox, y + oy, v); } }
  // shade a filled mask by distance-to-edge: ramp[0] is the rim
  function depthShade(G, ramp, pick) {
    const w = G.w, h = G.h, D = new Int16Array(w * h).fill(0);
    for (let i = 0; i < w * h; i++) if (G.a[i] >= 0) D[i] = 99;
    for (let pass = 0; pass < 2; pass++) for (let it = 0; it < 8; it++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!D[i]) continue;
      let m = 99;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X0 = x + dx, Y0 = y + dy; m = Math.min(m, X0 < 0 || Y0 < 0 || X0 >= w || Y0 >= h ? 0 : D[Y0 * w + X0]); }
      D[i] = Math.min(D[i], m + 1);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = D[y * w + x]; if (d) G.a[y * w + x] = pick ? pick(d, x, y) : ramp[Math.min(d - 1, ramp.length - 1)]; }
  }
  // canvas painter with automatic context restore
  function paint(w, h, fn) { const c = mk(w, h); use(c.getContext('2d')); fn(c); use(g); return c; }
  function sheetOf(name, w, h, cols, frames, meta) { const sh = Sheet(name, w, h, cols, meta); for (const f of frames) sh.add(f, 0, 0); sh.done(); }
  const dz = (x, y, k) => bay(x, y) < k;
  // 4-point shuriken polygon, bevelled: light on the leading side of each arm
  function starPoly(G, cx, cy, Rt, Rv, rot, twist, cL, cD, x0, y0, x1, y1) {
    const V = [];
    for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; V.push([cx + Math.cos(a) * Rt, cy + Math.sin(a) * Rt]); const b = a + Math.PI / 4 + twist; V.push([cx + Math.cos(b) * Rv, cy + Math.sin(b) * Rv]); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const X0 = x + 0.5, Y0 = y + 0.5; let ins = false;
      for (let i = 0, j = V.length - 1; i < V.length; j = i++) { const [xi, yi] = V[i], [xj, yj] = V[j]; if ((yi > Y0) !== (yj > Y0) && X0 < (xj - xi) * (Y0 - yi) / (yj - yi) + xi) ins = !ins; }
      if (!ins) continue;
      let d = Math.atan2(Y0 - cy, X0 - cx) - rot; d = ((d % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); if (d > Math.PI / 4) d -= Math.PI / 2;
      G.p(x, y, d < 0 ? cL : cD);
    }
  }

  // ================================================================== TILES
  (function tiles() {
    const T = [], names = {};
    const hs = (x, y, s) => hash(x * 13 + s * 101, y * 7 + s * 31 + 5);
    const add = (name, G) => { names[name] = T.length; T.push(G); };
    function dirtCol(G, x, y0, y1, s, deep) {
      for (let y = y0; y <= y1; y++) {
        const n = hs(x, y, s);
        let c = deep ? C.dirtD : (y >= 7 && n < 0.35) || (y === 6 && n < 0.12) ? C.dirtD : C.dirt;
        if (!deep && y < 7 && n > 0.93) c = C.dirtD;
        G.p(x, y, c);
      }
    }
    // clods: small lighter lumps with a dark underside, placed per tile variant (wrap inside the tile so edges stay clean)
    function clods(G, s, n, x0, x1, y0, y1) {
      for (let k = 0; k < n; k++) {
        const x = x0 + Math.floor(hs(k, 1, s) * (x1 - x0 + 1)), y = y0 + Math.floor(hs(k, 2, s) * (y1 - y0 + 1)), w = hs(k, 3, s) < 0.5 ? 2 : 1;
        for (let i = 0; i < w; i++) G.re((x + i) & 7, y, C.dirt);
        if (w === 2 && hs(k, 4, s) < 0.5) G.re(x & 7, y, C.rock1);
      }
    }
    function stone(G, x, y, w) { for (let i = 0; i < w; i++) { G.p(x + i, y, i === 0 ? C.rock1 : C.rock0); G.p(x + i, y + 1, i === w - 1 ? C.rock2 : C.rock1); } G.p(x - 1, y + 1, C.rock2); }
    function grass(s, left, right) {
      const G = GX(8, 8);
      for (let x = 0; x < 8; x++) {
        const eL = left ? x : 9, eR = right ? 7 - x : 9, e = Math.min(eL, eR);
        const h = hs(x, 0, s);
        const fr = hs(x, 4, s), fl = fr < 0.3 ? 0 : fr < 0.75 ? 1 : 2;   // fringe length below row 3
        if (e >= 3 && h < 0.34) G.p(x, 0, h < 0.12 ? C.leafL : C.grassL);
        if (e >= 2 && (h < 0.8 || e < 9)) G.p(x, 1, h < 0.34 ? C.leafL : C.grassL);
        if (e >= 1) G.p(x, 2, hs(x, 2, s) < 0.45 ? C.grassL : C.grass);
        if (e >= 1) { dirtCol(G, x, 4, 7, s); G.p(x, 3, fl ? C.grass : C.grassD); if (fl >= 1) G.p(x, 4, fl === 2 ? C.grass : C.grassD); if (fl === 2) G.p(x, 5, C.grassD); }
        if (e === 0) { G.p(x, 2, C.grassD); G.p(x, 3, C.grassD); G.p(x, 4, C.grassD); G.p(x, 5, 0); G.p(x, 6, 0); G.p(x, 7, 0); }
        if (e === 1) { G.p(x, 5, C.dirtD); G.p(x, 6, C.dirtD); G.p(x, 7, C.dirtD); }
      }
      if (!left && !right) { if (s === 2) stone(G, 4, 6, 2); }
      clods(G, s + 40, 1, 1, 6, 6, 6);
      return G;
    }
    add('grass_l', grass(1, true, false)); add('grass_m', grass(2)); add('grass_m2', grass(3)); add('grass_r', grass(4, false, true));
    function dirt(s, left, right, deco) {
      const G = GX(8, 8);
      for (let x = 0; x < 8; x++) {
        const e = Math.min(left ? x : 9, right ? 7 - x : 9);
        dirtCol(G, x, 0, 7, s, true);
        if (e === 0) for (let y = 0; y < 8; y++) G.p(x, y, 0);
        if (e === 1) for (let y = 0; y < 8; y++) G.p(x, y, hs(x, y, s) < 0.3 ? C.dirt : C.dirtD);
      }
      clods(G, s, 3, left ? 2 : 0, right ? 5 : 7, 0, 7);
      if (deco === 1) { G.re(3, 3, C.rock1); G.re(4, 3, C.rock1); }
      if (deco === 2) { G.ln(0, 6, 3, 5, C.barkD); G.ln(4, 5, 7, 6, C.barkD); G.p(3, 4, C.barkD); stone(G, 4, 1, 3); G.p(3, 1, C.rock1); G.p(4, 0, C.rock1); G.p(5, 0, C.rock0); }
      return G;
    }
    add('dirt_l', dirt(5, true, false)); add('dirt_m', dirt(6, false, false, 1)); add('dirt_m2', dirt(7, false, false, 2)); add('dirt_r', dirt(8, false, true));
    function under(s, side) { // side -1 left, 0 mid, 1 right
      const G = GX(8, 8);
      for (let x = 0; x < 8; x++) {
        const xx = side === 1 ? 7 - x : x;
        let b = side === 0 ? 3 + (hs(x, 9, s) < 0.35 ? 1 : 0) : Math.min(4, Math.floor(xx * 0.75));
        for (let y = 0; y <= b; y++) G.p(x, y, y >= b - 1 ? C.dirtD : dz(x, y, 0.35 + y * 0.1) ? C.dirtD : C.dirt);
        if (side !== 0 && xx === 0) G.p(x, 0, 0);
        G.p(x, b + 1, 0);
      }
      if (side === 0) { G.p(5, 5, C.wood); G.p(5, 6, C.barkD); G.p(4, 7, C.barkD); G.p(1, 6, C.barkD); G.p(4, 5, 0); G.p(6, 6, 0); G.p(5, 7, 0); G.p(3, 7, 0); G.p(1, 7, 0); G.p(0, 6, 0); G.p(2, 6, 0); }
      if (side === -1) { G.p(5, 6, C.barkD); G.p(5, 7, C.barkD); G.p(4, 6, 0); G.p(6, 7, 0); }
      if (side === 1) { G.p(2, 6, C.barkD); G.p(3, 7, C.barkD); G.p(1, 6, 0); G.p(2, 7, 0); }
      return G;
    }
    add('under_l', under(9, -1)); add('under_m', under(10, 0)); add('under_r', under(11, 1));
    function plank(side) {
      const G = GX(8, 8);
      for (let x = 0; x < 8; x++) {
        G.p(x, 0, C.woodL); G.p(x, 1, hash(x, 71 + side) < 0.2 ? C.straw : C.wood); G.p(x, 2, hash(x, 73 + side) < 0.25 ? C.dirt : C.wood); G.p(x, 3, 0);
      }
      if (side === 0) { G.p(7, 1, C.dirt); G.p(7, 2, C.barkD); G.p(0, 0, C.straw); G.p(1, 1, C.armor1); G.p(5, 1, C.armor1); }
      if (side !== 0) {
        const xe = side < 0 ? 0 : 7, xi = side < 0 ? 1 : 6, pa = side < 0 ? 2 : 4;
        G.p(xe, 0, -1); G.p(xe, 1, 0); G.p(xe, 2, 0); G.p(xi, 0, 0); G.p(xi + (side < 0 ? 1 : -1), 0, C.woodL);
        for (let y = 4; y < 8; y++) { G.p(pa - 1, y, 0); G.p(pa, y, C.woodL); G.p(pa + 1, y, C.wood); G.p(pa + 2, y, 0); }
        G.p(pa, 4, C.burlap); G.p(pa + 1, 4, C.burlapD); G.p(pa, 5, C.burlapD); G.p(pa + 1, 1, C.armor1);
      }
      return G;
    }
    add('plank_l', plank(-1)); add('plank_m', plank(0)); add('plank_r', plank(1));
    function rope(top) {
      const G = GX(8, 8);
      for (let y = 0; y < 8; y++) { G.p(2, y, 0); G.p(5, y, 0); const k = (y) % 3; G.p(3, y, k === 0 ? C.burlapD : C.straw); G.p(4, y, k === 1 ? C.burlapD : k === 2 ? C.burlap : C.straw); }
      if (top) { G.r(0, 0, 8, 4, -1); G.r(0, 0, 8, 1, 0); G.r(0, 3, 8, 1, 0); G.p(0, 1, 0); G.p(0, 2, 0); G.p(7, 1, 0); G.p(7, 2, 0); G.r(1, 1, 6, 1, C.woodL); G.r(1, 2, 6, 1, C.wood); G.p(3, 2, C.burlapD); G.p(4, 2, C.burlap); G.r(2, 4, 4, 2, C.straw); G.p(1, 4, 0); G.p(6, 4, 0); G.p(1, 5, 0); G.p(6, 5, 0); G.p(3, 5, C.burlapD); G.p(4, 4, C.burlapD); }
      return G;
    }
    add('rope', rope(false)); add('rope_top', rope(true));
    function ladder(top) {
      const G = GX(8, 8);
      for (let y = 0; y < 8; y++) { G.p(0, y, 0); G.p(1, y, C.woodL); G.p(2, y, 0); G.p(5, y, 0); G.p(6, y, C.wood); G.p(7, y, 0); }
      for (const ry of [3]) { G.r(2, ry, 4, 1, C.woodL); G.r(2, ry + 1, 4, 1, C.dirt); G.r(3, ry - 1, 2, 1, -1); G.p(2, ry - 1, 0); G.p(3, ry - 1, 0); G.p(4, ry - 1, 0); G.p(5, ry - 1, 0); G.r(2, ry + 2, 4, 1, 0); }
      if (top) { G.p(0, 0, -1); G.p(2, 0, -1); G.p(5, 0, -1); G.p(7, 0, -1); G.p(1, 0, 0); G.p(6, 0, 0); G.p(1, 1, C.strawL); G.p(6, 1, C.woodL); }
      return G;
    }
    add('ladder', ladder(false)); add('ladder_top', ladder(true));
    sheetOf('tiles', 8, 8, 8, T.map(G => G.toCanvas(false)), { px: 0, py: 0, names });
  })();

  // ================================================================== PARALLAX
  const wrap = x => ((x % 640) + 640) % 640;
  function pnoise(x, y, P2) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => hash(((a % P2) + P2) % P2, b);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function skyL(T) {
    const P = TH[T], S = P.sky, n = S.length, r = rng(P.seed);
    const si = (x, y) => { const t = Math.pow(clamp(y / P.hz, 0, 1), 1.3), f = t * (n - 1), i = Math.floor(f); return Math.min(i + (f - i > bay(x, y) ? 1 : 0), n - 1); };
    return paint(320, 180, () => {
      for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) px(x, y, S[si(x, y)]);
      const M = P.moon;
      // stars
      for (let k = 0; k < P.nstar; k++) {
        const x = Math.floor(r() * 320), y = Math.floor(Math.pow(r(), 1.5) * 110), b = r();
        if (Math.hypot(x - M.x, y - M.y) < M.r + M.glow + 4 || si(x, y) > 4) continue;
        px(x, y, b > 0.82 ? P.star[0] : b > 0.4 ? P.star[1] : P.star[2]);
        if (b > 0.95 && y > 2) { px(x - 1, y, P.star[2]); px(x + 1, y, P.star[2]); px(x, y - 1, P.star[2]); px(x, y + 1, P.star[2]); }
      }
      // wispy cloud streaks (lit from below)
      for (const [x0, cy, len] of P.clouds) for (let row = 0; row < 3; row++) {
        const w = row === 0 ? len * 0.5 : row === 1 ? len : len * 0.7, ox = row === 0 ? len * 0.25 : row === 2 ? len * 0.1 : 0;
        for (let q = 0; q < w; q++) {
          const x = Math.round(x0 + ox + q), y = cy + row, edge = Math.min(q, w - q) / 6;
          if (x < 0 || x >= 320 || (edge < 1 && bay(x, y) > edge)) continue;
          px(x, y, S[Math.min(si(x, y) + (row === 2 ? 2 : 1), n - 1)]);
        }
      }
      // moon
      const RR = M.r, E = RR + M.glow + M.halo + 2, craters = [];
      for (let k = 0; k < Math.round(RR / 2.2); k++) { const a = r() * TAU, dd = Math.sqrt(r()) * RR * 0.72, qr = 1 + r() * RR * 0.16; craters.push([Math.round(Math.cos(a) * dd), Math.round(Math.sin(a) * dd), qr]); }
      for (let y = -E; y <= E; y++) for (let x = -E; x <= E; x++) {
        const X0 = M.x + x, Y0 = M.y + y, d = Math.hypot(x, y);
        if (d <= RR) {
          if (M.cres && Math.hypot(x - M.cres * RR, y + M.cres * RR * 0.45) < RR * 0.98) { px(X0, Y0, S[Math.min(si(X0, Y0) + 1, n - 1)]); continue; }
          let c = M.c[0];
          const nz = vnoise(x / RR * 2.4 + P.seed, y / RR * 2.4 + 7.7);
          if (nz > 0.62) c = M.c[1];
          for (const [qx, qy, qr] of craters) { const cd = Math.hypot(x - qx, y - qy); if (cd <= qr) c = cd > qr - 1 && (x - qx) + (y - qy) < -0.5 ? M.c[0] : cd > qr - 1 && (x - qx) + (y - qy) > 0.5 && RR > 12 ? M.c[2] : M.c[1]; }
          if (x + y > RR * 0.5 && d > RR - 1.6) c = M.c[1];
          if (x + y > RR * 0.9 && d > RR - 1.0 && RR > 12) c = M.c[2];
          px(X0, Y0, c);
        } else if (d <= RR + M.glow) {
          if (bay(X0, Y0) < (1 - (d - RR) / M.glow) * 0.7) px(X0, Y0, S[Math.min(si(X0, Y0) + (M.hot && d < RR + 2 ? 3 : 2), n - 1)]);
          else px(X0, Y0, S[Math.min(si(X0, Y0) + 1, n - 1)]);
        } else if (d <= RR + M.glow + M.halo) {
          if (bay(X0, Y0) < (1 - (d - RR - M.glow) / M.halo) * 0.55) px(X0, Y0, S[Math.min(si(X0, Y0) + 1, n - 1)]);
        }
      }
    });
  }
  function mtnL(T) {
    const P = TH[T], ph = P.seed * 0.37;
    const f = (x, base, terms) => { let h = base; for (const [k, a, p, ab] of terms) { const s = Math.sin(TAU * k * x / 640 + p + ph * k); h += ab ? -a * (1 - Math.abs(s)) : a * s; } return h; };
    const far = x => f(x, 112, [[1, 5, 0.3], [2, 4, 1.9], [3, 10, 0.7, 1], [5, 6, 2.2, 1], [9, 3, 4.1, 1], [17, 1.4, 0.5], [31, 0.7, 1.1]]);
    const near = x => f(x, 132, [[2, 4, 2.5], [3, 6, 0.2, 1], [4, 4, 1.3], [7, 5, 3.0, 1], [13, 2, 0.9, 1], [27, 1, 2.2]]);
    return paint(640, 180, () => {
      for (const [fn, col, rim, base, snow] of [[far, P.mtnF, P.rim, 112, P.snow], [near, P.mtnN, P.rimN, 132, 0]]) {
        for (let x = 0; x < 640; x++) {
          const h = fn(x), top = Math.round(h), sl = fn(x + 1) - fn(x - 1);
          R(x, top, 1, 180 - top, col);
          if (snow && h < base - 9) { const dep = (base - 9 - h) * 0.6 + 1; for (let y = 0; y < dep; y++) if (dz(x, top + y, 1 - y / dep) && (sl > -0.6 || y < 1)) px(x, top + y, snow); }
          if (sl > 0.25) { px(x, top, rim); if (sl > 0.7 && dz(x, top + 1, 0.6)) px(x, top + 1, rim); if (sl > 1.3 && dz(x, top + 2, 0.3)) px(x, top + 2, rim); }
          else if (sl > -0.15 && (x & 1)) px(x, top, rim);
        }
      }
    });
  }
  // tiered pine: each tier is a flared skirt whose narrow top hides inside the tier above (classic notched silhouette)
  function pineT(cx, base, h, c, rim, slope, seed) {
    const nt = Math.max(2, Math.round(h / 9)), top = base - h, trunkH = Math.max(2, Math.round(h * 0.07));
    const body = h - trunkH;
    for (const ox of [-640, 0, 640]) {
      const X0 = cx + ox; if (X0 < -60 || X0 > 700) continue;
      R(X0, base - trunkH - 1, 1, trunkH + 1, c); if (h > 40) R(X0 - 1, base - trunkH, 3, trunkH, c);
      for (let i = 0; i < nt; i++) {
        const ty = top + Math.round(i / nt * body * 0.94) - (i ? 1 : 0), by = top + Math.round((i + 1) / nt * body);
        const wmax = (1.1 + i) / nt * h * slope;
        for (let y = ty; y <= by; y++) {
          const t = (y - ty) / Math.max(1, by - ty);
          let hw = Math.round(wmax * (i === 0 ? t : 0.3 + 0.7 * t));
          const jl = hash(seed * 7 + y, 3) < 0.22 ? 1 : 0, jr = hash(seed * 7 + y, 5) < 0.22 ? 1 : 0;
          const xl = X0 - hw + jl, xr = X0 + hw - jr;
          R(xl, y, xr - xl + 1, 1, c);
          if (rim >= 0 && t > 0.25 && hw > 0 && hash(seed, y) < 0.8) px(xr, y, rim);
        }
        const hw = Math.round(wmax);
        if (hw > 2) { px(X0 - hw, by + 1, c); px(X0 + hw, by + 1, rim >= 0 ? rim : c); if (hw > 5) { px(X0 - hw + 1, by + 1, c); px(X0 + hw - 1, by + 1, c); } }
      }
    }
  }
  function fogBand(P, y0, y1, dens, s) {
    const mid = (y0 + y1) / 2, half = (y1 - y0) / 2 + 0.5;
    for (let y = y0; y <= y1; y++) {
      const k = 1 - Math.abs(y - mid) / half;
      for (let x = 0; x < 640; x++) {
        const v = (pnoise(x / 20, y / 3 + s, 32) * (0.35 + 0.65 * k) - (1 - dens)) * 4;
        if (v > 0 && dz(x, y, v)) px(x, y, v > 1.3 && dz(x, y, v - 1.3) ? P.fogB : P.fogA);
      }
    }
  }
  function farL(T) {
    const P = TH[T], r = rng(P.seed + 5);
    return paint(640, 180, () => {
      for (let x = 0; x < 640; x += 3 + Math.floor(r() * 4)) pineT(x, 148, 7 + Math.floor(r() * 8 + 3 * Math.sin(TAU * x / 320)), P.far2, -1, 0.34, x + 1);
      R(0, 146, 640, 34, P.far2);
      fogBand(P, 132, 146, 0.5, P.seed);
      for (let x = 0; x < 640; x += 4 + Math.floor(r() * 5)) pineT(x, 160, 12 + Math.floor(r() * 12 + 4 * Math.sin(TAU * x / 213 + 1)), P.far, -1, 0.32, x + 9);
      R(0, 158, 640, 22, P.far);
      fogBand(P, 150, 164, 0.46, P.seed + 3);
    });
  }
  function midL(T) {
    const P = TH[T], r = rng(P.seed + 9);
    return paint(640, 180, () => {
      const groups = 5;
      for (let gI = 0; gI < groups; gI++) {
        const gx = Math.round(gI * 640 / groups + r() * 40), n = 2 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) { const x = gx + Math.round((k - n / 2) * (9 + r() * 8)), h = 34 + Math.floor(r() * 52); pineT(x, 180, h, P.mid, P.midRim, 0.26, x * 3 + 7); }
      }
      for (let k = 0; k < 14; k++) { const x = Math.floor(r() * 640), h = 18 + Math.floor(r() * 16); pineT(x, 180, h, P.mid, P.midRim, 0.3, x * 5 + 1); }
      // bushes
      for (let x = 0; x < 640; x += 7 + Math.floor(r() * 9)) {
        const rad = 4 + r() * 6, cy = 176 - r() * 3;
        for (const ox of [-640, 0, 640]) for (let y = -Math.ceil(rad); y <= 0; y++) for (let xx = -Math.ceil(rad * 1.3); xx <= Math.ceil(rad * 1.3); xx++) {
          if ((xx / 1.3) ** 2 + y * y > rad * rad) continue;
          const X0 = x + xx + ox; if (X0 < 0 || X0 >= 640) continue;
          const edge = (xx / 1.3) ** 2 + y * y > (rad - 1.2) ** 2;
          px(X0, Math.round(cy + y), edge && xx > 0 && y < -1 && hash(X0, y) < 0.6 ? P.midRim : P.mid2);
        }
      }
      R(0, 176, 640, 4, P.mid2);
    });
  }
  for (const T of ['town', 'grove', 'deep', 'glade']) { png('sky_' + T, skyL(T)); png('mtn_' + T, mtnL(T)); png('far_' + T, farL(T)); png('mid_' + T, midL(T)); }

  // ================================================================== PROPS
  function thatch(G, cx, top, bot, hw0, slope, s) {
    for (let y = top; y <= bot; y++) {
      const hw = Math.round(hw0 + (y - top) * slope - (y === top ? 3 : y === top + 1 ? 1 : 0)), layer = Math.floor((y - top) / 5), j = (y - top) % 5;
      for (let x = cx - hw; x <= cx + hw; x++) {
        const nx = (x - cx) / Math.max(hw, 1);
        if (y >= bot - 1 && hash(x, s + 1) < (y === bot ? 0.55 : 0.2)) continue;
        let c = C.straw;
        if (j === 4) c = C.burlapD; else if (j === 3) c = C.burlap;
        if (j < 3 && (x + layer * 2) % 3 === 0) c = C.burlap;
        if (j === 0 && hash(x, y + s) < 0.5) c = C.strawL;
        if (nx < -0.6 && j < 2 && c === C.straw) c = C.strawL;
        if (nx > 0.5) c = c === C.strawL ? C.straw : c === C.straw ? C.burlap : C.burlapD;
        G.p(x, y, c);
      }
    }
    for (let x = cx - hw0 - Math.round((bot - top) * slope); x <= cx + hw0 + Math.round((bot - top) * slope); x++) if (hash(x, s + 9) < 0.3) G.under(x, bot + 1, C.burlapD);
  }
  function planks(G, x0, y0, w, h, s) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const k = (x - x0) % 5;
      let c = k === 0 ? C.dirt : k === 1 ? C.woodL : C.wood;
      if (k > 1 && hash(x * 3 + s, y) < 0.05) c = C.dirt;
      if (x - x0 > w * 0.78 && c === C.woodL) c = C.wood; else if (x - x0 > w * 0.86 && c === C.wood && k === 3) c = C.dirt;
      G.p(x, y, c);
    }
  }
  function stones(G, x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor((y - y0) / 3), off = row & 1 ? 3 : 0, k = (x - x0 + off) % 6, j = (y - y0) % 3;
      G.p(x, y, k === 0 || j === 2 ? C.rock2 : j === 0 && k < 4 ? C.rock0 : C.rock1);
    }
  }
  function litWindow(G, x0, y0, w, h) {
    G.r(x0 - 1, y0 - 1, w + 2, h + 2, C.woodL);
    G.r(x0, y0, w, h, (i, j) => (j >= h - 2 || i === 0 ? C.fireO : dz(x0 + i, y0 + j, j / h) ? C.fireY : C.fireO));
    const mx = x0 + (w >> 1), my = y0 + (h >> 1);
    G.r(mx, y0, 1, h, C.wood); G.r(x0, my, w, 1, C.wood);
    G.r(x0 - 2, y0 + h + 1, w + 4, 1, C.wood); G.r(x0 - 2, y0 + h + 2, w + 4, 1, C.dirt);
  }
  { // prop_hut 72x60
    const G = GX(72, 60);
    stones(G, 9, 53, 54, 6);
    planks(G, 10, 28, 52, 25, 1);
    G.r(10, 28, 52, 2, C.dirt); G.r(10, 44, 52, 1, C.dirt); G.r(10, 28, 2, 25, C.woodL); G.r(60, 28, 2, 25, C.dirt);
    litWindow(G, 16, 35, 12, 9);
    for (let x = 15; x < 30; x++) if (hash(x, 5) < 0.5) G.p(x, 45, hash(x, 6) < 0.3 ? C.crim1 : C.grassL);
    // door
    G.r(37, 37, 12, 21, C.woodL);
    G.r(38, 38, 10, 20, (i, j) => (i % 3 === 0 ? C.dirtD : C.dirt));
    G.p(38, 38, C.woodL); G.p(47, 38, C.woodL); G.p(37, 37, -1); G.p(48, 37, -1);
    G.r(38, 39, 1, 19, C.fireO); G.p(45, 48, C.gold); G.p(45, 49, C.goldD);
    G.r(36, 58, 14, 1, C.rock1); G.r(37, 57, 12, 1, C.rock0);
    // eave shadow + roof
    G.r(10, 29, 52, 3, C.dirtD);
    thatch(G, 36, 5, 31, 9, 0.98, 3);
    G.r(33, 3, 7, 3, (i, j) => (j === 0 ? C.burlap : C.burlapD)); G.p(33, 3, -1); G.p(39, 3, -1);
    G.outline();
    png('prop_hut', G.toCanvas(false));
  }
  { // prop_hut2 64x56: gable with chimney
    const G = GX(64, 56);
    stones(G, 46, 4, 7, 20); G.r(45, 2, 9, 2, (i, j) => (j === 0 ? C.rock0 : C.rock1));
    stones(G, 8, 38, 48, 17); planks(G, 8, 27, 48, 11, 2);
    G.r(8, 27, 48, 1, C.dirt); G.r(8, 37, 48, 1, C.dirt);
    // door + window
    G.r(13, 36, 10, 19, C.woodL); G.r(14, 37, 8, 18, (i) => (i % 3 === 0 ? C.dirtD : C.dirt)); G.p(13, 36, -1); G.p(22, 36, -1); G.p(20, 46, C.gold);
    G.r(14, 37, 1, 18, C.fireO);
    litWindow(G, 33, 34, 12, 8);
    // roof: A-frame with shingles, gable front
    for (let y = 4; y <= 31; y++) {
      const hw = Math.round((y - 4) * 1.12) + 1;
      for (let x = 32 - hw; x <= 31 + hw; x++) {
        const inner = hw - 6;
        if (y > 12 && Math.abs(x - 31.5) < inner && y < 30) { G.p(x, y, (x % 4 === 0) ? C.dirt : (x % 4 === 1) ? C.woodL : C.wood); continue; }
        const j = (y + (x & 1) * 0) % 3, row = Math.floor(y / 3);
        let c = j === 2 ? C.redD : ((x + row * 2) % 4 === 0 ? C.robeR2 : C.red);
        if (x < 32 && j === 0) c = C.robeR1;
        G.p(x, y, c);
      }
    }
    G.r(8, 30, 48, 2, C.dirtD);
    // round gable window
    G.e(31.5, 20, 4.5, 4.5, C.woodL); G.e(31.5, 20, 3.4, 3.4, (dx, dy) => (dy > 0.3 ? C.fireO : C.fireY)); G.r(31, 16, 1, 8, C.wood); G.r(28, 20, 8, 1, C.wood);
    G.outline();
    png('prop_hut2', G.toCanvas(false));
  }
  { // prop_stall 56x44
    const G = GX(56, 44);
    G.r(5, 14, 46, 12, C.dirtD);
    for (const x of [4, 50]) { G.r(x, 8, 2, 35, C.wood); G.r(x, 8, 1, 35, C.woodL); }
    // awning
    for (let y = 2; y <= 12; y++) {
      const hw = 25 + Math.round((y - 2) * 0.3);
      for (let x = 28 - hw; x <= 27 + hw; x++) {
        const st = Math.floor((x - 2 + 40) / 5) & 1, lx = (x - 2 + 40) % 5;
        if (y >= 10) { const d = Math.abs(lx - 2); if (y - 10 > 2 - d * 0.9) continue; }
        let c = st ? C.robeW0 : C.crim2;
        if (y >= 8) c = st ? C.robeW1 : C.crim3;
        if (y === 2) c = st ? C.robeW1 : C.crim3;
        G.p(x, y, c);
      }
    }
    G.r(2, 1, 52, 1, C.wood);
    // counter
    G.r(1, 25, 54, 18, (i, j) => (j < 2 ? (j === 0 ? C.strawL : C.woodL) : (i % 6 === 0 ? C.dirt : j > 14 ? C.dirt : C.wood)));
    G.r(1, 30, 54, 1, C.dirt);
    // goods
    const flask = (x, c1, c2, tall) => { const y = 24; G.e(x + 1.5, y - 2, 2, 2.2, (dx, dy) => (dx < -0.3 && dy < 0 ? c1 : c2)); G.r(x + 1, y - 5 - tall, 2, 2 + tall, C.steel); G.r(x + 1, y - 6 - tall, 2, 1, C.burlap); G.p(x, y - 3, 35); };
    flask(9, C.crim1, C.crim2, 0); flask(15, C.ice1, C.ice3, 1); flask(21, C.crim1, C.crim2, 1); flask(28, C.holy1, C.gold, 0); flask(34, C.ice1, C.ice3, 0);
    G.r(40, 20, 9, 5, (i, j) => (j === 0 ? C.burlap : C.burlapD)); for (const [ax, ay] of [[41, 19], [43, 18], [45, 19], [47, 19], [44, 20]]) { G.p(ax, ay, C.crim1); G.p(ax + 1, ay, C.crim2); }
    G.r(18, 32, 20, 6, C.woodL); G.r(19, 33, 18, 4, C.strawL); for (let x = 21; x < 35; x += 2) G.p(x, 35, C.dirt);
    G.outline();
    png('prop_stall', G.toCanvas(false));
  }
  { // prop_fence 16x10 (tileable: rails run to both edges, ink drawn by hand)
    const c = paint(16, 10, () => {
      for (const ry of [2, 6]) { R(0, ry, 16, 1, 0); R(0, ry + 1, 16, 1, C.woodL); R(0, ry + 2, 16, 1, C.wood); R(0, ry + 3, 16, 1, 0); }
      R(5, 1, 1, 9, 0); R(9, 1, 1, 9, 0); R(6, 0, 3, 1, 0); R(6, 1, 1, 9, C.woodL); R(7, 1, 2, 9, C.wood); R(8, 2, 1, 8, C.dirt); px(7, 0, C.woodL);
      R(0, 9, 16, 1, 0); R(5, 9, 5, 1, 0);
    });
    // bottom row: only the post touches ground
    const x2 = c.getContext('2d'); x2.clearRect(0, 9, 5, 1); x2.clearRect(10, 9, 6, 1);
    use(x2); R(6, 9, 3, 1, C.dirt); px(5, 9, 0); px(9, 9, 0); use(g);
    png('prop_fence', c);
  }
  { // prop_sign 14x16
    const G = GX(14, 16);
    G.r(6, 8, 2, 7, (i) => (i ? C.wood : C.woodL));
    G.r(1, 2, 12, 6, (i, j) => (j === 0 ? C.woodL : j === 5 ? C.dirt : C.wood));
    G.ln(3, 4, 9, 4, C.dirtD); G.ln(8, 3, 10, 4, C.dirtD); G.p(8, 5, C.dirtD); G.p(9, 5, C.dirtD);
    G.p(2, 3, C.armor1); G.p(11, 3, C.armor1);
    G.p(5, 15, C.grass); G.p(8, 15, C.grassL); G.p(9, 14, C.grass);
    G.outline(); png('prop_sign', G.toCanvas(false));
  }
  function bushG(w, h, seed, berries) {
    const G = GX(w, h), r = rng(seed), bl = h - 2;
    const blobs = [];
    for (let k = 0; k < 5; k++) blobs.push([2 + (w - 4) * (k + 0.5) / 5 + (r() - 0.5) * 3, bl - (h - 4) * (0.35 + 0.35 * Math.sin(k / 4 * Math.PI)) + 1, 3 + r() * 2.5]);
    for (const [bx, by, rad] of blobs) G.e(bx, by, rad * 1.1, rad, (dx, dy, x, y) => (dx + dy < -0.7 ? C.grassL : dx + dy < 0.1 || dz(x, y, 0.5 - dy * 0.4) ? C.grass : C.grassD));
    for (let x = 1; x < w - 1; x++) for (let y = bl - 2; y <= bl; y++) if (G.get(x, y) < 0 && x > 2 && x < w - 3) G.p(x, y, C.grassD);
    for (let x = 0; x < w; x++) if (G.get(x, bl + 1) >= 0) G.set(x, bl + 1, -1);
    if (berries) for (let k = 0; k < 4; k++) { const x = Math.floor(3 + r() * (w - 6)), y = Math.floor(bl - 2 - r() * (h - 6)); if (G.get(x, y) >= 0) { G.p(x, y, C.crim1); G.p(x + 1, y + 1, C.crim3); } }
    for (let x = 0; x < w; x++) if (G.get(x, bl) >= 0 && G.get(x, bl - 1) >= 0 && hash(x, seed) < 0.5) G.p(x, bl - 1, C.leafL * 0 + C.grassD);
    G.outline(); return G;
  }
  png('prop_bush', bushG(22, 14, 5, true).toCanvas(false));
  { // prop_rock 16x10
    const G = GX(16, 10);
    G.e(8, 8, 7, 7, (dx, dy, x, y) => (y > 8 ? undefined : dx + dy < -0.8 ? C.rock0 : dx + dy < 0.35 || dz(x, y, 0.4) ? C.rock1 : C.rock2));
    G.e(5, 4, 3, 1.6, (dx, dy, x, y) => (y < 4 && G.get(x, y) >= 0 ? (dx < 0 ? C.grassL : C.grass) : undefined));
    G.p(10, 5, C.rock2); G.p(11, 6, C.rock2); G.p(9, 4, C.rock0);
    G.outline(); png('prop_rock', G.toCanvas(false));
  }
  { // prop_stump 16x12
    const G = GX(16, 12);
    G.r(3, 4, 10, 6, (i, j, x) => (i === 0 ? C.woodL : i >= 8 ? C.dirt : (x % 3 === 0 ? C.barkD : C.wood)));
    G.r(1, 9, 3, 1, C.wood); G.r(12, 9, 3, 1, C.dirt); G.p(2, 8, C.wood); G.p(13, 8, C.dirt);
    G.e(7.5, 3.5, 5, 1.8, (dx, dy) => { const d = Math.hypot(dx, dy); return d > 0.8 ? C.woodL : d > 0.55 ? C.straw : d > 0.3 ? C.strawL : C.burlap; });
    G.p(11, 1, C.grassL); G.p(11, 0, C.grass); G.p(12, 1, C.grass);
    G.outline(); png('prop_stump', G.toCanvas(false));
  }
  function shroomSmall(G, x, base, h, rx, c1, c2, c3) {
    G.r(x - 1, base - h + 1, 2, h, (i) => (i ? C.robeW1 : C.robeW0));
    const cy = base - h + 1;
    G.e(x - 0.5, cy, rx, rx * 0.8, (dx, dy, xx, yy) => (yy > cy ? undefined : dx + dy < -0.6 ? c1 : dy > -0.2 && dx > 0.2 ? c3 : c2));
    G.r(x - Math.round(rx) + 1, cy, Math.round(rx * 2) - 1, 1, c3);
    G.p(x - 2, cy - 2, C.robeW0); if (rx > 3) G.p(x + 1, cy - 2, C.robeW0);
  }
  { const G = GX(18, 12); shroomSmall(G, 6, 10, 6, 4.2, C.crim1, C.crim2, C.crim3); shroomSmall(G, 12, 10, 4, 3.2, C.cap1, C.cap2, C.cap3); shroomSmall(G, 15, 10, 2, 2.2, C.crim1, C.crim2, C.crim3);
    for (const x of [2, 3, 9, 10, 16]) G.p(x, 10, C.grass); G.p(3, 9, C.grassL); G.p(9, 9, C.grassL);
    G.outline(); png('prop_shrooms', G.toCanvas(false)); }
  { // prop_pine_fg 40x120
    const G = GX(40, 120), cx = 20;
    G.r(cx - 2, 104, 4, 15, (i) => (i === 3 ? C.tree2 : C.tree4));
    const nt = 9;
    for (let t = 0; t < nt; t++) {
      const yt = 2 + t * 11.5, hh = 16 + t * 0.6, wmax = 4 + t * 1.9;
      for (let dy = 0; dy < hh; dy++) {
        const y = Math.round(yt + dy), tp = dy / hh, hw = Math.round(wmax * (0.2 + 0.8 * tp) + (t === 0 && dy < 3 ? -2 : 0));
        for (let x = cx - hw; x <= cx + hw; x++) G.p(x, y, x >= cx + hw - 1 && tp > 0.3 && hash(x, y) < 0.7 ? C.tree2 : C.tree4);
      }
      // drooping tips
      const yb = Math.round(yt + hh), hw = Math.round(wmax);
      G.p(cx - hw - 1, yb - 1, C.tree4); G.p(cx - hw - 1, yb, C.tree4); G.p(cx + hw + 1, yb - 1, C.tree2); G.p(cx + hw + 1, yb, C.tree4);
      for (let x = cx - hw; x <= cx + hw; x++) if (hash(x, t) < 0.35) G.p(x, yb, C.tree4);
    }
    for (let y = 0; y < 120; y++) for (let x = 0; x < 40; x++) if (G.get(x, y) === C.tree4 && x < cx - 2 && hash(x * 3, y) < 0.06) G.set(x, y, C.tree3);
    for (let x = cx - 5; x <= cx + 5; x++) G.p(x, 118, C.tree4);
    G.outline(); png('prop_pine_fg', G.toCanvas(false));
  }
  { // prop_crystal 18x26
    const G = GX(18, 26);
    const prism = (cx, base, h, hw, lean) => {
      for (let y = 0; y < h; y++) {
        const yy = base - y, t = y / h, w = t > 0.75 ? Math.round(hw * (1 - (t - 0.75) / 0.25)) : hw, ox = Math.round(lean * y);
        for (let x = -w; x <= w; x++) G.p(cx + x + ox, yy, x < -w / 3 ? C.vio1 : x < w / 3 ? (t > 0.75 ? C.vio0 : C.vio2) : C.vio3);
      }
    };
    prism(5, 23, 12, 2, -0.18); prism(13, 23, 10, 2, 0.2); prism(9, 23, 21, 3, 0);
    G.r(7, 5, 1, 12, C.vio0); G.p(8, 8, C.cry0); G.p(4, 15, C.vio0); G.p(12, 16, C.vio0);
    G.r(2, 23, 14, 2, (i, j) => (j ? C.rock2 : C.rock1)); G.p(3, 22, C.rock1); G.p(15, 22, C.rock1);
    G.outline();
    G.p(1, 6, C.vio1); G.p(16, 9, C.vio0); G.p(15, 3, C.vio1); G.p(2, 14, C.vio0);
    png('prop_crystal', G.toCanvas(false));
  }
  { // prop_lamp: 2 frames of 10x28, pivot bottom centre
    const fr = [];
    for (let f = 0; f < 2; f++) {
      const G = GX(10, 28);
      G.r(3, 25, 4, 2, (i, j) => (j ? C.armor3 : C.armor2)); G.r(4, 9, 2, 16, (i) => (i ? C.armor3 : C.armor2));
      G.r(2, 9, 6, 1, C.armor3);
      G.r(3, 3, 4, 6, (i, j) => (f === 0 ? (j < 4 && i > 0 && i < 3 ? C.fireY : C.fireO) : (j < 3 && i === 1 ? C.fireY : j > 4 ? C.fireR : C.fireO)));
      G.r(2, 2, 6, 1, C.navy); G.r(3, 1, 4, 1, C.navy); G.p(4, 0, C.goldD); G.p(5, 0, C.goldD);
      G.p(2, 3, C.goldD); G.p(7, 3, C.goldD); G.p(2, 8, C.goldD); G.p(7, 8, C.goldD);
      G.r(2, 4, 1, 4, C.goldD); G.r(7, 4, 1, 4, C.goldD);
      G.outline();
      fr.push(G.toCanvas(false));
    }
    sheetOf('prop_lamp', 10, 28, 2, fr, { px: 5, py: 27, anims: { flicker: { fps: 6, loop: true, frames: [0, 1] } } });
  }

  // ================================================================== PORTAL
  {
    const fr = [], cx = 12, cy = 21, rx = 8.5, ry = 15;
    for (let f = 0; f < 8; f++) {
      const G = GX(24, 40), phs = f / 8 * TAU;
      // ground glow
      for (let y = 35; y <= 39; y++) for (let x = 0; x < 24; x++) {
        const d = Math.hypot((x - cx + 0.5) / 11, (y - 37.5) / 2.2);
        if (d < 1 && dz(x, y + f, 1 - d)) G.p(x, y, d < 0.45 ? C.ice1 : d < 0.75 ? C.ice2 : C.vio2);
      }
      for (let y = 0; y < 40; y++) for (let x = 0; x < 24; x++) {
        const dx = (x - cx + 0.5) / rx, dy = (y - cy) / ry, d = Math.hypot(dx, dy);
        if (d > 1) continue;
        const a = Math.atan2(dy, dx), v = Math.sin(3 * a + 9 * d - phs);
        let c;
        if (d > 0.86) c = Math.sin(a * 5 + phs * 2) > 0.2 ? C.ice0 : C.ice1;
        else if (d > 0.74) c = v > 0 ? C.ice2 : C.vio1;
        else if (d < 0.2) c = d < 0.1 ? 35 : C.vio0;
        else if (v > 0.45) c = d < 0.45 ? C.vio0 : C.vio1;
        else if (v > -0.2) c = d < 0.5 ? C.vio1 : C.vio2;
        else c = d < 0.45 ? C.vio3 : C.vio4;
        G.p(x, y, c);
      }
      // outer dark halo ring
      for (let y = 0; y < 40; y++) for (let x = 0; x < 24; x++) {
        const d = Math.hypot((x - cx + 0.5) / (rx + 1.2), (y - cy) / (ry + 1.2));
        if (d <= 1 && G.get(x, y) < 0) G.p(x, y, C.vio3);
      }
      // orbiting sparkles
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * TAU + phs * 0.25 * (k & 1 ? 1 : -1) * 4 / 5 * 2.5, rr2 = 1.18;
        const sx = Math.round(cx - 0.5 + Math.cos(a) * rx * rr2), sy = Math.round(cy + Math.sin(a) * ry * rr2);
        const big = (k + f) % 3 === 0;
        G.p(sx, sy, 35);
        if (big) { G.p(sx - 1, sy, C.ice1); G.p(sx + 1, sy, C.ice1); G.p(sx, sy - 1, C.ice1); G.p(sx, sy + 1, C.ice1); }
      }
      for (let k = 0; k < 3; k++) { const t = ((f / 8) + k / 3) % 1, sx = Math.round(cx - 6 + k * 5 + Math.sin(t * TAU + k) * 1.5), sy = Math.round(36 - t * 34); G.p(sx, sy, t < 0.7 ? C.ice0 : C.vio1); }
      fr.push(G.toCanvas(false));
    }
    sheetOf('portal', 24, 40, 8, fr, { px: 12, py: 39, anims: { loop: { fps: 12, loop: true, frames: [0, 1, 2, 3, 4, 5, 6, 7] } } });
  }

  // ================================================================== NPCs
  const shadeLR = (L, M, D, kl, kr) => (dx) => (dx < (kl || -0.5) ? L : dx > (kr || 0.45) ? D : M);
  function elder(o) {
    const G = GX(24, 32), b = o.b || 0, cx = 11.5;
    // shoes
    G.r(7, 29, 4, 2, (i, j) => (j ? C.dirtD : C.dirt)); G.r(13, 29, 4, 2, (i, j) => (j ? C.dirtD : C.dirt));
    // robe
    for (let y = 17 + b; y <= 29; y++) {
      const hw = 3.6 + (y - 17 - b) * 0.32;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const nx = (x - cx) / hw;
        let c = nx < -0.5 ? C.cloakL : nx > 0.45 ? C.cloakD : C.cloak;
        if (y === 29) c = C.cloakD; if (y === 28) c = nx > 0.5 ? C.goldD : C.gold;
        G.p(x, y, c);
      }
    }
    G.r(8, 23, 8, 1, C.burlapD); G.p(10, 24, C.burlap); G.p(10, 25, C.burlapD);
    // staff + lantern
    const sx = 19;
    G.r(sx, 4, 1, 27, (i, j) => (j % 5 === 2 ? C.dirt : C.wood)); G.p(sx, 30, C.dirt);
    G.p(sx, 3, C.woodL); G.p(sx + 1, 2, C.woodL); G.p(sx + 2, 2, C.wood); G.p(sx + 3, 3, C.wood);
    const lw = o.sway || 0;
    G.p(sx + 3 + lw, 4, C.goldD);
    G.r(sx + 2 + lw, 5, 3, 1, C.navy); G.r(sx + 2 + lw, 6, 3, 3, (i, j) => (o.fl ? (j === 1 && i === 1 ? C.fireY : C.fireO) : (i === 1 || j === 0 ? C.fireY : C.fireO))); G.r(sx + 2 + lw, 9, 3, 1, C.navy);
    // arm holding staff
    G.r(15, 18 + b, 3, 4, (i, j) => (i === 2 || j === 3 ? C.cloakD : C.cloak)); G.r(18, 19 + b, 1, 2, C.skin); G.p(18, 21 + b, C.skinD);
    // beard
    for (let y = 14; y <= 25; y++) {
      const t = (y - 14) / 11, hw = 4.2 * (1 - t * 0.8), bx = 13.2 + t * 1.2 + (o.bs && y > 20 ? o.bs : 0);
      for (let x = Math.round(bx - hw); x <= Math.round(bx + hw); x++) {
        const nx = (x - bx) / Math.max(hw, 0.5);
        G.p(x, y + b, nx > 0.5 ? C.robeW2 : (nx < -0.4 && (y & 1)) ? C.hair1 : C.hair0);
      }
    }
    // head
    G.e(12.5, 11.5 + b, 4.6, 4.1, (dx, dy) => (dx > 0.55 || dy > 0.6 ? C.skinD : C.skin));
    G.r(8, 11 + b, 2, 4, (i, j) => (i ? C.hair1 : C.hair0)); G.p(8, 15 + b, C.hair1);
    G.p(17, 12 + b, C.skin); G.p(17, 13 + b, C.skinD); G.p(18, 12 + b, C.skinD);
    G.r(13, 10 + b, 4, 1, C.hair0); G.p(17, 11 + b, C.hair1); G.p(12, 10 + b, C.hair1);
    G.p(14, 12 + b, 0); G.p(15, 12 + b, 0);
    G.r(13, 14 + b, 5, 1, C.hair0); G.p(18, 14 + b, C.hair1);
    if (o.talk) { G.p(15, 15 + b, C.crim4); G.p(16, 15 + b, C.crim4); }
    // hat: brim + cone bending back
    G.r(7, 8 + b, 12, 1, C.cloakD); G.r(8, 7 + b, 10, 1, C.goldD); G.r(9, 7 + b, 8, 1, C.gold);
    for (let y = 0; y < 7; y++) {
      const t = y / 6, hw = 4.5 * t + 0.4, hx = 12.5 - (1 - t) * (1 - t) * 6.5;
      for (let x = Math.round(hx - hw); x <= Math.round(hx + hw); x++) G.p(x, y + b, x < hx - hw * 0.3 ? C.cloakL : x > hx + hw * 0.5 ? C.cloakD : C.cloak);
    }
    G.p(5, 1 + b, C.cloak); G.p(4, 2 + b, C.cloak);
    G.p(13, 4 + b, C.holy1);
    G.outline();
    return G;
  }
  function merchant(o) {
    const G = GX(24, 32), b = o.b || 0, cx = 11.5;
    G.r(8, 29, 3, 2, (i, j) => (j ? C.dirtD : C.dirt)); G.r(13, 29, 3, 2, (i, j) => (j ? C.dirtD : C.dirt));
    // skirt + bodice
    for (let y = 17 + b; y <= 28; y++) {
      const hw = y < 21 + b ? 3.6 : 3.6 + (y - 21 - b) * 0.55;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const nx = (x - cx) / hw;
        G.p(x, y, y === 28 ? C.robeB3 : nx < -0.5 ? C.robeB0 : nx > 0.45 ? C.robeB2 : C.robeB1);
      }
    }
    // apron
    for (let y = 19 + b; y <= 27; y++) { const hw = 1.8 + (y - 19 - b) * 0.3; for (let x = Math.round(12.5 - hw); x <= Math.round(12.5 + hw); x++) G.p(x, y, x > 12.5 + hw * 0.4 || y === 27 ? C.robeW1 : C.robeW0); }
    G.r(9, 21 + b, 7, 1, C.robeW1); G.p(13, 17 + b, C.robeW0); G.p(13, 18 + b, C.robeW0);
    // braid
    G.r(6, 11 + b, 2, 7, (i, j) => (j % 2 ? C.hairB : C.dirt)); G.p(6, 18 + b, C.crim2);
    // head
    G.e(12.5, 11.5 + b, 5, 4.5, (dx, dy) => (dx > 0.6 || dy > 0.65 ? C.skinD : C.skin));
    G.r(9, 9 + b, 8, 1, C.hairB); G.p(16, 10 + b, C.hairB); G.p(9, 10 + b, C.hairB); G.p(10, 10 + b, C.hairB);
    // eyes, blush, mouth
    for (const ex of [13, 16]) { G.p(ex, 11 + b, 0); G.p(ex, 12 + b, 0); }
    G.p(12, 13 + b, C.blush); G.p(17, 13 + b, C.blush);
    if (o.talk) { G.p(15, 14 + b, C.crim4); G.p(15, 15 + b, C.crim3); } else { G.p(14, 14 + b, C.skinD); G.p(15, 14 + b, C.crim3); }
    // headscarf
    for (let y = 4; y <= 9; y++) { const hw = [3, 4.5, 5.5, 5.8, 6, 6][y - 4]; for (let x = Math.round(12 - hw); x <= Math.round(12.5 + hw); x++) G.p(x, y + b, (x + y) % 4 === 0 && y > 4 ? C.robeW0 : x > 15 ? C.crim3 : C.crim2); }
    G.r(6, 8 + b, 2, 3, C.crim2); G.p(5, 10 + b, C.crim3); G.p(5, 11 + b, C.crim2); G.p(4, 12 + b, C.crim3);
    // arm + potion
    const pr = o.lift || 0;
    G.r(15, 18 + b, 3, 3, (i, j) => (i === 2 ? C.robeB2 : C.robeB1)); G.r(18, 18 + b - pr, 2, 2, C.skin);
    G.e(19.5, 15.5 + b - pr, 2, 2.2, (dx, dy) => (dx < -0.2 && dy < 0 ? C.crim1 : C.crim2)); G.p(18, 15 + b - pr, 35);
    G.r(19, 12 + b - pr, 2, 1, C.steel); G.r(19, 11 + b - pr, 2, 1, C.burlap);
    G.outline();
    return G;
  }
  for (const [name, fn] of [['npc_elder', elder], ['npc_merchant', merchant]]) {
    const idle = [{ b: 0 }, { b: 0, sway: 0, fl: 1 }, { b: 1, bs: 0 }, { b: 1, fl: 1 }];
    const talk = [{ b: 0, talk: 1, lift: 1, bs: 1 }, { b: 0, fl: 1 }];
    sheetOf(name, 24, 32, 6, idle.concat(talk).map(o => fn(o).toCanvas(false)), { px: 12, py: 31, anims: { idle: { fps: 5, loop: true, frames: [0, 1, 2, 3] }, talk: { fps: 6, loop: true, frames: [4, 5] } } });
  }
  // portraits 34x34
  function portrait(kind) {
    const G = GX(34, 34);
    if (kind === 'elder') {
      G.r(4, 27, 26, 7, (i, j, x) => (x < 12 ? C.cloakL : x > 24 ? C.cloakD : C.cloak));
      G.e(18, 17, 9, 8.5, (dx, dy) => (dx > 0.55 || dy > 0.6 ? C.skinD : C.skin));
      G.r(8, 14, 3, 10, (i) => (i ? C.hair1 : C.hair0));
      for (let y = 20; y <= 33; y++) { const t = (y - 20) / 13, hw = 9 * (1 - t * 0.55), bx = 19.5 + t * 1; for (let x = Math.round(bx - hw); x <= Math.round(bx + hw); x++) { const nx = (x - bx) / hw; G.p(x, y, nx > 0.55 ? C.robeW2 : (nx < -0.3 && (x + y) % 3 === 0) ? C.hair1 : C.hair0); } }
      G.r(14, 19, 12, 2, (i, j) => (j ? C.hair1 : C.hair0));
      G.e(26, 18, 2.5, 2.2, (dx, dy) => (dy > 0.3 ? C.skinD : C.skin)); G.p(25, 17, C.robeW0);
      G.r(16, 13, 5, 2, C.hair0); G.r(21, 13, 4, 2, C.hair0); G.p(21, 14, C.hair1); G.p(15, 14, C.hair1);
      G.p(16, 17, 0); G.p(17, 16, 0); G.p(18, 16, 0); G.p(19, 17, 0); G.p(22, 17, 0); G.p(23, 16, 0); G.p(24, 17, 0); G.p(15, 18, C.blush); G.p(16, 18, C.blush);
      G.r(8, 9, 20, 2, C.cloakD); G.r(9, 8, 18, 1, C.gold);
      for (let y = 0; y < 8; y++) { const t = y / 7, hw = 8.5 * t + 0.8, hx = 18 - (1 - t) * (1 - t) * 9; for (let x = Math.round(hx - hw); x <= Math.round(hx + hw); x++) G.p(x, y, x < hx - hw * 0.3 ? C.cloakL : x > hx + hw * 0.5 ? C.cloakD : C.cloak); }
      G.p(20, 4, C.holy1); G.p(19, 5, C.holy1); G.p(21, 5, C.holy1); G.p(20, 6, C.holy1);
    } else {
      G.r(5, 27, 25, 7, (i, j, x) => (x < 11 ? C.robeB0 : x > 24 ? C.robeB2 : C.robeB1)); G.r(13, 27, 9, 7, C.robeW0); G.r(13, 27, 2, 7, C.robeW1); G.r(20, 27, 2, 7, C.robeW1);
      G.r(6, 16, 3, 12, (i, j) => (j % 3 === 2 ? C.dirt : C.hairB));
      G.e(18, 17, 9, 9, (dx, dy) => (dx > 0.6 || dy > 0.7 ? C.skinD : C.skin));
      G.r(10, 10, 17, 3, C.hairB); G.r(10, 13, 3, 3, C.hairB); G.r(24, 13, 3, 2, C.hairB); G.p(14, 13, C.hairB); G.p(15, 13, C.hairB);
      for (const ex of [15, 22]) { G.r(ex, 16, 2, 4, 0); G.p(ex, 16, 35); G.p(ex + 1, 19, C.robeB1); }
      G.r(12, 21, 2, 1, C.blush); G.r(24, 21, 2, 1, C.blush);
      G.r(18, 23, 3, 1, C.crim3); G.p(17, 22, C.skinD); G.p(21, 22, C.skinD);
      for (let y = 1; y <= 12; y++) { const hw = Math.min(11, 4 + y * 1.6); for (let x = Math.round(18 - hw); x <= Math.round(18 + hw); x++) { if (y > 9 && x > 11 && x < 26) continue; G.p(x, y, (x * 2 + y * 3) % 7 === 0 ? C.robeW0 : x > 23 ? C.crim3 : C.crim2); } }
      G.r(4, 9, 4, 4, C.crim2); G.p(3, 12, C.crim3); G.p(3, 13, C.crim2); G.p(2, 14, C.crim3);
    }
    G.outline();
    const face = G.toCanvas(false);
    return paint(34, 34, (c) => {
      for (let y = 0; y < 34; y++) for (let x = 0; x < 34; x++) { const d = Math.hypot(x - 17, y - 14) / 22; px(x, y, dz(x, y, 1 - d) ? C.vio4 : C.vio5); }
      c.getContext('2d').drawImage(face, 0, 0);
      R(0, 0, 34, 1, 0); R(0, 33, 34, 1, 0); R(0, 0, 1, 34, 0); R(33, 0, 1, 34, 0);
      R(1, 1, 32, 1, C.gold); R(1, 1, 1, 32, C.gold); R(1, 32, 32, 1, C.goldD); R(32, 1, 1, 32, C.goldD);
      R(2, 2, 30, 1, 0); R(2, 31, 30, 1, 0); R(2, 2, 1, 30, 0); R(31, 2, 1, 30, 0);
      for (const [x, y] of [[1, 1], [32, 1], [1, 32], [32, 32]]) px(x, y, C.holy0);
    });
  }
  png('portrait_elder', portrait('elder')); png('portrait_merchant', portrait('merchant'));

  // ================================================================== MONSTERS
  function eyesOn(G, x, y, kind, big) {
    if (kind === 'x') { G.p(x - 1, y - 1, 0); G.p(x + 1, y - 1, 0); G.p(x, y, 0); G.p(x - 1, y + 1, 0); G.p(x + 1, y + 1, 0); return; }
    if (kind === 'hurt') { G.p(x - 1, y - 1, 0); G.p(x, y, 0); G.p(x - 1, y + 1, 0); return; }
    if (kind === 'hurtR') { G.p(x + 1, y - 1, 0); G.p(x, y, 0); G.p(x + 1, y + 1, 0); return; }
    if (big) { G.p(x, y, 35); G.p(x + 1, y, 0); G.p(x, y + 1, 0); G.p(x + 1, y + 1, 0); }
    else { G.p(x, y, 0); G.p(x, y + 1, 0); }
  }
  function capling(o) {
    const G = GX(24, 30), cx = 11.5, sq = o.sq || 1, base = 28 - (o.lift || 0), fo = 1;
    // feet
    if (!o.air) { G.r(7, base, 3, 1, C.robeW2); G.r(14, base, 3, 1, C.robeW2); }
    else { G.r(8, base - 1, 3, 1, C.robeW2); G.r(13, base - 1, 3, 1, C.robeW2); }
    const hb = Math.max(5, Math.round(10 * sq)), wb = Math.round(11 / Math.sqrt(sq)), bBot = base - 1, bTop = bBot - hb + 1, hw = wb / 2;
    for (let y = bTop; y <= bBot; y++) {
      const ins = y === bBot ? 1 : 0;
      for (let x = Math.round(cx - hw) + ins; x <= Math.round(cx + hw) - ins; x++) { const nx = (x - cx) / hw; G.p(x, y, nx < -0.7 ? C.slug0 : nx > 0.6 ? C.robeW1 : C.robeW0); }
    }
    // face
    const ey = bTop + Math.max(3, Math.round(hb * 0.36));
    if (o.eyes) { eyesOn(G, 10 + fo - 1, ey + 1, o.eyes === 'hurt' ? 'hurt' : o.eyes); eyesOn(G, 14 + fo, ey + 1, o.eyes === 'hurt' ? 'hurtR' : o.eyes); }
    else for (const ex of [9 + fo, 13 + fo]) { G.r(ex, ey, 2, 3, 0); G.p(ex, ey, 35); }
    G.p(8 + fo, ey + 3, C.blush); G.p(16 + fo, ey + 3, C.blush);
    if (o.mouth) { G.p(12 + fo - 1, ey + 3, C.crim4); G.p(12 + fo - 1, ey + 4, C.crim4); G.p(12 + fo, ey + 3, C.crim4); G.p(12 + fo, ey + 4, C.crim4); } else { G.p(11 + fo, ey + 3, 0); G.p(12 + fo, ey + 4, 0); G.p(13 + fo, ey + 3, 0); }
    // cap
    const rx = 10 / Math.sqrt(sq), ry = 7 * sq, ccy = bTop + 1;
    for (let y = -Math.ceil(ry); y <= 2; y++) for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      const e = (x * x) / (rx * rx) + (Math.min(y, 0) ** 2) / (ry * ry);
      if (e > 1) continue;
      if (y > 0 && Math.abs(x) > rx - 1 - y * 1.5) continue;
      let c = y >= 1 ? C.cap4 : y === 0 ? C.cap3 : C.cap2;
      const hx = x + rx * 0.4, hy = y + ry * 0.55;
      if (y < 0 && hx * hx / (rx * rx * 0.14) + hy * hy / (ry * ry * 0.12) < 1) c = C.cap1;
      if (y < 0 && hx * hx / (rx * rx * 0.03) + hy * hy / (ry * ry * 0.03) < 1) c = C.cap0;
      if (y < 0 && x > rx * 0.5 && e > 0.5) c = C.cap3;
      G.p(Math.round(cx + x - 0.5), ccy + y, c);
    }
    for (const [fx, fy, r] of [[-0.55, -0.45, 1.8], [0.15, -0.72, 1.5], [0.6, -0.35, 2.0], [-0.1, -0.25, 1.1]]) {
      const sx = cx - 0.5 + fx * rx, sy = ccy + fy * ry;
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { if (x * x + y * y > r * r) continue; const X0 = Math.round(sx + x), Y0 = Math.round(sy + y); const v = G.get(X0, Y0); if (v === C.cap2 || v === C.cap1 || v === C.cap3) G.set(X0, Y0, x + y > r * 0.5 ? C.robeW1 : C.robeW0); }
    }
    G.outline();
    return G;
  }
  function shellback(o) {
    const G = GX(28, 20), base = 18, hx = o.hx || 0, st = o.st || 0, sy = o.sy || 0, ret = o.ret || 0;
    // foot
    const fx0 = 4, fx1 = 21 + hx;
    for (let y = 14; y <= base; y++) {
      const ins = y === 14 ? 3 : y === 15 ? 1 : y === base ? 1 : 0;
      for (let x = fx0 + ins; x <= fx1 - ins + (y > 15 ? 1 : 0); x++) G.p(x, y, y === base ? C.skinD : y <= 15 ? C.slug0 : C.skin);
    }
    for (let x = fx0 + 2; x < fx1; x += 3) G.p(x, base, C.skin);
    // head + stalks
    const hcx = 21 + hx - ret, hcy = 12 + ret;
    if (!ret) {
      const s1 = [hcx - 1, hcy - 4, hcx - 2 + st, hcy - 9 + (o.sag || 0)], s2 = [hcx + 2, hcy - 3, hcx + 3 + st, hcy - 8 + (o.sag || 0)];
      for (const [a, b2, c2, d2] of [s1, s2]) { G.ln(a, b2, c2, d2, C.skin); }
      for (const [, , ex, ey] of [s1, s2]) {
        if (o.eyes === 'x') { G.p(ex, ey - 1, 0); G.p(ex + 1, ey - 1, 0); G.p(ex, ey, 0); G.p(ex + 1, ey, 0); continue; }
        G.r(ex - 1, ey - 2, 3, 3, C.robeW0); G.p(ex + 1, ey - 1, 0); G.p(ex + 1, ey, 0); if (o.eyes === 'hurt') { G.r(ex - 1, ey - 1, 3, 1, 0); G.p(ex + 1, ey, C.robeW0); }
      }
    }
    G.e(hcx, hcy, 3.5, 4.5, (dx, dy) => (dx < -0.5 && dy < 0.2 ? C.slug0 : dx > 0.55 ? C.skinD : C.skin));
    if (!ret) { if (o.mouth) { G.p(hcx + 2, hcy + 1, C.crim4); G.p(hcx + 2, hcy + 2, C.crim4); } else { G.p(hcx + 1, hcy + 1, 0); G.p(hcx + 2, hcy + 2, 0); G.p(hcx + 3, hcy + 1, 0); } G.p(hcx - 1, hcy + 1, C.blush); }
    // shell
    const scx = 10 + (o.sx || 0), scy = 9 + sy, sr = 6.8;
    G.e(scx, scy, sr, sr, (dx, dy) => { const s = dx + dy; return s < -0.9 ? C.sh1 : s > 0.75 ? C.sh3 : C.sh2; });
    G.e(scx - 2.5, scy - 3, 1.6, 1, C.sh0);
    for (let t = 0; t < TAU * 1.7; t += 0.06) {
      const rr = 0.3 + t * 0.52, x = Math.round(scx + 0.3 + Math.cos(t + 2.2) * rr), y = Math.round(scy + 0.5 + Math.sin(t + 2.2) * rr);
      if (Math.hypot(x - scx, y - scy) < sr - 0.8) G.p(x, y, C.sh4);
    }
    for (let x = Math.round(scx - 5); x <= Math.round(scx + 5); x++) if (G.get(x, Math.round(scy + sr)) >= 0) G.p(x, Math.round(scy + sr), C.sh4);
    G.outline();
    return G;
  }
  function stumpy(o) {
    const G = GX(32, 32), sq = o.sq || 1, lean = o.lean || 0, base = 30, cx = 15.5 + lean;
    // root legs
    const legs = o.legs || [0, 0, 0, 0];
    for (const [side, lx, ll] of [[-1, legs[0], legs[1]], [1, legs[2], legs[3]]]) {
      const hx = cx + side * 4, fx = cx + side * 6 + lx, fy = base - ll;
      for (let k = 0; k < 3; k++) G.ln(hx + k - 1, base - 6, fx + k - 1, fy - 1, k === 0 ? C.woodL : k === 1 ? C.wood : C.dirt);
      G.r(Math.round(fx) - 2, fy, 5, 1, C.dirt); G.p(Math.round(fx) - 3, fy, C.wood); G.p(Math.round(fx) + 2 + side, fy, C.dirt);
    }
    // trunk
    const hT = Math.round(17 * sq), hw = Math.round(8.5 / Math.sqrt(sq)), y0 = base - 5 - hT;
    for (let y = y0; y <= base - 5; y++) for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const nx = (x - cx) / hw, gr = (x + Math.floor(hash(x, 3) * 2) + (y % 7 === 0 ? 1 : 0)) % 3 === 0;
      let c = nx < -0.75 ? C.woodL : nx > 0.7 ? C.dirt : gr ? C.dirt : C.wood;
      if (y === base - 5 && Math.abs(nx) > 0.6) continue;
      if (nx > 0.4 && gr) c = C.barkD;
      G.p(x, y, c);
    }
    // arms
    const aw = o.arm || 0;
    G.ln(cx + hw, y0 + 8, cx + hw + 3, y0 + 5 - aw, C.wood); G.ln(cx + hw + 1, y0 + 8, cx + hw + 4, y0 + 6 - aw, C.dirt);
    G.p(cx + hw + 4, y0 + 4 - aw, C.wood); G.p(cx + hw + 5, y0 + 6 - aw, C.wood);
    G.ln(cx - hw, y0 + 8, cx - hw - 3, y0 + 6 + aw, C.woodL); G.p(cx - hw - 4, y0 + 5 + aw, C.woodL); G.p(cx - hw - 3, y0 + 7 + aw, C.wood);
    // cut top with rings
    G.e(cx, y0, hw + 0.3, 2.6, (dx, dy) => { const d = Math.hypot(dx, dy); return d > 0.85 ? C.woodL : d > 0.65 ? C.straw : d > 0.4 ? C.strawL : d > 0.18 ? C.straw : C.burlapD; });
    for (const [tx, th] of [[-hw, 2], [-hw + 2, 1], [hw - 1, 2], [hw - 3, 1]]) for (let k = 1; k <= th; k++) G.p(Math.round(cx + tx), y0 - 1 - k + 1, tx < 0 ? C.woodL : C.wood);
    // leafy tuft
    const ls = o.leaf || 0;
    G.ln(cx - 1, y0 - 1, cx - 2 + ls, y0 - 5, C.grassD);
    G.e(cx - 5 + ls, y0 - 5, 2.5, 1.5, (dx) => (dx < 0 ? C.leafL : C.grassL)); G.e(cx + 1 + ls, y0 - 6, 2.5, 1.5, (dx) => (dx < 0 ? C.grassL : C.grass)); G.e(cx - 2 + ls, y0 - 8, 1.6, 2, (dx) => (dx < 0 ? C.leafL : C.grassL));
    // face (angry)
    const fx = Math.round(cx + 1), fy = y0 + 6;
    if (o.eyes === 'x') { eyesOn(G, fx - 4, fy + 1, 'x'); eyesOn(G, fx + 2, fy + 1, 'x'); }
    else if (o.eyes === 'hurt') { eyesOn(G, fx - 3, fy + 1, 'hurt'); eyesOn(G, fx + 2, fy + 1, 'hurtR'); }
    else {
      for (const [ex, inner] of [[fx - 5, 2], [fx + 1, 0]]) { G.r(ex, fy, 3, 2, C.robeW0); G.p(ex + inner, fy + 1, 0); G.p(ex + inner, fy, 0); }
      G.p(fx - 6, fy - 2, 0); G.p(fx - 5, fy - 2, 0); G.p(fx - 4, fy - 1, 0); G.p(fx - 3, fy - 1, 0);
      G.p(fx + 4, fy - 2, 0); G.p(fx + 3, fy - 2, 0); G.p(fx + 2, fy - 1, 0); G.p(fx + 1, fy - 1, 0);
    }
    const my = fy + 5;
    const mx = fx - 1;
    if (o.mouth === 'o') { G.r(mx - 1, my - 1, 3, 3, 0); G.p(mx, my, C.crim4); }
    else { G.r(mx - 2, my, 5, 1, 0); G.p(mx - 3, my + 1, 0); G.p(mx + 3, my + 1, 0); G.r(mx - 2, my + 1, 5, 1, C.robeW0); G.p(mx, my + 1, 0); G.r(mx - 2, my + 2, 5, 1, 0); }
    G.outline();
    return G;
  }
  function wisp(o) {
    const G = GX(20, 26), bob = o.bob || 0, ph = o.ph || 0, sq = o.sq || 1, cx = 9.5, cy = 16 + bob;
    const M = GX(20, 26);
    M.e(cx, cy, 5.6 / Math.sqrt(sq), 5.4 * sq, 1);
    const tongue = (bx, by, h, w, p) => { for (let y = 0; y < h; y++) { const t = y / h, hw = w * Math.pow(t, 0.8), ox = Math.sin(t * 3 + p) * (1 - t) * 1.6; for (let x = Math.round(bx + ox - hw); x <= Math.round(bx + ox + hw); x++) M.p(x, Math.round(by - h + y), 1); } };
    tongue(cx, cy, 14 * sq, 5, ph); tongue(cx - 3.5, cy - 1, 8 * sq, 2.5, ph + 2); tongue(cx + 3.8, cy - 1, 9 * sq, 2.5, ph + 4);
    for (let i = 0; i < M.a.length; i++) if (M.a[i] >= 0) G.a[i] = 1;
    depthShade(G, null, (d, x, y) => { const up = y < cy - 4; if (d === 1) return up ? C.vio3 : C.vio2; if (d === 2) return up ? C.vio2 : C.ice2; if (d === 3) return up ? C.vio1 : C.ice1; return up ? C.vio0 : (d > 4 ? 35 : C.ice0); });
    const fo = 1, ey = Math.round(cy - 1);
    if (o.eyes) { eyesOn(G, Math.round(cx) - 3 + fo, ey, o.eyes === 'hurt' ? 'hurt' : 'x'); eyesOn(G, Math.round(cx) + 2 + fo, ey, o.eyes === 'hurt' ? 'hurtR' : 'x'); }
    else { eyesOn(G, Math.round(cx) - 2 + fo, ey, 0); eyesOn(G, Math.round(cx) + 2 + fo, ey, 0); }
    const mx = Math.round(cx) + fo;
    if (o.mouth) { G.p(mx, ey + 3, C.vio4); G.p(mx, ey + 4, C.vio4); } else { G.p(mx - 1, ey + 3, C.vio3); G.p(mx, ey + 4, C.vio3); G.p(mx + 1, ey + 3, C.vio3); }
    G.p(Math.round(cx) - 4 + fo, ey + 2, C.vio1); G.p(Math.round(cx) + 4 + fo, ey + 2, C.vio1);
    G.outline();
    // loose embers
    const e1 = (ph * 2.3) % 6;
    G.under(3 + Math.round(e1 * 0.3), 12 - Math.round(e1) + bob, C.vio1); G.under(16 - Math.round(e1 * 0.2), 9 - Math.round(e1 * 0.7) + bob, C.ice1);
    return G;
  }
  function poofG(src, stage, cy) {
    const N = cloneG(src), r = rng(stage * 17 + 3);
    let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (src.get(x, y) >= 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const mx = (x0 + x1) / 2, my = cy !== undefined ? cy : (y0 + y1) / 2, sx = (x1 - x0) / 2 + stage * 2, syy = (y1 - y0) / 2 + stage * 1.5;
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU + r() * 0.6, rad = 1.6 + stage * 0.9 + r();
      const px0 = mx + Math.cos(a) * sx * 0.8, py0 = my + Math.sin(a) * syy * 0.8;
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
        const d = Math.hypot(x, y), X0 = Math.round(px0 + x), Y0 = Math.round(py0 + y);
        if (d <= rad) N.set(X0, Y0, y > rad * 0.3 ? C.robeW1 : C.robeW0);
        else if (d <= rad + 1 && N.get(X0, Y0) < 0) N.set(X0, Y0, C.robeW2);
      }
    }
    return N;
  }
  function bakeMob(id, fw, fh, draw, A) {
    const grids = [], anims = {};
    const push = (an, fps, loop, list) => { anims[an] = { fps, loop, frames: list.map(gr => { grids.push(gr); return grids.length - 1; }) }; };
    push('stand', 4, true, A.stand.map(draw));
    push('move', 8, true, A.move.map(draw));
    push('hit', 8, false, A.hit.map(draw));
    const d0 = draw(A.die[0]), d1 = draw(A.die[1]);
    push('die', 10, false, [d0, poofG(d1, 0), ditherG(poofG(d1, 1), 0.5), ditherG(poofG(d1, 2), 0.13)]);
    for (const white of [false, true]) sheetOf('mob_' + id + (white ? '_white' : ''), fw, fh, grids.length, grids.map(gr => gr.toCanvas(white)), { px: fw >> 1, py: fh - 1, anims });
  }
  bakeMob('shellback', 28, 20, shellback, {
    stand: [{ st: 0 }, { st: 1, sy: 0 }],
    move: [{ hx: 0 }, { hx: 1, st: 1, sy: 1 }, { hx: 2, st: 1, sx: 1 }, { hx: 1, sx: 1, st: 0 }],
    hit: [{ eyes: 'hurt', st: -2, sx: -1, sy: -1, mouth: 1 }],
    die: [{ eyes: 'x', sag: 3, st: -1, sy: 1, mouth: 1 }, { ret: 2, sy: 2 }],
  });
  bakeMob('capling', 24, 30, capling, {
    stand: [{ sq: 1 }, { sq: 0.93 }],
    move: [{ sq: 0.78 }, { sq: 1.2, lift: 1 }, { sq: 1.04, lift: 6, air: 1 }, { sq: 0.86 }],
    hit: [{ sq: 0.9, eyes: 'hurt', mouth: 1 }],
    die: [{ sq: 0.78, eyes: 'x', mouth: 1 }, { sq: 0.6, eyes: 'x', mouth: 1 }],
  });
  bakeMob('stumpy', 32, 32, stumpy, {
    stand: [{ sq: 1, leaf: 0 }, { sq: 0.95, leaf: 1, arm: 1 }],
    move: [{ legs: [-2, 0, 2, 2], lean: 0, arm: 1 }, { legs: [0, 0, 0, 0], sq: 1.04, lean: 1, leaf: 1 }, { legs: [2, 2, -2, 0], lean: 0, arm: -1 }, { legs: [0, 0, 0, 0], sq: 1.04, lean: -1, leaf: -1 }],
    hit: [{ sq: 0.92, eyes: 'hurt', mouth: 'o', lean: -1, arm: 2, leaf: -1 }],
    die: [{ sq: 0.85, eyes: 'x', mouth: 'o', arm: -2 }, { sq: 0.7, eyes: 'x', mouth: 'o', arm: -2 }],
  });
  bakeMob('wisp', 20, 26, wisp, {
    stand: [{ ph: 0 }, { ph: 2.2 }],
    move: [{ bob: 0, ph: 0 }, { bob: -1, ph: 1.6 }, { bob: -2, ph: 3.2 }, { bob: -1, ph: 4.8 }],
    hit: [{ eyes: 'hurt', mouth: 1, sq: 0.85, ph: 1 }],
    die: [{ eyes: 'x', mouth: 1, sq: 0.8, ph: 2 }, { eyes: 'x', mouth: 1, sq: 0.6, ph: 3 }],
  });

  // ================================================================== ITEMS (10x10, pivot bottom centre)
  {
    const L = [], names = {};
    const add = (n, G) => { G.outline(); names[n] = L.length; L.push(G.toCanvas(false)); };
    for (const w of [3.5, 2.5, 1, 2.5]) {
      const G = GX(10, 10);
      G.e(4.5, 5, w, 3.5, (dx, dy) => (w < 1.5 ? (dy < 0 ? C.gold : C.goldD) : dx + dy < -0.6 ? C.holy0 : dx + dy > 0.6 ? C.goldD : C.gold));
      if (w > 3) { G.r(4, 4, 2, 2, C.goldD); G.p(4, 4, C.gold); }
      else if (w > 2) G.r(4, 4, 1, 2, C.goldD);
      add('meso' + L.length, G);
    }
    { const G = GX(10, 10); G.e(5, 6, 3.6, 2.6, (dx, dy) => (dx < -0.4 && dy < 0.2 ? C.burlap : dx > 0.5 || dy > 0.5 ? C.burlapD : C.burlap)); G.r(4, 2, 3, 2, C.burlap); G.r(3, 1, 5, 1, C.burlapD); G.r(4, 3, 3, 1, C.goldD); G.p(4, 1, C.gold); G.p(6, 1, C.holy0); G.p(5, 6, C.gold); G.p(5, 5, C.goldD); G.p(5, 7, C.goldD); add('mesobag', G); }
    const potion = (c0, c1, c2) => { const G = GX(10, 10); G.e(4.5, 6, 3, 2.8, (dx, dy) => (dx < -0.3 && dy < -0.1 ? c0 : dx > 0.4 || dy > 0.5 ? c2 : c1)); G.r(4, 2, 2, 2, C.steel); G.r(4, 1, 2, 1, C.burlap); G.p(3, 5, 35); G.r(2, 5, 6, 1, (i) => (i === 1 ? 35 : undefined)); return G; };
    add('potion_red', potion(C.crim1, C.crim2, C.crim3));
    add('potion_blue', potion(C.ice1, C.ice3, C.ice4));
    { const G = GX(10, 10); G.e(4.5, 7, 4, 4.5, (dx, dy, x, y) => (y > 7 ? undefined : dx + dy < -0.7 ? C.cap1 : dx > 0.5 ? C.cap3 : C.cap2)); G.r(1, 8, 8, 1, C.cap4); G.p(3, 5, C.robeW0); G.p(2, 5, C.robeW0); G.p(3, 4, C.robeW0); G.p(6, 4, C.robeW0); G.p(7, 6, C.robeW1); add('cap', G); }
    { const G = GX(10, 10); G.ln(1, 8, 4, 5, C.wood); G.ln(4, 5, 5, 2, C.wood); G.ln(2, 8, 5, 5, C.dirt); G.ln(5, 5, 8, 4, C.woodL); G.p(8, 3, C.woodL); G.ln(4, 6, 5, 8, C.dirt); G.p(6, 1, C.wood); G.p(4, 3, C.woodL); add('root', G); }
    { const G = GX(10, 10); starPoly(G, 4.5, 4.5, 4.7, 2.3, -Math.PI / 2 + 0.12, 0.12, C.armor0, C.armor2, 0, 0, 9, 9); G.p(4, 4, C.armor1); G.p(4, 5, 0); G.p(5, 4, 0); G.p(5, 5, C.armor1); add('star_steely', G); }
    { const G = GX(10, 10); starPoly(G, 4.5, 4.5, 4.9, 2.3, -Math.PI / 2 + 0.28, 0.25, C.ice1, C.ice3, 0, 0, 9, 9); G.e(4.5, 4.5, 1.6, 1.6, C.gold); G.p(4, 4, 0); G.p(5, 5, C.goldD); add('star_ilbi', G); }
    { const G = GX(10, 10); G.r(1, 5, 8, 3, (i, j) => (j === 2 ? C.goldD : i < 3 ? C.holy1 : C.gold)); for (const [x, h] of [[1, 3], [4, 4], [7, 3]]) G.r(x + (x === 4 ? 0 : 0), 5 - h, x === 4 ? 2 : 2, h, (i) => (i ? C.gold : C.holy1)); G.p(4, 6, C.crim1); G.p(5, 6, C.crim2); G.p(2, 1, C.holy0); G.p(8, 1, C.holy0); G.p(4, 0, C.holy0); add('crown', G); }
    sheetOf('items', 10, 10, 8, L, { px: 5, py: 9, names });
  }

  // ================================================================== LEVEL UP (30 x 40x96)
  {
    const fr = [], r = rng(404), sp = [];
    for (let k = 0; k < 30; k++) sp.push([r() * 0.6, (r() < 0.5 ? -1 : 1) * (4 + r() * 12), 50 + r() * 70, r() * TAU, r()]);
    for (let f = 0; f < 30; f++) {
      const t = f / 29, G = GX(40, 96), cx = 19.5, base = 95;
      const grow = easeOut(clamp(t / 0.2, 0, 1)), top = base - Math.round(grow * 94);
      const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      const w = (t < 0.1 ? 1.5 + t / 0.1 * 5.5 : 7 - Math.min(1, (t - 0.1) / 0.35) * 2.5) * (0.35 + 0.65 * fade);
      const ringsBack = [], rings = [];
      for (const t0 of [0.02, 0.14, 0.28]) {
        const u = (t - t0) / 0.42; if (u < 0 || u > 1) continue;
        rings.push([base - 2 - easeOut(u) * 58, 6 + easeOut(u) * 12, u]);
      }
      const ring = (front) => { for (const [ry0, rxx, u] of rings) for (let i = 0; i < 120; i++) { const a = i / 120 * TAU, sn = Math.sin(a); if ((sn > 0) !== front) continue; const x = Math.round(cx + Math.cos(a) * rxx), y = Math.round(ry0 + sn * rxx * 0.26); if (u > 0.55 && !dz(x, y, 1 - (u - 0.55) / 0.45)) continue; G.p(x, y, front ? (Math.abs(Math.cos(a)) < 0.5 ? C.holy0 : C.gold) : C.goldD); } };
      ring(false);
      // pillar with rising streaks
      for (let y = top; y <= base; y++) {
        const fy = (base - y) / 94, taper = fy > 0.75 ? 1 - (fy - 0.75) / 0.25 * 0.6 : 1, hw = Math.max(0.6, w * taper);
        for (let x = Math.floor(cx - hw - 1); x <= Math.ceil(cx + hw + 1); x++) {
          const d = Math.abs(x - cx) / hw;
          if (d > 1) continue;
          if (fy > 0.5 && !dz(x, y + f * 3, 1.15 - (fy - 0.5) / 0.5)) continue;
          if (y < top + 6 && !dz(x, y, (y - top) / 6)) continue;
          const streak = ((y + f * 5 + Math.round(hash(x, 7) * 9)) % 11) < 3;
          let c = d < 0.3 ? 35 : d < 0.62 ? (streak ? 35 : C.holy0) : d < 0.85 ? (streak ? C.holy0 : C.holy1) : C.gold;
          if (d > 0.85 && !dz(x, y + f, 0.7)) continue;
          G.p(x, y, c);
        }
      }
      ring(true);
      // ground flare
      if (t < 0.45) { const u = t / 0.45, rxx = 5 + u * 14; for (let x = Math.round(cx - rxx); x <= Math.round(cx + rxx); x++) { const d = Math.abs(x - cx) / rxx; if (dz(x, base, 1.1 - u - d * 0.3)) G.p(x, base, d < 0.4 ? 35 : d < 0.7 ? C.holy1 : C.gold); if (d < 0.6 && dz(x, base - 1, 0.8 - u)) G.p(x, base - 1, C.holy0); } }
      // sparkles drifting up around the beam
      for (const [t0, ox, spd, phs, kind] of sp) {
        const u = t - t0; if (u < 0 || u > 0.5) continue;
        const x = Math.round(cx + ox + Math.sin(u * 10 + phs) * 1.5), y = Math.round(base - 3 - u * spd);
        if (y < 2 || x < 1 || x > 38) continue;
        if (kind > 0.6 && u < 0.3) { G.p(x, y, 35); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) G.p(x + dx, y + dy, C.gold); if (u < 0.15) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) G.p(x + dx, y + dy, C.goldD); }
        else G.p(x, y, u > 0.35 ? C.goldD : kind > 0.3 ? C.holy1 : 35);
      }
      fr.push((t > 0.6 ? ditherG(G, 0.1 + 0.9 * fade, f) : G).toCanvas(false));
    }
    sheetOf('levelup', 40, 96, 10, fr, { px: 20, py: 95, fps: 30, anims: { play: { fps: 30, loop: false, frames: fr.map((_, i) => i) } } });
  }

  // ================================================================== MARKS (7x11)
  {
    const fr = [], names = {};
    const BANG = ['.###.', '.###.', '.###.', '..#..', '..#..', '.....', '.###.', '.###.'];
    const Q = ['.###.', '##.##', '...##', '..##.', '..#..', '.....', '..#..', '..#..'];
    for (const [nm, rows] of [['bang', BANG], ['q', Q]]) for (let f = 0; f < 2; f++) {
      const G = GX(7, 11), oy = 2 - f;
      rows.forEach((row, y) => { for (let x = 0; x < 5; x++) if (row[x] === '#') G.p(x + 1, y + oy, y < 2 ? C.holy0 : y > 5 ? C.goldD : x > 2 ? C.goldD : C.gold); });
      G.outline(); for (let x = 0; x < 7; x++) G.set(x, 5 + oy, -1); names[nm + f] = fr.length; fr.push(G.toCanvas(false));
    }
    sheetOf('marks', 7, 11, 4, fr, { px: 3, py: 10, names, anims: { bang: { fps: 3, loop: true, frames: [0, 1] }, q: { fps: 3, loop: true, frames: [2, 3] } } });
  }

  // ================================================================== ICONS2 (14x14)
  {
    const fr = [], names = {};
    const bgIcon = (fn) => { const G = GX(14, 14); fn(G); G.outline(); return paint(14, 14, (c) => { R(0, 0, 14, 14, C.vio5); for (let x = 0; x < 14; x++) { px(x, 0, C.vio4); px(0, x, C.vio4); } c.getContext('2d').drawImage(G.toCanvas(false), 0, 0); }); };
    names.flash = fr.length; fr.push(bgIcon(G => { const pts = [[8, 1], [3, 7], [7, 7], [5, 12], [11, 5], [7, 5], [9, 1]]; for (let y = 1; y < 13; y++) for (let x = 1; x < 13; x++) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) ins = !ins; } if (ins) G.p(x, y, y < 5 ? C.holy0 : y < 8 ? C.gold : C.goldD); } G.p(7, 3, 35); G.p(6, 4, 35); }));
    const pot = (c0, c1, c2) => G => { G.e(6.5, 8.5, 4, 3.8, (dx, dy) => (dx < -0.3 && dy < -0.1 ? c0 : dx > 0.4 || dy > 0.5 ? c2 : c1)); G.r(5, 2, 3, 3, C.steel); G.r(5, 1, 3, 1, C.burlap); G.p(4, 7, 35); G.p(4, 8, 35); G.p(5, 6, 35); };
    names.red = fr.length; fr.push(bgIcon(pot(C.crim1, C.crim2, C.crim3)));
    names.blue = fr.length; fr.push(bgIcon(pot(C.ice1, C.ice3, C.ice4)));
    { const G = GX(14, 14); G.r(4, 1, 6, 2, C.armor1); G.r(3, 3, 2, 4, C.armor1); G.r(9, 3, 2, 4, C.armor2); G.r(5, 3, 4, 3, -1); G.p(4, 1, C.armor0); G.p(3, 3, C.armor0);
      G.r(2, 6, 10, 7, (i, j) => (j === 0 ? C.holy1 : i < 2 ? C.gold : i > 7 || j === 6 ? C.goldD : C.gold)); G.r(6, 8, 2, 2, 0); G.p(6, 10, 0); G.p(7, 10, 0); G.p(6, 11, 0);
      G.outline(); names.lock = fr.length; fr.push(G.toCanvas(false)); }
    sheetOf('icons2', 14, 14, 4, fr, { names });
  }

  // ================================================================== LOGO (~224x48)
  {
    const FNT = {
      S: ['.###', '#...', '#...', '.##.', '...#', '...#', '###.'], H: ['#..#', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
      A: ['.##.', '#..#', '#..#', '####', '#..#', '#..#', '#..#'], D: ['###.', '#..#', '#..#', '#..#', '#..#', '#..#', '###.'],
      O: ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'], W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
      T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'], R: ['###.', '#..#', '#..#', '###.', '#.#.', '#..#', '#..#'],
      I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'], K: ['#..#', '#.#.', '##..', '##..', '#.#.', '#..#', '#..#'],
      E: ['####', '#...', '#...', '###.', '#...', '#...', '####'],
    };
    const LW = 224, LH = 48, S3 = 3, G = GX(LW, LH), TY = 12;
    const word = (str, x0) => {
      let x = x0;
      for (const ch of str) {
        const gl = FNT[ch], gw = gl[0].length;
        for (let r2 = 0; r2 < 7; r2++) for (let q = 0; q < gw; q++) if (gl[r2][q] === '#') {
          const above = r2 > 0 && gl[r2 - 1][q] === '#', below = r2 < 6 && gl[r2 + 1][q] === '#';
          for (let j = 0; j < S3; j++) for (let i = 0; i < S3; i++) {
            const yy = r2 * S3 + j;
            let c = yy < 5 ? C.holy1 : yy < 11 ? C.gold : dz(x + q * S3 + i, TY + yy, (yy - 11) / 9) ? C.goldD : C.gold;
            if (!above && j === 0) c = C.holy0;
            if (!below && j === S3 - 1) c = C.goldD;
            G.p(x + q * S3 + i, TY + yy, c);
          }
        }
        x += (gw + 1) * S3;
      }
      return x - S3;
    };
    const xEnd = word('SHADOW', 3);
    const ex = xEnd + 18, ey = 24;
    word('STRIKE', ex + 17);
    // extrude + violet outline for the text only
    const T0 = cloneG(G);
    for (let y = LH - 1; y >= 0; y--) for (let x = 0; x < LW; x++) if (T0.get(x, y) >= 0) for (let k = 1; k <= 3; k++) if (G.get(x + (k > 2 ? 1 : 0), y + k) < 0) G.set(x + (k > 2 ? 1 : 0), y + k, k === 3 ? C.vio5 : C.vio4);
    const T1 = cloneG(G);
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (T1.get(x, y) < 0) { let n = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (T0.get(x + dx, y + dy) >= 0) n = true; if (n) G.set(x, y, C.vio2); }
    // shuriken emblem on a violet badge
    const E = GX(LW, LH);
    E.e(ex - 0.5, ey - 0.5, 18.5, 18.5, (dx, dy, x, y, d) => (d > 0.84 ? (dx + dy < 0 ? C.vio2 : C.vio3) : dz(x, y, 0.35 - (dx + dy) * 0.3) ? C.vio3 : C.vio4));
    starPoly(E, ex, ey, 22, 6.5, -Math.PI / 2 + 0.3, 0.32, C.armor0, C.armor2, ex - 24, 0, ex + 24, LH - 1);
    for (let y = 0; y < LH; y++) for (let x = ex - 24; x <= ex + 24; x++) { const v = E.get(x, y); if (v === C.armor0 && (E.get(x + 1, y) === C.armor2 || E.get(x, y + 1) === C.armor2)) E.set(x, y, C.armor1); }
    E.e(ex - 0.5, ey - 0.5, 4.5, 4.5, (dx, dy, x, y, d) => (d < 0.3 ? C.vio5 : d < 0.62 ? C.goldD : dx + dy < 0 ? C.holy1 : C.gold));
    E.outline();
    for (let i = 0; i < E.a.length; i++) if (E.a[i] >= 0) G.a[i] = E.a[i];
    G.outline();
    // sparkle glints
    for (const [x, y] of [[ex + 12, 8], [8, 9], [LW - 10, 36]]) { G.p(x, y, 35); G.p(x - 1, y, C.vio1); G.p(x + 1, y, C.vio1); G.p(x, y - 1, C.vio1); G.p(x, y + 1, C.vio1); }
    png('logo', G.toCanvas(false));
  }

  OUT.atlas.pal = PAL.slice();
};
