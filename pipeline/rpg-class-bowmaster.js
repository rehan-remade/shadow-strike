// Shadow Strike playable class: BOWMASTER (archer).
// Port of the hooded green archer from 01-archer.html (cloak, red/white fletched quiver, longbow whose string
// draws back, gold charged power-shot arrow) onto the class contract in bake/RPG_CLASSES.md.
// Everything is drawn into index layers that are auto-outlined in ink (like the boss Grid) and composited.
window.RPG_CLASS_BOWMASTER = function (BK) {
  const FW = 48, FH = 40, AX0 = 24, AY0 = 37;          // frame, anchor (feet row)

  // ------------------------------------------------------------------ index layers
  function Layer(w, h) {
    const a = new Int16Array(w * h).fill(-1), o = new Uint8Array(w * h);
    const L = {
      w, h, a, o,
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) a[y * w + x] = c; },
      g(x, y) { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < w && y < h ? a[y * w + x] : -1; },
      r(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) L.p(x + i, y + j, c); },
      b2(x, y, c) { x = Math.round(x); y = Math.round(y); L.p(x, y, c); L.p(x + 1, y, c); L.p(x, y + 1, c); L.p(x + 1, y + 1, c); },
      ln(x0, y0, x1, y1, c, brush) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy, n = 0;
        for (;;) {
          if (brush) L.b2(x0, y0, c); else L.p(x0, y0, c);
          if ((x0 === x1 && y0 === y1) || ++n > 300) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      },
      outline() {
        const b = a.slice();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] < 0) {
          if (L.g(x - 1, y) >= 0 || L.g(x + 1, y) >= 0 || L.g(x, y - 1) >= 0 || L.g(x, y + 1) >= 0) { b[y * w + x] = 0; o[y * w + x] = 1; }
        }
        a.set(b); return L;
      },
      // paste layer S on top; soft = S's outline only lands on empty pixels
      comp(S, soft) { for (let i = 0; i < a.length; i++) { const v = S.a[i]; if (v < 0) continue; if (soft && S.o[i] && a[i] >= 0) continue; a[i] = v; } return L; },
      canvas(map) {
        const c = mk(w, h); use(c.getContext('2d'));
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = a[y * w + x]; if (v >= 0) px(x, y, map ? map[v] : v); }
        use(g); return c;
      },
      // rotate a copy by q quarter turns clockwise about (cx, cy)
      rot(q, cx, cy) {
        const R2 = Layer(w, h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const v = a[y * w + x]; if (v < 0) continue;
          let dx = x - cx, dy = y - cy;
          for (let k = 0; k < q; k++) { const t = dx; dx = -dy; dy = t; }
          R2.p(cx + dx, cy + dy, v);
        }
        return R2;
      },
    };
    return L;
  }

  // ghost: pale violet silhouette by luminance (ink -> vio3), like ninja_ghost
  const GHOST = PAL.map((hex, i) => {
    if (i === 0) return C.vio3;
    const v = parseInt(hex.slice(1), 16), l = (0.3 * (v >> 16) + 0.59 * ((v >> 8) & 255) + 0.11 * (v & 255)) / 255;
    return l > 0.85 ? 35 : l > 0.5 ? C.vio0 : l > 0.26 ? C.vio1 : C.vio2;
  });

  // ------------------------------------------------------------------ the archer (facing right)
  // Upper body, 16 cols x 17 rows; col 8 sits on the anchor column, row 0 is 23 rows above the feet.
  const UP = [
    '.......LLHH.....',
    '......LLHHHH....',
    '.....LHHHHHHH...',
    '....hHHHHHHHHH..',
    '...hhHHHHoSSss..',
    '...hhHHHoSssss..',
    '...hhHHHoSssess.',
    '...hhHHHoSsssss.',
    '...hhhHHoSssss..',
    '...hhhHHHoSSo...',
    '..hhhhhHHHooo...',
    '..hhhhhHHtTTTT..',
    '..hhhhhHHtwTTTT.',
    '..hhhhhHHbbbbyb.',
    '..hhhhhhHHtwTT..',
    '...hhhhhhHHtw...',
  ];
  const UPC = { L: C.cloakL, H: C.cloak, h: C.cloakD, s: C.skin, S: C.skinD, e: 0, o: 0, t: C.dirt, T: C.woodL, w: C.wood, b: C.dirtD, y: C.gold };
  // back view (climb)
  const BACK = [
    '......hHHL......',
    '.....hHHHHL.....',
    '....hhHHHHHL....',
    '....hhHHHHHL....',
    '....hhHHHHHH....',
    '....hhhHHHHH....',
    '....hhhHHHHH....',
    '.....hhhHHH.....',
    '...hhhhhHHHHH...',
    '..hhhhhhHHHHHH..',
    '..hhhhhhHHHHHH..',
    '..hhhhhhHHHHHH..',
    '..hhhhhhHHHHHH..',
    '..hhhhhhHHHHHH..',
    '..hhhhhhhHHHHH..',
    '..hhhhhhhHHHHH..',
    '...hhhhhhhHHH...',
  ];

  const LEGC = { n: [C.ninja1, C.dirt, C.dirtD, C.wood], f: [C.navy, C.dirtD, C.dirtD, C.dirt] };
  function boot(L, x, y, mode, cm, cd) {
    if (mode === 'toe') { L.r(x, y, 2, 2, cm); L.p(x + 1, y + 2, cd); L.p(x + 2, y + 2, cd); }
    else if (mode === 'point') { L.r(x, y, 3, 1, cm); L.r(x + 1, y + 1, 3, 1, cd); }
    else if (mode === 'back') { L.r(x, y, 2, 1, cm); L.r(x, y + 1, 2, 1, cd); }
    else { L.r(x, y, 3, 1, cm); L.r(x, y + 1, 4, 1, cd); }
  }
  function leg(L, j, which) {
    const [hx, hy, kx, ky, fx, fy, mode] = j, [cl, cb, cs, cc] = LEGC[which];
    const X = v => AX0 + v, Y = v => AY0 + v;
    L.ln(X(hx), Y(hy - 1), X(kx), Y(ky), cl, 1); L.ln(X(kx), Y(ky), X(fx), Y(fy - 2), cl, 1);
    boot(L, X(fx), Y(fy), mode || 'flat', cb, cs);
    L.p(X(fx), Y(fy - 1), cc); L.p(X(fx) + 1, Y(fy - 1), cc);   // boot cuff
  }

  function arrowPix(L, tx, ty, a, len, kind) {
    const dx = Math.cos(a), dy = Math.sin(a), qx = -dy, qy = dx;
    for (let i = len - 1; i >= 0; i--) {
      const x = tx - dx * i, y = ty - dy * i;
      let c = C.woodL;
      if (i === 0) c = kind === 2 ? 35 : kind === 1 ? C.gold : 35;
      else if (i <= 2) c = kind === 2 ? C.holy0 : kind === 1 ? C.gold : C.steel;
      else if (i >= len - 3) c = i === len - 1 ? C.strawL : C.woodL;
      L.p(x, y, c);
      if (i === 2) { const hc = kind === 2 ? C.gold : kind === 1 ? C.goldD : C.armor1; L.p(x + qx, y + qy, hc); L.p(x - qx, y - qy, hc); }
      if (i >= len - 3 && i < len - 1) { const fc = i === len - 2 ? 35 : C.red; L.p(x + qx, y + qy, fc); L.p(x - qx, y - qy, fc); }
    }
  }

  // pose -> { L: final layer, tip: [x, y] arrow-tip pixel }
  function archer(o) {
    const dy = o.dy || 0, lean = o.lean || 0;
    const sx = r => Math.round(lean * (16 - r) / 16);
    const ux = (c, r) => AX0 - 8 + c + sx(r), uy = r => AY0 - 23 + dy + r;
    const out = Layer(FW, FH);

    // bow geometry (from the prototype's computeGeo)
    const bw = o.bow || { a: -0.32, draw: 0, low: 1 };
    const a = bw.a, ddx = Math.cos(a), ddy = Math.sin(a), qx = -ddy, qy = ddx;
    const SB = [ux(11, 11), uy(11)], SN = [ux(9, 11), uy(11)];
    const hjit = bw.jit || 0;
    const hand = bw.low ? (o.bowBack ? [SB[0] + 2, SB[1] + 4] : [SB[0] + 6, SB[1] + 3]) : [SB[0] + ddx * 9, SB[1] + ddy * 9 + hjit];
    const draw = bw.draw || 0, BL = (bw.low ? 9.5 : 10) - draw * 1.2, cu = 2.6 + draw * 2.4, pull = cu + draw * 4.5;
    let nock = [hand[0] - ddx * pull, hand[1] - ddy * pull];
    const tipA = [hand[0] - qx * BL - ddx * cu, hand[1] - qy * BL - ddy * cu], tipB = [hand[0] + qx * BL - ddx * cu, hand[1] + qy * BL - ddy * cu];
    const aTip = o.arrow ? [nock[0] + ddx * 14, nock[1] + ddy * 14] : [hand[0] + ddx * 5, hand[1] + ddy * 5];

    // 1. quiver on the back, red and white fletching sticking up behind the hood
    const Q = Layer(FW, FH);
    const qb = [ux(-1, 15), uy(15)], qt = [ux(2, 4), uy(4)];
    Q.ln(qb[0], qb[1], qt[0], qt[1], C.dirt, 1);
    Q.ln(qb[0], qb[1] + 1, qt[0], qt[1] + 1, C.wood);
    Q.p(qt[0], qt[1], C.woodL); Q.p(qt[0] + 1, qt[1], C.woodL);
    const fl = [[-2, -2, C.red], [-2, -3, C.red], [-1, -3, 35], [-1, -4, 35], [0, -4, C.red], [1, -5, C.red], [1, -4, 35], [2, -3, C.red], [2, -4, C.red], [3, -3, 35], [-1, -2, C.wood], [0, -3, C.wood], [1, -3, C.woodL], [2, -2, C.wood], [0, -2, C.woodL], [1, -2, C.woodL], [-1, -1, C.dirt], [2, -1, C.dirt]];
    for (const [fx, fy, c] of fl) Q.p(qt[0] + fx, qt[1] + fy, c);
    out.comp(Q.outline());
    if (o.wob) { nock = [nock[0] + ddx * o.wob, nock[1] + ddy * o.wob]; }
    function drawBow() {
      const BW = Layer(FW, FH);
      for (let i = 0; i <= 40; i++) {
        const s = i / 20 - 1;
        BW.p(hand[0] + qx * s * BL - ddx * cu * s * s, hand[1] + qy * s * BL - ddy * cu * s * s, Math.abs(s) > 0.8 ? C.strawL : C.woodL);
      }
      out.comp(BW.outline(), true);
      if (o.blur) {  // rapid-fire: ghost strings at several draw positions
        for (const k of [2.5, 5]) { const nb = [nock[0] - ddx * k, nock[1] - ddy * k]; ghostLine(out, tipA, nb, C.steel); ghostLine(out, nb, tipB, C.steel); }
      }
      out.ln(tipA[0], tipA[1], nock[0], nock[1], C.strawL); out.ln(nock[0], nock[1], tipB[0], tipB[1], C.strawL);
    }
    if (o.bowBack) drawBow();

    // 2. bow arm (far side, behind the body)
    const BA = Layer(FW, FH);
    BA.ln(SB[0], SB[1], hand[0], hand[1], C.cloakD, 1);
    out.comp(BA.outline());

    // 3. legs, far then near
    const LF = Layer(FW, FH); leg(LF, o.legs.f, 'f'); out.comp(LF.outline());
    const LN = Layer(FW, FH); leg(LN, o.legs.n, 'n'); out.comp(LN.outline());

    // 4. body (+ cloak flap trailing behind)
    const B = Layer(FW, FH);
    UP.forEach((row, r) => { for (let c = 0; c < 16; c++) { const ch = row[c]; if (ch !== '.') B.p(ux(c, r), uy(r), UPC[ch]); } });
    const flap = o.flap || 0;
    if (flap) for (let r = 9; r <= 15; r++) {
      const ext = Math.round(flap * Math.pow((r - 8) / 8, 1.2)), lx = ux(r >= 10 && r <= 15 ? 2 : 3, r);
      for (let k = 1; k <= ext; k++) B.p(lx - k, uy(r) - (o.flapUp ? Math.round(k * 0.6) : 0), C.cloakD);
    }
    if (o.hem) B.p(ux(2, 15), uy(15), C.cloakD);
    if (o.face === 'wince') { B.p(ux(12, 6), uy(6), 0); B.p(ux(13, 6), uy(6), 0); B.p(ux(13, 5), uy(5), C.skinD); B.p(ux(14, 8), uy(8), 0); }
    out.comp(B.outline());

    // 5. bow limbs (soft outline so the ink only hugs it where it is over empty space) + string
    if (!o.bowBack) drawBow();
    if (o.streak) {   // hurricane: arrows streaking off the string
      const sh = o.streak === 2 ? 3 : 0;
      for (const [off, x0, x1] of [[-3, 3 + sh, 11 + sh], [0, 2, 16], [3, 4 + sh, 10 + sh]]) {
        for (let k = x0; k <= x1; k++) {
          const f = (k - x0) / (x1 - x0), X0 = Math.round(hand[0] + ddx * k + qx * off), Y0 = Math.round(hand[1] + ddy * k + qy * off);
          if (f < 0.35 && bay(X0, Y0) > f * 2.4) continue;
          out.p(X0, Y0, f > 0.85 ? 35 : f > 0.4 ? C.steel : C.armor1);
        }
      }
    }
    if (o.arrow) arrowPix(out, aTip[0], aTip[1], a, 14, o.arrow === 3 ? 2 : o.arrow === 2 ? 1 : 0);
    if (o.arrow === 3) {  // gold glow at the head
      const gx = Math.round(aTip[0] - ddx), gy = Math.round(aTip[1] - ddy);
      for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) {
        const d = Math.hypot(xx, yy); if (d > 3.2 || out.g(gx + xx, gy + yy) >= 0 && d < 2) continue;
        if (d < 2.2 && bay(gx + xx, gy + yy) < 0.7) out.p(gx + xx, gy + yy, C.gold); else if (d >= 2.2 && bay(gx + xx, gy + yy) < 0.35) out.p(gx + xx, gy + yy, C.holy1);
      }
      out.p(aTip[0] + ddx * 2, aTip[1] + ddy * 2, 35); out.p(aTip[0] + ddx, aTip[1] + ddy, C.holy0);
      out.p(aTip[0], aTip[1] - 2, 35); out.p(aTip[0], aTip[1] + 2, 35); out.p(aTip[0], aTip[1] - 3, C.holy1); out.p(aTip[0], aTip[1] + 3, C.holy1);
    }
    // bow hand grips over the limbs
    if (!o.bowBack) { out.p(hand[0], hand[1], C.skin); out.p(hand[0] + 1, hand[1], C.skinD); }

    // 7. drawing arm (near side), outlined in front of everything
    const NA = Layer(FW, FH);
    let hh, el;
    const mode = o.hand || 'rest';
    if (mode === 'string') { hh = nock; el = [nock[0] - ddx * 5 - qx, nock[1] - ddy * 5 - qy]; if (draw < 0.6) el = [SN[0] - 1, SN[1] + 3]; }
    else if (mode === 'release') { hh = [nock[0] - ddx * 4, nock[1] - ddy * 4 - 2]; el = [hh[0] - 4, hh[1] + 1]; }
    else if (mode === 'follow') { hh = [SN[0] - 5, SN[1] - 2]; el = [SN[0] - 4, SN[1] + 1]; }
    else if (mode === 'up') { hh = [SN[0] - 5, SN[1] - 4]; el = [SN[0] - 3, SN[1] - 1]; }
    else if (mode === 'fling') { hh = [SN[0] - 6, SN[1] - 5]; el = [SN[0] - 4, SN[1] - 2]; }
    else if (mode === 'tuck') { hh = [SN[0] + 3, SN[1] + 4]; el = [SN[0] - 1, SN[1] + 4]; }
    else { hh = [SN[0] + 1, SN[1] + 6]; el = [SN[0], SN[1] + 3]; }
    NA.ln(SN[0], SN[1], el[0], el[1], C.cloak, 1);
    NA.ln(el[0], el[1], hh[0], hh[1], C.cloak, 1);
    { const fl = Math.hypot(hh[0] - el[0], hh[1] - el[1]) || 1; NA.b2(hh[0] - (hh[0] - el[0]) / fl * 2, hh[1] - (hh[1] - el[1]) / fl * 2, C.dirt); }
    NA.p(SN[0], SN[1], C.cloakL); NA.p(SN[0] + 1, SN[1], C.cloakL);
    NA.p(hh[0], hh[1], C.skin); NA.p(hh[0] + 1, hh[1], C.skin); NA.p(hh[0], hh[1] + 1, C.skinD); NA.p(hh[0] + 1, hh[1] + 1, C.skinD);
    if (mode === 'release') { NA.p(hh[0] - 1, hh[1] - 1, C.skin); NA.p(hh[0] + 2, hh[1] - 1, C.skin); }
    out.comp(NA.outline());
    return { L: out, tip: aTip };
  }
  function ghostLine(L, p0, p1, c) {
    const n = Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
    for (let i = 0; i <= n; i++) { const x = Math.round(p0[0] + (p1[0] - p0[0]) * i / n), y = Math.round(p0[1] + (p1[1] - p0[1]) * i / n); if ((x + y) & 1 && L.g(x, y) < 0) L.p(x, y, c); }
  }

  // back view on a rope: hood, cloak, quiver strapped diagonally, bow slung down the left side
  function climb(k) {
    const out = Layer(FW, FH), bob = k & 1;
    const ux = c => AX0 - 8 + c, uy = r => AY0 - 23 + bob + r;
    const legs = Layer(FW, FH);
    const up0 = k === 0 ? 2 : 0, up1 = k === 2 ? 2 : 0;
    for (const [lx, up, which] of [[-3, up0, 'f'], [1, up1, 'n']]) {
      const [cl, cb, cs] = LEGC['n'];
      legs.ln(AX0 + lx, AY0 - 6, AX0 + lx, AY0 - 3 - up, cl, 1);
      legs.p(AX0 + lx, AY0 - 2 - up, LEGC.n[3]); legs.p(AX0 + lx + 1, AY0 - 2 - up, LEGC.n[3]);
      boot(legs, AX0 + lx, AY0 - 1 - up, 'back', cb, cs);
    }
    out.comp(legs.outline());
    // bow slung behind, peeking out on the left
    const bw = Layer(FW, FH);
    for (let i = 0; i <= 30; i++) { const s = i / 15 - 1; bw.p(ux(1) - 1.8 * (1 - s * s), uy(8) + s * 10, Math.abs(s) > 0.8 ? C.strawL : C.woodL); }
    out.comp(bw.outline());
    const B = Layer(FW, FH), HD = Layer(FW, FH);
    BACK.forEach((row, r) => { for (let c = 0; c < 16; c++) { const ch = row[c]; if (ch !== '.') (r < 8 ? HD : B).p(ux(c), uy(r), UPC[ch]); } });
    HD.p(ux(8), uy(1), C.cloakD); HD.p(ux(8), uy(2), C.cloakD); HD.p(ux(7), uy(3), C.cloakD);   // hood seam
    for (let c = 4; c <= 11; c++) HD.p(ux(c), uy(8), c < 7 ? C.cloakD : C.cloak);                // hood drapes on the shoulders
    // arms to the rope: a raised hand shows above the hood; a low hand grips the rope in front of the chest,
    // hidden by the body, so only the elbow pokes out to the side
    const high = uy(-4), low = uy(5);
    const hands = [[k === 0, ux(3), ux(-1), AX0 - 2], [k === 2, ux(11), ux(15), AX0]];
    const ARM = (up) => {
      const A = Layer(FW, FH);
      for (const [hi, sxp, exp, hxp] of hands) {
        if (hi !== up) continue;
        const hy = hi ? high : low + (k === 0 && sxp > AX0 ? 1 : 0), sy = uy(9), ey = hi ? hy + 6 : uy(8);
        A.ln(sxp, sy, exp, ey, C.cloak, 1); A.ln(exp, ey, hxp, hy, C.cloak, 1); A.ln(sxp, sy, exp, ey, C.cloakL); A.ln(exp, ey, hxp, hy, C.cloakL);
        if (hi) { A.b2(hxp, hy + 2, C.dirt); A.p(hxp, hy, C.skin); A.p(hxp + 1, hy, C.skin); A.p(hxp, hy + 1, C.skinD); A.p(hxp + 1, hy + 1, C.skinD); }
      }
      return A.outline();
    };
    out.comp(ARM(false));
    out.comp(B.outline());
    // bowstring on the right of the bow
    out.ln(ux(1), uy(-2), ux(1), uy(18), C.strawL);
    const Q = Layer(FW, FH);
    Q.ln(ux(4), uy(14), ux(10), uy(4), C.dirt, 1); Q.ln(ux(5), uy(15), ux(11), uy(5), C.wood);
    Q.p(ux(11), uy(4), C.woodL); Q.p(ux(12), uy(4), C.woodL); Q.p(ux(7), uy(10), C.gold); Q.p(ux(8), uy(9), C.gold);
    for (const [fx, fy, c] of [[11, 2, C.red], [12, 1, 35], [12, 2, C.red], [13, 1, C.red], [13, 2, 35], [14, 2, C.red], [11, 3, C.woodL], [13, 3, C.woodL], [14, 1, 35]]) Q.p(ux(fx), uy(fy), c);
    out.comp(HD.outline());
    out.comp(Q.outline());
    out.comp(ARM(true));
    return { L: out, tip: [AX0, AY0 - 22] };
  }

  // ------------------------------------------------------------------ poses
  const ST = { n: [1, -6, 2, -4, 2, -1], f: [-3, -6, -3, -4, -3, -1] };
  const WIDE = { n: [1, -6, 3, -4, 4, -1], f: [-3, -6, -4, -4, -5, -1] };
  const LOW = { a: 0.05, draw: 0, low: 1 };
  const RUN = [
    { dy: 1, legs: { n: [1, -5, 4, -3, 6, -1], f: [-2, -5, -4, -3, -7, -2, 'toe'] }, flap: 2 },
    { dy: 0, legs: { n: [0, -6, 1, -3, -1, -1], f: [-1, -6, 3, -5, 0, -3, 'toe'] }, flap: 1 },
    { dy: 1, legs: { n: [-1, -5, -4, -3, -7, -2, 'toe'], f: [1, -5, 4, -3, 6, -1] }, flap: 2 },
    { dy: 0, legs: { n: [0, -6, 3, -5, 0, -3, 'toe'], f: [0, -6, 1, -3, -1, -1] }, flap: 1 },
  ];
  const TUCK = { n: [1, -6, 4, -5, 2, -3, 'point'], f: [-2, -6, 1, -4, -3, -2, 'toe'] };
  const FALL = { n: [1, -6, 2, -3, 3, -1, 'toe'], f: [-2, -6, -3, -3, -4, -1, 'toe'] };
  const P = (o) => Object.assign({ legs: ST, bow: LOW, hand: 'rest' }, o);
  const ANIMS = [
    ['idle', 6, 1, [P({}), P({ hem: 1 }), P({ dy: 1 }), P({ dy: 1, hem: 1 })]],
    ['run', 12, 1, RUN.map((r, i) => P(Object.assign({ bow: { a: 0.45 + (i & 1) * 0.08, draw: 0, low: 1 }, bowBack: 1, hand: 'rest' }, r)))],
    ['jump', 10, 0, [P({ legs: TUCK, bow: { a: 0.3, draw: 0, low: 1 }, bowBack: 1, hand: 'up', flap: 2 })]],
    ['fall', 10, 1, [P({ legs: FALL, bow: { a: 0.2, draw: 0, low: 1 }, bowBack: 1, hand: 'up', flap: 3, flapUp: 1 }), P({ legs: FALL, bow: { a: 0.25, draw: 0, low: 1 }, bowBack: 1, hand: 'up', flap: 2, flapUp: 1 })]],
    ['jump2', 12, 0, [{ spin: 1 }, { spin: 2 }]],
    ['attack', 16, 0, [
      P({ legs: WIDE, bow: { a: -0.1, draw: 0.35 }, hand: 'string', arrow: 1 }),
      P({ legs: WIDE, bow: { a: -0.1, draw: 1 }, hand: 'string', arrow: 1 }),
      P({ legs: WIDE, bow: { a: -0.16, draw: 0 }, hand: 'release', wob: 2 }),
      P({ legs: WIDE, bow: { a: -0.2, draw: 0 }, hand: 'follow', wob: -1 }),
    ]],
    ['cast', 8, 1, [
      P({ legs: WIDE, bow: { a: -0.12, draw: 1.15 }, hand: 'string', arrow: 1, lean: -1 }),
      P({ legs: WIDE, bow: { a: -0.12, draw: 1.15, jit: 1 }, hand: 'string', arrow: 3, lean: -1 }),
    ]],
    ['skill', 12, 0, [
      P({ legs: WIDE, bow: { a: -0.06, draw: 0 }, hand: 'release', blur: 1, streak: 1, lean: -1 }),
      P({ legs: WIDE, bow: { a: -0.06, draw: 0.7 }, hand: 'string', arrow: 1, lean: -1 }),
      P({ legs: WIDE, bow: { a: -0.1, draw: 0 }, hand: 'release', blur: 1, streak: 2, wob: 2, lean: -1 }),
    ]],
    ['climb', 8, 1, [{ back: 0 }, { back: 1 }, { back: 2 }, { back: 3 }]],
    ['crouch', 10, 0, [P({ dy: 3, lean: 1, legs: { n: [1, -3, 5, -4, 4, -1], f: [-2, -3, -5, -3, -4, -1, 'toe'] }, bow: { a: 0.1, draw: 0, low: 1 }, hand: 'rest', flap: 1 })]],
    ['hurt', 10, 0, [P({ dy: 1, lean: -2, legs: { n: [0, -5, 2, -3, 3, -1], f: [-3, -5, -4, -3, -5, -1] }, bow: { a: -0.5, draw: 0, low: 1 }, bowBack: 1, hand: 'fling', face: 'wince', flap: 3 })]],
  ];

  function frame(f) {
    if (f.back !== undefined) return climb(f.back);
    if (f.spin) {   // double jump: a forward somersault, tucked, rotated a quarter / half turn
      const r = archer(P({ legs: { n: [1, -6, 5, -7, 3, -5, 'point'], f: [-1, -6, 3, -6, 0, -4, 'point'] }, bow: { a: 0.3, draw: 0, low: 1 }, bowBack: 1, hand: 'tuck', flap: 1 }));
      const cx = AX0, cy = AY0 - 12, q = f.spin;
      const L = r.L.rot(q, cx, cy);
      // swoosh arc behind the spin
      const head = -Math.PI / 2 + q * Math.PI / 2;
      for (let i = 0; i < 26; i++) {
        const f = i / 25, t = head - 0.25 - f * 1.5;
        for (const rad of f < 0.6 ? [13, 14] : [13.5]) {
          const x = Math.round(cx + Math.cos(t) * rad), y = Math.round(cy + Math.sin(t) * rad);
          if (L.g(x, y) < 0 && (f < 0.7 || bay(x, y) < 1.4 - f)) L.p(x, y, f < 0.2 ? 35 : f < 0.5 ? C.cloakL : C.grassL);
        }
      }
      return { L, tip: [AX0 + 10, AY0 - 12] };   // mid-flip: arrows leave from chest height in front
    }
    return archer(f);
  }

  function bakePC(name, map) {
    const sh = BK.Sheet(name, FW, FH, 8, { px: AX0, py: AY0 });
    const anims = {}; let i = 0;
    for (const [an, fps, loop, frames] of ANIMS) {
      const idx = [];
      for (const f of frames) {
        const r = frame(f);
        sh.add(r.L.canvas(map), 0, 0, [Math.round(r.tip[0]) - AX0, AY0 - Math.round(r.tip[1])]);
        idx.push(i++);
      }
      anims[an] = { fps, loop: !!loop, frames: idx };
    }
    sh.done();
    const A = BK.OUT.atlas.sheets[name]; A.anims = anims; A.hands = A.extra; delete A.extra;
  }
  bakePC('pc_bowmaster', null);
  bakePC('pc_bowmaster_ghost', GHOST);
  // ------------------------------------------------------------------ portrait (34x34, framed bust like portrait_elder)
  {
    let G = Layer(34, 34);
    const E = (cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) { const c = fn(dx, dy, x, y); if (c !== undefined && c >= 0) G.p(x, y, c); } } };
    // quiver behind the left shoulder, fletching sticking up
    G.ln(3, 33, 6, 11, C.dirt, 1); G.ln(4, 33, 7, 11, C.dirt, 1); G.ln(3, 33, 6, 11, C.wood);
    G.r(4, 10, 5, 1, C.woodL);
    for (const [x0, y0, fc] of [[4, 4, C.red], [7, 3, 35], [10, 5, C.red]]) {
      G.ln(x0, y0 + 1, x0 - (x0 - 6) * 0.5, 10, C.wood);
      G.p(x0, y0, fc === 35 ? C.red : 35); G.p(x0 - 1, y0 + 1, fc); G.p(x0 + 1, y0 + 1, fc); G.p(x0 - 1, y0 + 2, fc); G.p(x0 + 1, y0 + 2, fc); G.p(x0 - 1, y0 + 3, fc === 35 ? C.steel : C.redD); G.p(x0 + 1, y0 + 3, fc === 35 ? C.steel : C.redD);
    }
    // cloak / mantle on the shoulders
    for (let y = 23; y <= 33; y++) { const hw = 9 + (y - 23) * 0.9; for (let x = Math.round(17 - hw); x <= Math.round(18 + hw); x++) G.p(x, y, x < 11 ? C.cloakL : x > 25 ? C.cloakD : C.cloak); }
    // leather tunic at the collar + quiver strap with a gold buckle
    for (let y = 26; y <= 33; y++) for (let x = 18 - (y - 26) * 0.4; x <= 25 + (y - 26) * 0.3; x++) G.p(x, y, x > 23 ? C.wood : C.woodL);
    G.ln(9, 24, 28, 33, C.dirtD, 1); G.r(18, 28, 2, 2, C.gold); G.p(18, 28, C.holy1);
    G.outline();
    const G0 = G; G = Layer(34, 34);
    // hood (lit from the upper left), with a soft peak drooping back
    E(18, 16, 11.5, 12.5, (dx, dy) => (dx < -0.35 && dy < 0.2 && dx + dy < -0.55 ? C.cloakL : dx > 0.6 || dy > 0.75 ? C.cloakD : C.cloak));
    for (const [x, y] of [[9, 7], [10, 6], [11, 5], [12, 5], [9, 9], [8, 11], [13, 4], [14, 4]]) G.p(x, y, C.cloakL);   // lit hood rim
    E(22.5, 18.5, 8.2, 9.2, (dx, dy) => (dx + dy < -0.9 ? C.cloakL : C.cloakD));   // opening: lit top edge, shadow inside
    // face, looking right
    E(23, 19.5, 6.6, 7.4, (dx, dy, x, y) => (dx < -0.55 || y <= 13 ? C.skinD : C.skin));
    G.p(29, 19, C.skin); G.p(29, 20, C.skinD); G.p(30, 20, C.skinD);   // nose
    // hair fringe under the hood
    for (let x = 18; x <= 27; x++) { G.p(x, 12, C.hairB); if (x % 3 !== 1) G.p(x, 13, x % 3 ? C.hairB : C.wood); }
    G.p(17, 13, C.hairB); G.p(17, 14, C.hairB); G.p(17, 15, C.hairB); G.p(18, 14, C.hairB);
    // eyes (green), brows
    for (const ex of [20, 25]) { G.r(ex, 16, 2, 3, 0); G.p(ex, 16, 35); G.p(ex + 1, 18, C.grassL); G.r(ex - 1, 14, 3, 1, C.hairB); }
    G.p(23, 23, C.skinD); G.p(24, 23, C.crim3); G.p(25, 23, C.skinD);   // mouth
    G.p(18, 21, C.skinD);
    for (let y = 8; y <= 24; y++) { const x = Math.round(12 - (y - 8) * 0.25 - Math.sin((y - 8) / 16 * Math.PI) * 2); if (G.g(x, y) === C.cloak || G.g(x, y) === C.cloakL) G.p(x, y, C.cloakD); }   // hood fold
    G.outline();
    G0.comp(G);
    const face = G0.canvas(null);
    const pc = mk(34, 34); use(pc.getContext('2d'));
    for (let y = 0; y < 34; y++) for (let x = 0; x < 34; x++) { const d = Math.hypot(x - 17, y - 14) / 22; px(x, y, bay(x, y) < (1 - d) * 0.9 ? C.vio4 : C.vio5); }
    pc.getContext('2d').drawImage(face, 0, 0);
    R(0, 0, 34, 1, 0); R(0, 33, 34, 1, 0); R(0, 0, 1, 34, 0); R(33, 0, 1, 34, 0);
    R(1, 1, 32, 1, C.gold); R(1, 1, 1, 32, C.gold); R(1, 32, 32, 1, C.goldD); R(32, 1, 1, 32, C.goldD);
    R(2, 2, 30, 1, 0); R(2, 31, 30, 1, 0); R(2, 2, 1, 30, 0); R(31, 2, 1, 30, 0);
    for (const [x, y] of [[1, 1], [32, 1], [1, 32], [32, 32]]) px(x, y, C.holy0);
    use(g);
    BK.png('portrait_pc_bowmaster', pc);
  }

  // ------------------------------------------------------------------ hotbar icons 14x14: j k l u sp
  {
    const sh = BK.Sheet('icons_bowmaster', 14, 14, 5, { names: { j: 0, k: 1, l: 2, u: 3, sp: 4 } });
    const icon = (fn) => { const G = Layer(14, 14); G.r(0, 0, 14, 14, C.vio5); fn(G); sh.add(G.canvas(null), 0, 0); };
    // diagonal arrow, tail at (x0, y0) heading up-right, `n` shaft steps
    const diag = (G, x0, y0, n, shaft, head, barb, fl) => {
      for (let i = 0; i <= n; i++) G.p(x0 + i, y0 - i, i === 0 ? C.strawL : shaft);
      for (let i = 1; i <= 3; i++) { const c = i === 1 ? 35 : fl; G.p(x0 + i + 1, y0 - i + 1, c); G.p(x0 + i - 1, y0 - i - 1, c); }
      const tx = x0 + n + 2, ty = y0 - n - 2;
      G.p(tx, ty, 35); G.p(tx - 1, ty + 1, head); G.p(tx - 1, ty, head); G.p(tx, ty + 1, head); G.p(tx - 2, ty, barb); G.p(tx, ty + 2, barb);
    };
    icon(G => diag(G, 2, 11, 6, C.woodL, C.steel, C.armor1, C.red));
    icon(G => {
      for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x - 9.5, y - 4.5); if (d < 4.5 && bay(x, y) < (4.5 - d) / 4.5 * 1.3) G.p(x, y, d < 2.5 ? C.gold : C.goldD); }
      for (let i = 0; i < 4; i++) if (bay(i, i) < 0.8) G.p(1 + i, 12 - i + 1, C.goldD);
      diag(G, 2, 11, 6, C.gold, C.holy0, C.gold, C.gold);
      G.p(11, 0, 35); G.p(13, 2, 35); G.p(12, 1, C.holy0); G.p(4, 5, C.holy1); G.p(6, 12, C.holy1);
    });
    icon(G => {
      for (const [y, x1] of [[3, 12], [7, 10], [11, 12]]) {
        for (let x = 1; x < x1 - 8; x++) if ((x + y) & 1) G.p(x, y, C.vio2);
        for (let x = x1 - 8; x <= x1; x++) G.p(x, y, x === x1 ? 35 : x >= x1 - 1 ? C.steel : x <= x1 - 7 ? C.strawL : C.woodL);
        G.p(x1 - 2, y - 1, C.armor1); G.p(x1 - 2, y + 1, C.armor1);
        G.p(x1 - 7, y - 1, C.red); G.p(x1 - 6, y - 1, 35); G.p(x1 - 7, y + 1, C.red); G.p(x1 - 6, y + 1, 35);
      }
    });
    icon(G => {
      for (let i = 0; i <= 5; i++) G.p(2 + i, 11 - i, i === 0 ? C.strawL : C.woodL);
      for (let i = 1; i <= 2; i++) { G.p(3 + i, 12 - i, i === 1 ? 35 : C.red); G.p(1 + i, 10 - i, i === 1 ? 35 : C.red); }
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const d = x * x + y * y; if (d <= 7) G.p(9 + x, 5 + y, d <= 1 && x < 1 && y < 1 ? C.ninja0 : x + y > 1 ? C.ninja2 : C.ninja1); }
      for (let x = -2; x <= 2; x++) G.p(9 + x, 5 + x, C.crim2);
      G.p(8, 3, C.steel); G.p(11, 2, C.wood); G.p(12, 1, C.fireY); G.p(13, 1, C.fireO); G.p(12, 0, C.fireO); G.p(11, 0, C.fireR); G.p(13, 0, C.fireY);
    });
    icon(G => {
      const chev = (y, c, c2) => { for (let k = 0; k <= 4; k++) { G.p(7 - k, y + k, c); G.p(7 + k, y + k, c); G.p(7 - k, y + k + 1, c2); G.p(7 + k, y + k + 1, c2); } G.p(7, y, 35); };
      chev(7, C.cloak, C.cloakD); chev(2, C.cloakL, C.cloak);
      for (let x = 3; x <= 11; x++) if (bay(x, 13) < 0.5) G.p(x, 13, C.vio1);
    });
    sh.done();
  }

  // ------------------------------------------------------------------ skill effects (all face right)
  function fxSheet(name, w, h, px0, py0, fps, loop, frames) {
    const sh = BK.Sheet(name, w, h, Math.min(frames.length, 8), { px: px0, py: py0, fps, anims: { play: { fps, loop: !!loop, frames: frames.map((_, i) => i) } } });
    for (const c of frames) sh.add(c, 0, 0);
    sh.done();
  }
  // normal arrow: 14x5, tip at (13,2)
  { const G = Layer(14, 5); arrowPix(G, 13, 2, 0, 14, 0); fxSheet('fx_bow_arrow', 14, 5, 13, 2, 12, 1, [G.canvas(null)]); }
  // power shot: gold arrow with a pulsing glow, 20x9, tip (18,4)
  {
    const fr = [];
    for (let f = 0; f < 2; f++) {
      const G = Layer(20, 9);
      for (let y = 0; y < 9; y++) for (let x = 0; x < 20; x++) {
        const d = Math.hypot((x - 15.5) / (f ? 1.5 : 1.3), (y - 4) * 1.1), lim = f ? 4.8 : 4.2;
        if (d < lim && bay(x + f, y) < (lim - d) / lim * 1.8) G.p(x, y, d < 2.2 ? C.holy1 : d < 3.4 ? C.gold : C.goldD);
        const tr = 1 - x / 12; if (x < 12 && Math.abs(y - 4) <= 1 && bay(x + f * 2, y) < tr * (y === 4 ? 0.9 : 0.35)) G.p(x, y, y === 4 ? C.gold : C.goldD);
      }
      for (let i = 0; i <= 16; i++) { const x = 18 - i; G.p(x, 4, i === 0 ? 35 : i <= 2 ? C.holy0 : i >= 14 ? C.holy1 : C.gold); }
      G.p(16, 3, C.gold); G.p(16, 5, C.gold); G.p(17, 3, C.holy1); G.p(17, 5, C.holy1);
      G.p(3, 3, 35); G.p(4, 3, C.holy1); G.p(3, 5, 35); G.p(4, 5, C.holy1);
      if (f) { G.p(18, 1, 35); G.p(18, 2, C.holy0); G.p(18, 6, C.holy0); G.p(18, 7, 35); G.p(19, 4, 35); G.p(7, 1, C.holy1); G.p(10, 7, C.holy1); }
      else { G.p(9, 1, C.holy1); G.p(5, 7, C.holy1); G.p(19, 4, C.holy0); }
      fr.push(G.canvas(null));
    }
    fxSheet('fx_bow_power', 20, 9, 18, 4, 12, 1, fr);
  }
  // bomb arrow: 14x7, tip (13,3), fuse spark flickers
  {
    const fr = [];
    for (let f = 0; f < 2; f++) {
      const G = Layer(14, 7);
      for (let i = 0; i <= 8; i++) G.p(8 - i, 3, i === 8 ? C.strawL : C.woodL);
      G.p(1, 2, C.red); G.p(1, 4, C.red); G.p(2, 2, 35); G.p(2, 4, 35); G.p(0, 2, C.red); G.p(0, 4, C.red);
      const B = Layer(14, 7);
      for (let y = 1; y <= 5; y++) for (let x = 9; x <= 13; x++) { const d = Math.hypot(x - 11, y - 3); if (d <= 2.3) B.p(x, y, d < 1.2 && x <= 11 && y <= 3 ? C.ninja0 : x + y > 14 ? C.ninja2 : C.ninja1); }
      B.p(10, 2, C.steel); B.p(12, 2, C.crim2); B.p(12, 3, C.crim2); B.p(12, 4, C.crim2); B.p(11, 1, C.crim2); B.p(11, 5, C.crim3);
      B.outline(); G.comp(B);
      G.p(10, 0, C.wood); G.p(9, 0, f ? C.fireY : C.fireO); G.p(8, 0, f ? C.fireO : C.fireR); if (f) G.p(9, 1, C.fireR);
      fr.push(G.canvas(null));
    }
    fxSheet('fx_bow_bombarrow', 14, 7, 13, 3, 12, 1, fr);
  }
  // arrow-bomb explosion: 48x40, bottom centre (24,39), 8 frames
  {
    const fr = [], W2 = 48, H2 = 40, CX = 24, GYb = 39;
    const deb = []; { const r = rng(4242); for (let i = 0; i < 14; i++) deb.push([(r() - 0.5) * 70, -30 - r() * 55, r() < 0.4 ? 2 : 1, r()]); }
    const puffs = []; { const r = rng(777); for (let i = 0; i < 8; i++) puffs.push([(r() - 0.5) * 22, r() * 8, 3 + r() * 3, r()]); }
    const FIRE = [
      { r: 5, heat: 1.4 }, { r: 10, heat: 1.25 }, { r: 14, heat: 1.05 }, { r: 16, heat: 0.85 },
      { r: 15, heat: 0.6 }, { r: 11, heat: 0.4 }, { r: 6, heat: 0.3 }, { r: 0, heat: 0 },
    ];
    for (let f = 0; f < 8; f++) {
      const G = Layer(W2, H2), F = FIRE[f], t = f / 20;
      // smoke (behind the fire), rising and thinning
      if (f >= 2) {
        const sm = f < 5 ? (f - 1) / 4 : 1, fade = f <= 5 ? 1 : f === 6 ? 0.6 : 0.3;
        for (const [ox, oy, rr0, ph] of puffs) {
          const cx = CX + ox * (0.8 + sm * 0.5), cy = GYb - 13 - sm * 9 - oy * 0.8 - f * 0.8, rad = rr0 * (0.7 + sm * 0.6);
          for (let y = -Math.ceil(rad); y <= Math.ceil(rad); y++) for (let x = -Math.ceil(rad); x <= Math.ceil(rad); x++) {
            const d = Math.hypot(x, y) / rad; if (d > 1) continue;
            const X0 = Math.round(cx + x), Y0 = Math.round(cy + y);
            if (bay(X0, Y0) > fade * (1.15 - d * 0.5)) continue;
            G.p(X0, Y0, x + y < -rad * 0.5 ? C.ninja0 : d > 0.8 && x + y > 0 ? C.ninja2 : C.ninja1);
          }
        }
      }
      // fire dome
      if (F.r > 0) {
        const rx = F.r, ry = F.r * 0.9, cy = GYb - F.r * 0.35;
        for (let y = Math.floor(cy - ry - 2); y <= GYb; y++) for (let x = Math.floor(CX - rx - 2); x <= Math.ceil(CX + rx + 2); x++) {
          const n = vnoise(x * 0.35 + f * 3.1, y * 0.35 - f * 2.3) - 0.5;
          const v = Math.hypot((x - CX) / rx, (y - cy) / ry) + n * 0.45;
          if (v > 1) continue;
          const hh = (1 - v) * F.heat + n * 0.2;
          if (f >= 5 && bay(x, y) > (1 - v) * 2.2) continue;
          G.p(x, y, hh > 0.85 ? 35 : hh > 0.6 ? C.fireY : hh > 0.38 ? C.fireO : hh > 0.18 ? C.fireR : f >= 4 ? C.crim3 : C.crim2);
        }
      }
      // flash star on the first frames
      if (f <= 1) { const L2 = f ? 11 : 8; for (let k = 1; k <= L2; k++) { const c = k < L2 * 0.5 ? 35 : C.fireY; G.p(CX + k, GYb - 5, c); G.p(CX - k, GYb - 5, c); if (k < L2 * 0.8) { G.p(CX, GYb - 5 - k, c); } } }
      // ground shock ring
      if (f >= 1 && f <= 4) { const rr2 = 8 + f * 5; for (let x = -rr2; x <= rr2; x++) { const X0 = CX + x; if (Math.abs(x) > rr2 - 4 && bay(X0, 0) < 0.8) { G.p(X0, GYb, f < 3 ? C.fireY : C.fireO); if (Math.abs(x) > rr2 - 2) G.p(X0, GYb - 1, f < 3 ? C.fireO : C.fireR); } } }
      // debris + embers
      if (f >= 1) for (const [vx, vy, sz, ph] of deb) {
        const tt = t * (0.8 + ph * 0.4) + 0.02, x = CX + vx * tt, y = GYb - 4 + vy * tt + 160 * tt * tt;
        if (y > GYb || y < 0) continue;
        const c = f < 4 ? (ph < 0.5 ? C.fireY : C.fireO) : ph < 0.5 ? C.fireR : C.rock1;
        if (f >= 6 && bay(Math.round(x), Math.round(y)) > 0.5) continue;
        if (G.g(x, y) >= 0 && f < 5) continue;
        G.p(x, y, c); if (sz > 1 && G.g(x + 1, y) < 0) G.p(x + 1, y, f < 4 ? C.fireR : C.rock2);
      }
      if (f === 7) { const r = rng(9); for (let i = 0; i < 7; i++) { const x = CX + (r() - 0.5) * 26, y = GYb - 4 - r() * 26; G.p(x, y, r() < 0.5 ? C.fireO : C.fireR); } }
      fr.push(G.canvas(null));
    }
    fxSheet('fx_bow_bomb', W2, H2, 24, 39, 20, 0, fr);
  }
};
