// Sprite-sheet baker: renders the prototype's procedural art (engine + Avenger skill) into
// PNG sheets + atlas.json + WAV sfx for the Unity build. Run via bake-run.mjs.
(function () {
  const AV = window.__AV;
  const OUT = { images: {}, atlas: { pal: PAL.slice(), sheets: {}, stars: STARS, clouds: [], fonts: {} }, audio: {} };

  function clearG() { g.clearRect(0, 0, W, H); use(g); }
  // sheet builder: frames are captured from region (rx, ry, w, h) of the engine canvas `off`
  function Sheet(name, w, h, cols, meta) {
    const frames = [];
    return {
      add(src, rx, ry, extra) {
        const c = mk(w, h); c.getContext('2d').drawImage(src || off, rx, ry, w, h, 0, 0, w, h);
        frames.push(c); if (extra) (this.extra = this.extra || []).push(extra);
      },
      done() {
        const n = frames.length, cc = Math.min(cols || n, n), rows = Math.ceil(n / cc);
        const s = mk(cc * w, rows * h), x = s.getContext('2d');
        frames.forEach((f, i) => x.drawImage(f, (i % cc) * w, Math.floor(i / cc) * h));
        OUT.images[name] = s.toDataURL('image/png').slice(22);
        OUT.atlas.sheets[name] = Object.assign({ w, h, cols: cc, count: n }, meta || {}, this.extra ? { extra: this.extra } : {});
      },
    };
  }
  const png = (name, c) => { OUT.images[name] = c.toDataURL('image/png').slice(22); };

  // ------------------------------------------------------------------ ninja
  const LEG = { o: 0, N: C.ninja0, n: C.ninja1, d: C.ninja2, k: C.ninja3 };
  const STAND = AV.NINJA.slice(13).map(r => r.slice());
  const L = rows => sprite(rows, LEG);
  const LEGS = {
    stand: STAND,
    runA: L(['...onnnnnndo....', '..onnnoonnndo...', '.onnno..onnndo..', '.onno....onnno..', 'onno......onnno.', 'odo........onnko', 'okko........okko']),
    runB: L(['...onnnnnndo....', '...onnnnnnno....', '....onnnnnno....', '....onnoonnno...', '....onno.onnko..', '....onno..okko..', '....okko........']),
    runC: L(['...onnnnnndo....', '..onndoonnnno...', '.onndo..onnnno..', '.onno....onnno..', 'onno......onnno.', 'okko.......onndo', '............okko']),
    runD: L(['...onnnnnndo....', '...onnnnnnno....', '....onnnnnno....', '...onnnoonno....', '..okkno.onno....', '..okko..onno....', '........okko....']),
    tuck: L(['...onnnnnndo....', '..onnnnnnnndo...', '..onnno.onnnno..', '...onno..onnko..', '...okko...okko..', '................', '................']),
    fall: L(['...onnnnnndo....', '...onnno.onnd...', '...onno..onnd...', '..onno....onno..', '..okko....okko..', '................', '................']),
  };
  function setLegs(k) { const src = LEGS[k]; for (let i = 0; i < 7; i++) AV.NINJA[13 + i] = src[i]; }
  const NW = 56, NH = 32, NAX = 32, NFEET = 29;          // frame size, anchor column, feet row
  const ANX = 90;                                        // where frames are drawn on the engine canvas
  const S = (p, o) => Object.assign({ x: 0, y: 0, vis: 1, ghost: 0, wp: 0, sr: 0, sa: 0, wind: 1, bob: 0, ev: null }, p, o || {});
  const P = AV.PO;
  // [anim, fps, loop, frames: [pose, legs, extra]]
  const NANIMS = [
    ['idle', 7, 1, [[S(P.ready), 'stand'], [S(P.ready), 'stand'], [S(P.ready, { bob: 1 }), 'stand'], [S(P.ready, { bob: 1 }), 'stand']]],
    ['run', 12, 1, [[S({ lx: 1, ly: 0, fx: 5, fy: 1, bx: -6, by: 1 }, { wind: 1.8 }), 'runA'], [S({ lx: 1, ly: 0, fx: 3, fy: 2, bx: -3, by: 2 }, { wind: 1.8, bob: 1 }), 'runB'],
      [S({ lx: 1, ly: 0, fx: 1, fy: 2, bx: -2, by: 1 }, { wind: 1.8 }), 'runC'], [S({ lx: 1, ly: 0, fx: 3, fy: 2, bx: -5, by: 2 }, { wind: 1.8, bob: 1 }), 'runD']]],
    ['jump', 10, 0, [[S({ lx: 0, ly: 0, fx: 4, fy: -3, bx: -5, by: -1 }, { wind: 1.4 }), 'tuck']]],
    ['fall', 10, 1, [[S({ lx: 0, ly: 0, fx: 5, fy: -5, bx: -6, by: -4 }, { wind: 1.2 }), 'fall'], [S({ lx: 0, ly: 0, fx: 5, fy: -6, bx: -6, by: -5 }, { wind: 1.2 }), 'fall']]],
    ['flash', 14, 0, [[S({ lx: 1, ly: 1, fx: -2, fy: 2, bx: -7, by: 2 }, { wind: 2.2 }), 'tuck'], [S({ lx: 1, ly: 0, fx: 6, fy: 0, bx: -7, by: 1 }, { wind: 2.2 }), 'tuck']]],
    ['throw', 16, 0, [[S(P.wind, { wp: 1 }), 'stand'], [S(P.throwP), 'stand'], [S(P.throwP), 'stand'], [S({ lx: 0, ly: 0, fx: 6, fy: 0, bx: -5, by: 2 }), 'stand']]],
    ['charge', 8, 1, [[S(P.charge), 'stand'], [S(P.charge, { bob: 1 }), 'stand']]],
    ['seal', 8, 0, [[S(P.seal), 'stand'], [S(P.seal, { bob: 1 }), 'stand']]],
    ['slash', 20, 0, [[S(P.high, { wp: 2 }), 'stand'], [S(P.down, { wp: 2 }), 'stand'], [S(P.down, { wp: 2 }), 'stand'], [S(P.up, { wp: 2 }), 'stand'], [S(P.high, { wp: 2 }), 'stand'], [S(P.down, { wp: 2 }), 'stand']]],
    ['crouch', 10, 0, [[S(P.crouch), 'stand']]],
    ['climb', 8, 1, [[{ back: 0 }, 'stand'], [{ back: 1 }, 'stand'], [{ back: 2 }, 'stand'], [{ back: 3 }, 'stand']]],
    ['hurt', 10, 0, [[S({ lx: 0, ly: 1, fx: -3, fy: -4, bx: -6, by: -3 }, { wind: 1.6 }), 'fall']]],
  ];
  // Back view for ropes / ladders: seen from behind, hands alternate up the rope, knees alternate, scarf sways.
  const BACK_UP = sprite([
    '......oooo......', '....ooNNNNoo....', '...oNNNnnnNNo...', '...oNnnnnnnno...', '...onnnnnnnno...', '...onnnnnnnno...',
    '....orrRrrro....', '...onNnnnnNno...', '..onnnnnnnnnno..', '..onnnddddnnno..', '..onnnddddnnno..', '..onnnnnnnnnno..', '...orrrrrrrro...',
  ], LEG_B());
  function LEG_B() { return { o: 0, N: C.ninja0, n: C.ninja1, d: C.ninja2, k: C.ninja3, r: C.crim2, R: C.crim1 }; }
  const BACK_LEGS = {
    mid: sprite(['...onnnnnnnno...', '...onnnoonnno...', '...onno..onno...', '...onno..onno...', '...onno..onno...', '...okko..okko...', '...okko..okko...'], LEG_B()),
    left: sprite(['...onnnnnnnno...', '...onnnoonnno...', '...onno..onno...', '...okko..onno...', '...okko..onno...', '.........okko...', '.........okko...'], LEG_B()),
    right: sprite(['...onnnnnnnno...', '...onnnoonnno...', '...onno..onno...', '...onno..okko...', '...onno..okko...', '...okko.........', '...okko.........'], LEG_B()),
  };
  function drawClimb(k, map) {
    const M = c => (map ? map[c] : c);
    const x0 = ANX - 8, y0 = GY - 19, bob = k & 1;          // odd frames: body dips 1px between pulls
    const legs = k === 0 ? BACK_LEGS.left : k === 2 ? BACK_LEGS.right : BACK_LEGS.mid;
    for (let r = 0; r < 13; r++) BACK_UP[r].forEach((c, i) => { if (c >= 0) px(x0 + i, y0 + r + bob, M(c)); });
    for (let r = 0; r < 7; r++) legs[r].forEach((c, i) => { if (c >= 0) px(x0 + i, y0 + 13 + r, M(c)); });
    // scarf tails hang down the right side, swaying
    const sw = k < 2 ? 0 : 1;
    line(x0 + 12, y0 + 6 + bob, x0 + 14 + sw, y0 + 12, M(C.crim2)); line(x0 + 13, y0 + 6 + bob, x0 + 15 + sw, y0 + 11, M(C.crim1));
    line(x0 + 14 + sw, y0 + 12, x0 + 14 + sw, y0 + 15, M(C.crim3));
    // arms: shoulder -> elbow (out to the side) -> hand on the rope; lighter than the body so they read
    const seg = (ax, ay, bx, by) => { line(ax - 1, ay, bx - 1, by, M(0)); line(ax + 1, ay, bx + 1, by, M(0)); line(ax, ay - 1, bx, by - 1, M(0)); };
    const arm = (sx, sy, ex, ey, hx, hy) => {
      seg(sx, sy, ex, ey); seg(ex, ey, hx, hy);
      line(sx, sy, ex, ey, M(C.ninja0)); line(ex, ey, hx, hy, M(C.ninja0));
      R(hx - 1, hy - 1, 3, 3, M(0)); px(hx, hy, M(C.skin)); px(hx - 1, hy, M(C.ninja3)); px(hx + 1, hy, M(C.ninja3));
    };
    const high = y0 - 3, low = y0 + 3 + bob;
    // left hand high on frames 0, right hand high on frame 2, both at mid height otherwise
    const lh = k === 0 ? high : low, rh = k === 2 ? high : (k === 0 ? low + 2 : low);
    arm(x0 + 3, y0 + 8 + bob, x0, lh + 5, ANX - 1, lh);
    arm(x0 + 12, y0 + 8 + bob, x0 + 15, rh + 5, ANX, rh);
  }

  function bakeNinja(name, map) {
    const sh = Sheet(name, NW, NH, 16, { px: NAX, py: NFEET });
    const anims = {};
    let i = 0, fr = 0;
    for (const [an, fps, loop, frames] of NANIMS) {
      const idx = [];
      for (const [pose, legs] of frames) {
        clearG(); setLegs(legs);
        time = fr / 12; tick = fr * 5; fr++;
        if (pose.back !== undefined) drawClimb(pose.back, map);
        else { AV.setMap(map); AV.drawNinja(pose, ANX, 0, -1); AV.setMap(null); }
        const hp = pose.back !== undefined ? [ANX, GY - 22] : AV.handPos(pose, ANX, 0);
        sh.add(off, ANX - NAX, GY - NFEET, [hp[0] - ANX, GY - hp[1]]);   // hand pixel offset from pivot (unity: x right, y up)
        idx.push(i++);
      }
      anims[an] = { fps, loop: !!loop, frames: idx };
    }
    sh.done();
    const A = OUT.atlas.sheets[name]; A.anims = anims; A.hands = A.extra; delete A.extra;
    setLegs('stand');
  }
  bakeNinja('ninja', null);
  bakeNinja('ninja_clone', AV.CLONE_MAP);
  bakeNinja('ninja_ghost', AV.GHOST_MAP);
  { // class-select portrait for the Night Lord: framed bust from the idle pose, scaled x2
    clearG(); setLegs('stand'); time = 0; tick = 0; AV.drawNinja(S(P.ready), ANX, 0, -1);
    const bust = mk(17, 17); bust.getContext('2d').drawImage(off, ANX - 9, GY - 22, 17, 17, 0, 0, 17, 17);
    const pc = mk(34, 34), x = pc.getContext('2d');
    x.fillStyle = PAL[C.vio4]; x.fillRect(0, 0, 34, 34); x.fillStyle = PAL[C.vio5]; x.fillRect(1, 1, 32, 32);
    x.imageSmoothingEnabled = false; x.drawImage(bust, 0, 0, 17, 17, 0, 2, 34, 34);
    x.fillStyle = PAL[C.gold]; x.fillRect(0, 0, 34, 1); x.fillRect(0, 33, 34, 1); x.fillRect(0, 0, 1, 34); x.fillRect(33, 0, 1, 34);
    png('portrait_pc_nightlord', pc);
  }

  // ------------------------------------------------------------------ shurikens
  function bakeBig(name, dark) {
    const sh = Sheet(name, 22, 22, 8, { px: 11, py: 11, sizes: [1.5, 2.5, 3.5, 4.5, 5.5, 6.5], rots: 8 });
    tick = 0;
    for (const r of [1.5, 2.5, 3.5, 4.5, 5.5, 6.5]) for (let k = 0; k < 8; k++) {
      clearG(); AV.bigStar(40, 40, r, k * (Math.PI / 2) / 8, dark, r > 3);
      sh.add(off, 40 - 11, 40 - 11);
    }
    sh.done();
  }
  bakeBig('bigstar', false); bakeBig('bigstar_clone', true);
  for (const [name, map] of [['star', null], ['star_clone', AV.CLONE_MAP]]) {
    const sh = Sheet(name, 5, 5, 2, { px: 2, py: 2 });
    for (let f = 0; f < 2; f++) { clearG(); AV.setMap(map); AV.smallStar(20, 20, f, 35, C.steel); AV.setMap(null); sh.add(off, 18, 18); }
    sh.done();
  }

  // ------------------------------------------------------------------ fx
  { const sh = Sheet('puff', 26, 26, 10, { px: 13, py: 13, fps: 24 });
    for (let i = 0; i < 10; i++) { clearG(); AV.drawPuff({ x: 40, y: 40, r: 7, t: i / 10 * 0.42, life: 0.42, s: 17 }); sh.add(off, 27, 27); }
    sh.done(); }
  { const sh = Sheet('xslash', 44, 44, 10, { px: 22, py: 22, fps: 30 });
    dum.theta = 0; dum.lift = 0; dum.shiver = 0;
    const cx = dumX(0, -18), cy = dumY(-18);
    for (let i = 0; i < 30; i++) { clearG(); AV.setXT(i / 30); tick = i * 2; AV.drawX(); sh.add(off, cx - 22, cy - 22); }
    AV.setXT(-1); sh.done(); }
  { const sh = Sheet('slasharc', 40, 40, 11, { px: 20, py: 20, fps: 60, perKind: 11 });
    for (const kind of [0, 1]) for (let i = 0; i < 11; i++) { clearG(); AV.drawSlashArc({ kind, t: i / 60 }); sh.add(off, DX - 1 - 20, GY - 18 - 20); }
    sh.done(); }

  // ------------------------------------------------------------------ dummy + scenery
  for (const k of ['normal', 'flash', 'shadow']) png('dummy_' + k, DUMMY_SKINS[k]);
  OUT.atlas.dummy = { w: DSW, h: DSH };
  time = 0;
  png('bg_far', bgFar);
  png('bg_mid', bgMid);
  CLOUDS.forEach((c, i) => {
    const len = c[2], cv2 = mk(len + 2, 3); use(cv2.getContext('2d'));
    for (let row = 0; row < 3; row++) {
      const w = row === 0 ? len * 0.55 : row === 1 ? len : len * 0.75, ox = row === 0 ? len * 0.2 : row === 2 ? len * 0.12 : 0;
      for (let q = 0; q < w; q++) { const x = Math.round(ox + q), edge = Math.min(q, w - q) / 5; if (edge < 1 && bay(x, c[1] + row) > edge) continue; px(x, row, row === 2 ? 4 : 5); }
    }
    use(g); png('cloud' + i, cv2); OUT.atlas.clouds.push({ x: c[0], y: c[1], len, speed: c[3] });
  });
  // seamless fog tiles (periodic value noise, 32 cells of 12px = 384px)
  function pnoise(x, y) {
    const P2 = 32, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => hash(((a % P2) + P2) % P2, b);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  for (const [name, y0, y1, c, dens, c2] of [['fog1', 55, 64, 5, 0.62, 6], ['fog2', 64, 69, 4, 0.5, -1]]) {
    const fc = mk(384, y1 - y0 + 1); use(fc.getContext('2d'));
    const mid = (y0 + y1) / 2, half = (y1 - y0) / 2 + 0.5;
    for (let y = y0; y <= y1; y++) { const k = 1 - Math.abs(y - mid) / half; for (let x = 0; x < 384; x++) { const n = pnoise(x / 12, y / 2.5 + c * 7) * k; if (n > 1 - dens) px(x, y - y0, c2 >= 0 && n > 1.1 - dens * 0.55 ? c2 : c); } }
    use(g); png(name, fc); OUT.atlas[name] = { y: y0 };
  }
  { const sh = Sheet('fire', 48, 19, 12, { x: FX - 24, y: GY - 16, fps: 12 });
    for (let i = 0; i < 12; i++) { clearG(); time = i / 12 + 0.013; drawFireLight(); drawFire(); sh.add(off, FX - 24, GY - 16); }
    sh.done(); }
  { const sh = Sheet('banner', 12, 30, 10, { x: BX - 1, y: 42, fps: 5 });
    for (let i = 0; i < 10; i++) { clearG(); time = i / 5 + 0.01; drawBanner(); sh.add(off, BX - 1, 42); }
    sh.done(); }

  // ------------------------------------------------------------------ boss: King Shroom
  // Drawn into an index grid, then auto-outlined in ink, so every pose keeps a clean 1px silhouette.
  function Grid(w, h) {
    const a = new Int16Array(w * h).fill(-1);
    return {
      w, h, a,
      set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) a[y * w + x] = c; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? a[y * w + x] : -1; },
      outline() {
        const b = a.slice();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] < 0) {
          if (this.get(x - 1, y) >= 0 || this.get(x + 1, y) >= 0 || this.get(x, y - 1) >= 0 || this.get(x, y + 1) >= 0) b[y * w + x] = 0;
        }
        a.set(b);
      },
      toCanvas(white) { const c = mk(w, h); use(c.getContext('2d')); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = a[y * w + x]; if (v >= 0) px(x, y, white ? 35 : v); } use(g); return c; },
    };
  }
  const BW = 56, BH = 52, BFX = 28, BFY = 50;   // frame size, feet anchor (centre column, bottom row)
  function shroom(o) {
    const G2 = Grid(BW, BH), cx = BFX, sq = o.sq || 1;
    const hS = Math.round(19 * sq), wS = Math.round(22 / Math.sqrt(sq));
    const sBot = BFY - 3, sTop = sBot - hS + 1;
    // feet
    for (const [fx, off] of [[-7, o.feet || 0], [7, -(o.feet || 0)]]) for (let y = 0; y < 3; y++) for (let x = -3; x <= 3; x++) {
      if ((y === 2 && Math.abs(x) === 3)) continue;
      G2.set(cx + fx + off + x, BFY - 2 + y, y === 2 ? C.robeW3 : C.robeW2);
    }
    // stalk (rounded bottom corners, lit from the left)
    for (let y = sTop; y <= sBot; y++) {
      let hw = Math.floor(wS / 2) - (y >= sBot - 1 ? (y === sBot ? 2 : 1) : 0);
      for (let x = -hw; x <= hw; x++) G2.set(cx + x, y, x >= hw - 2 ? C.robeW2 : x <= -hw ? C.robeW0 : C.robeW1);
    }
    // face
    const ey = sTop + 5;
    if (o.eyes === 'x') { for (const ex of [-6, 5]) { G2.set(cx + ex - 1, ey - 1, 0); G2.set(cx + ex + 1, ey - 1, 0); G2.set(cx + ex, ey, 0); G2.set(cx + ex - 1, ey + 1, 0); G2.set(cx + ex + 1, ey + 1, 0); } }
    else if (o.eyes === 'squint') { for (const ex of [-6, 5]) { G2.set(cx + ex - 1, ey, 0); G2.set(cx + ex, ey + (ex < 0 ? 1 : 0), 0); G2.set(cx + ex + 1, ey, 0); } }
    else {
      for (const ex of [-6, 5]) for (let y = 0; y < 3; y++) { G2.set(cx + ex, ey + y, 0); G2.set(cx + ex + 1, ey + y, y === 0 ? 35 : 0); }
      // angry brows slanting down toward the middle
      for (let k = 0; k < 4; k++) { G2.set(cx - 8 + k, ey - 3 + (k >> 1), C.crim3); G2.set(cx + 8 - k, ey - 3 + (k >> 1), C.crim3); }
    }
    const my = ey + 5;
    if (o.mouth) {
      for (let y = 0; y < 4; y++) for (let x = -4; x <= 4; x++) { if ((y === 3 || y === 0) && Math.abs(x) === 4) continue; G2.set(cx + x, my + y, y === 0 ? 0 : y === 3 ? 0 : C.crim4); }
      G2.set(cx - 2, my + 1, 35); G2.set(cx + 2, my + 1, 35); G2.set(cx, my + 2, C.crim2);
    } else {
      for (let x = -3; x <= 3; x++) G2.set(cx + x, my, 0);
      G2.set(cx - 4, my + 1, 0); G2.set(cx + 4, my + 1, 0);
    }
    // cap: upper half-ellipse sitting on the stalk, dark underside rim, cream spots, highlight
    const rx = Math.round(26 / Math.sqrt(sq)), ry = Math.round(16 * sq), ccy = sTop + 1;
    for (let y = -ry; y <= 3; y++) for (let x = -rx; x <= rx; x++) {
      const e = (x * x) / (rx * rx) + (Math.min(y, 0) * Math.min(y, 0)) / (ry * ry);
      if (e > 1) continue;
      if (y > 0 && Math.abs(x) > rx - 2 - y) continue;
      let c = y >= 1 ? C.crim3 : C.crim2;
      const hx = x + rx * 0.38, hy = y + ry * 0.55;
      if (y < 1 && hx * hx / (rx * rx * 0.12) + hy * hy / (ry * ry * 0.1) < 1) c = C.crim1;
      if (y < 1 && x > rx * 0.55 && e > 0.55) c = C.crim3;
      G2.set(cx + x, ccy + y, c);
    }
    for (const [fx, fy, r] of [[-0.55, -0.42, 3.6], [0.08, -0.72, 3.0], [0.55, -0.38, 4.0], [-0.12, -0.3, 2.4], [0.85, -0.1, 2.2], [-0.88, -0.1, 2.0]]) {
      const sx = cx + fx * rx, sy = ccy + fy * ry;
      for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
        if (x * x + y * y > r * r) continue;
        const X0 = Math.round(sx + x), Y0 = Math.round(sy + y);
        if (G2.get(X0, Y0) !== C.crim2 && G2.get(X0, Y0) !== C.crim1) continue;
        G2.set(X0, Y0, x + y > r * 0.6 ? C.robeW2 : C.robeW0);
      }
    }
    // crown
    const ct = ccy - ry;
    for (let x = -4; x <= 4; x++) { G2.set(cx + x, ct, C.goldD); G2.set(cx + x, ct - 1, C.gold); }
    for (const sx of [-4, 0, 4]) { G2.set(cx + sx, ct - 2, C.gold); G2.set(cx + sx, ct - 3, sx === 0 ? C.holy0 : C.gold); }
    G2.set(cx, ct - 1, C.crim1);
    G2.outline();
    return G2;
  }
  const BOSS_ANIMS = [
    ['idle', 5, 1, [{ sq: 1 }, { sq: 0.94 }]],
    ['walk', 8, 1, [{ sq: 1, feet: 2 }, { sq: 0.92 }, { sq: 1, feet: -2 }, { sq: 1.06 }]],
    ['crouch', 10, 0, [{ sq: 0.78 }]],
    ['jump', 10, 0, [{ sq: 1.16, feet: 0 }]],
    ['land', 10, 0, [{ sq: 0.72, mouth: 1 }]],
    ['spit', 8, 1, [{ sq: 1, mouth: 1 }, { sq: 1.05, mouth: 1 }]],
    ['hurt', 10, 0, [{ sq: 0.94, eyes: 'squint' }]],
    ['die', 10, 0, [{ sq: 0.82, eyes: 'x', mouth: 1 }]],
  ];
  for (const white of [false, true]) {
    const name = white ? 'boss_white' : 'boss';
    const sh = Sheet(name, BW, BH, 16, { px: BFX, py: BFY });
    const anims = {}; let i = 0;
    for (const [an, fps, loop, frames] of BOSS_ANIMS) {
      const idx = [];
      for (const f of frames) { sh.add(shroom(f).toCanvas(white), 0, 0); idx.push(i++); }
      anims[an] = { fps, loop: !!loop, frames: idx };
    }
    sh.done(); OUT.atlas.sheets[name].anims = anims;
  }
  { // spore (2 frames), tombstone, meso coin (4 frames), HP bar icon
    const sp = Sheet('spore', 7, 7, 2, { px: 3, py: 3 });
    for (let f = 0; f < 2; f++) {
      const G2 = Grid(7, 7);
      for (let x = -2; x <= 2; x++) G2.set(3 + x, 2 + (Math.abs(x) === 2 ? 1 : 0), C.crim2);
      for (let x = -1; x <= 1; x++) G2.set(3 + x, 1, C.crim1);
      G2.set(3 + (f ? 1 : -1), 2, C.robeW0); G2.set(3, 3, C.robeW1); G2.set(3, 4, C.robeW2);
      G2.outline(); sp.add(G2.toCanvas(false), 0, 0);
    }
    sp.done();
    const tomb = Grid(12, 15);
    for (let y = 2; y < 14; y++) for (let x = 1; x < 11; x++) { if (y < 4 && (x < 3 || x > 8)) continue; if (y === 2 && (x < 4 || x > 7)) continue; tomb.set(x, y, x > 8 ? C.armor2 : x < 2 ? C.armor0 : C.armor1); }
    for (let y = 4; y < 10; y++) tomb.set(6, y, C.armor3); for (let x = 4; x < 9; x++) tomb.set(x, 6, C.armor3);
    for (let x = 0; x < 12; x++) tomb.set(x, 14, C.dirt);
    tomb.outline(); { const c = tomb.toCanvas(false); png('tomb', c); }
    const coin = Sheet('coin', 5, 5, 4, { px: 2, py: 2 });
    for (const w of [3, 2, 1, 2]) {
      const G2 = Grid(5, 5);
      for (let y = 1; y <= 3; y++) for (let x = 2 - (w >> 1); x < 2 - (w >> 1) + w; x++) G2.set(x, y, x === 2 - (w >> 1) && w > 1 ? C.holy0 : C.gold);
      G2.set(2, 0, C.goldD); G2.set(2, 4, C.goldD); if (w === 3) { G2.set(1, 1, C.gold); G2.set(3, 3, C.goldD); }
      coin.add(G2.toCanvas(false), 0, 0);
    }
    coin.done();
    const ic = Grid(14, 14);
    for (let y = -5; y <= 1; y++) for (let x = -6; x <= 6; x++) { if (x * x / 36 + (Math.min(y, 0) ** 2) / 25 > 1) continue; ic.set(7 + x, 7 + y, y >= 1 ? C.crim3 : C.crim2); }
    ic.set(4, 4, C.robeW0); ic.set(5, 4, C.robeW0); ic.set(9, 3, C.robeW0); ic.set(10, 5, C.robeW0);
    for (let y = 9; y <= 12; y++) for (let x = 4; x <= 10; x++) ic.set(x, y, x > 8 ? C.robeW2 : C.robeW1);
    ic.set(5, 10, 0); ic.set(8, 10, 0);
    for (let x = 5; x <= 9; x++) ic.set(x, 1, C.gold); ic.set(5, 0, C.gold); ic.set(7, 0, C.gold); ic.set(9, 0, C.gold);
    ic.outline(); png('boss_icon', ic.toCanvas(false));
  }

  // ------------------------------------------------------------------ fonts + callouts + icons
  FONT['.'] = '000000000000010'; FONT[':'] = '000010000010000'; FONT['/'] = '001001010100100'; FONT['%'] = '101001010100101'; FONT['+'] = '000010111010000';
  FONT['('] = '010100100100010'; FONT[')'] = '010001001001010'; FONT[','] = '000000000010100'; FONT['?'] = '111001010000010'; FONT["'"] = '010010000000000'; FONT['['] = '110100100100110'; FONT[']'] = '011001001001011';
  const GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-!./%:+ (),?\'[]';
  OUT.atlas.glyphs = GLYPHS;
  const STY = {
    dmg: [[C.dmgY, C.dmgY, C.dmgO, C.dmgO, C.dmgR], C.dmgK, 1], crit: [[C.critP, C.critR, C.critR, C.critD, C.critD], C.critK, 1],
    critBig: [[C.critP, C.critR, C.critR, C.critD, C.critD], C.critK, 2], gold: [[C.holy0, C.gold, C.gold, C.goldD, C.goldD], 0, 1],
    white: [[35, 35, C.steel, C.steel, C.hair1], 0, 1], vio: [[C.vio0, C.vio1, C.vio1, C.vio2, C.vio2], 0, 1],
    goldBig: [[C.holy0, C.gold, C.gold, C.goldD, C.goldD], 0, 2], whiteBig: [[35, 35, C.steel, C.steel, C.hair1], 0, 2],
    blue: [[C.ice0, C.ice1, C.ice1, C.ice2, C.ice2], 0, 1], green: [[C.holy0, C.grassL, C.grassL, C.grass, C.grass], 0, 1],
    dark: [[C.sky3, C.sky3, C.sky4, C.sky4, C.sky4], -1, 1],
  };
  for (const k in STY) {
    const [cols, ol, s] = STY[k], cw = 3 * s + 2, ch = 5 * s + 2;
    const sh = Sheet('font_' + k, cw, ch, GLYPHS.length, { scale: s, adv: 4 * s });
    for (const gch of GLYPHS) { clearG(); text(gch, 20, 20, cols, ol, s); sh.add(off, 19, 20 - 1 + 0); }
    sh.done();
  }
  { clearG(); const sx = 22, sy = 22; // crit star (5x5)
    px(sx, sy - 2, C.critP); px(sx - 1, sy - 1, C.critR); px(sx, sy - 1, C.critP); px(sx + 1, sy - 1, C.critR);
    px(sx - 2, sy, C.critR); px(sx - 1, sy, C.critP); px(sx, sy, 35); px(sx + 1, sy, C.critP); px(sx + 2, sy, C.critR);
    px(sx - 1, sy + 1, C.critR); px(sx, sy + 1, C.critP); px(sx + 1, sy + 1, C.critR); px(sx, sy + 2, C.critP);
    const c = mk(5, 5); c.getContext('2d').drawImage(off, 20, 20, 5, 5, 0, 0, 5, 5); png('critstar', c); }
  for (const name of ['AVENGER', 'ASSASSINATE', 'SHADOW PARTNER', 'KING SHROOM', 'BOSS CLEAR', 'RUSH', 'WORLDREAVER', 'DRAGON FURY', 'BLIZZARD', 'METEOR', 'ICE STRIKE', 'ANGEL RAY', 'GENESIS', 'HEAL', 'POWER SHOT', 'HURRICANE', 'ARROW BOMB']) {
    const key = 'call_' + name.split(' ')[0].toLowerCase();
    const sh = Sheet(key, 192, 18, 8, { y: 2, fps: 30 });
    for (let i = 0; i < 69; i++) { clearG(); callName = name; callT = i / 30; tick = i * 2; drawCallout(); sh.add(off, 0, 2); }
    callT = -1; sh.done();
  }
  { // hotbar icons 14x14: triple, avenger, assassinate, partner, flash jump
    const sh = Sheet('icons', 14, 14, 5, {});
    const O = 30;
    clearG(); R(O, O, 14, 14, C.vio5); for (const [x, y] of [[4, 10], [7, 7], [10, 4]]) AV.smallStar(O + x, O + y, 1, 35, C.steel); sh.add(off, O, O);
    clearG(); R(O, O, 14, 14, C.vio5); AV.bigStar(O + 7, O + 7, 5, 0.3, false, false); sh.add(off, O, O);
    clearG(); R(O, O, 14, 14, C.vio5); for (let k = -4; k <= 4; k++) { px(O + 7 + k, O + 7 + k, k ? C.vio0 : 35); px(O + 7 + k, O + 7 - k, k ? C.vio1 : 35); px(O + 8 + k, O + 7 + k, C.vio2); } sh.add(off, O, O);
    clearG(); R(O, O, 14, 14, C.vio5); AV.setMap(AV.CLONE_MAP); setLegs('stand'); AV.drawNinja(S(P.ready), O + 9, 0, -1); AV.setMap(null);
    { const tmp = mk(14, 14); tmp.getContext('2d').drawImage(off, O + 1, GY - 13, 14, 14, 0, 0, 14, 14); clearG(); R(O, O, 14, 14, C.vio5); g.drawImage(tmp, O, O + 1); } sh.add(off, O, O);
    clearG(); R(O, O, 14, 14, C.vio5); for (let k = 0; k < 3; k++) { line(O + 2 + k * 3, O + 11 - k, O + 5 + k * 3, O + 11 - k, k === 2 ? 35 : C.vio2); } px(O + 11, O + 4, 35); px(O + 10, O + 5, C.vio1); px(O + 12, O + 5, C.vio1); line(O + 11, O + 5, O + 11, O + 8, C.vio0); sh.add(off, O, O);
    sh.done();
  }

  // ------------------------------------------------------------------ audio
  async function renderSnd(name, dur, a, b) {
    const sr = 44100, oc = new OfflineAudioContext(1, Math.ceil(sr * dur), sr);
    const m = oc.createGain(); m.gain.value = 0.7; m.connect(oc.destination);
    SND[name](oc, m, 0.001, a, b);
    return await oc.startRendering();
  }
  function wav(buf, loopXfade) {
    let d = buf.getChannelData(0);
    if (loopXfade) { // crossfade tail into head for a seamless loop
      const n = Math.floor(buf.sampleRate * loopXfade), body = d.length - n, out = new Float32Array(body);
      for (let i = 0; i < body; i++) out[i] = d[i];
      for (let i = 0; i < n; i++) { const t = i / n; out[i] = d[i] * t + d[body + i] * (1 - t); }
      d = out;
    } else { // trim trailing silence
      let e = d.length - 1; while (e > 100 && Math.abs(d[e]) < 1e-4) e--; d = d.subarray(0, e + 1);
    }
    const n = d.length, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, clamp(d[i], -1, 1) * 32767, true);
    let bin = ''; const u8 = new Uint8Array(ab);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  window.BK = { Sheet, png, Grid, OUT, clearG, shroom, wav, renderSnd, NANIMS, setLegs, AV, S, P };
  if (window.RPG_ART) window.RPG_ART(window.BK);
  for (const k of Object.keys(window).filter(k => k.startsWith('RPG_CLASS_')).sort()) window[k](window.BK);
  window.BAKE = async function () {
    const list = [['hit', 0.5], ['hitBig', 1], ['whoosh', 0.8, 0.3], ['charge', 1.2, 0.5], ['star', 0.3], ['stick', 0.3], ['tink', 0.3], ['whirr', 1.2, 0.8],
      ['grind', 0.8], ['shing', 0.8], ['swish', 0.4], ['poof', 0.6], ['blink', 0.4], ['slash', 0.6], ['xslash', 1.4], ['coin', 0.5]];
    for (const [n, d, a] of list) OUT.audio[n] = wav(await renderSnd(n, d, a));
    // ambient pad loop
    const sr = 44100, oc = new OfflineAudioContext(1, sr * 18, sr), m = oc.createGain(); m.gain.value = 0.7; m.connect(oc.destination);
    const gg = oc.createGain(); gg.gain.value = 0.05; const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; gg.connect(f); f.connect(m);
    for (const fr of [98, 146.8, 174.6, 233.1]) for (const det of [-4, 4]) { const os = oc.createOscillator(); os.type = 'triangle'; os.frequency.value = fr; os.detune.value = det; os.connect(gg); os.start(0); }
    OUT.audio.bgm = wav(await oc.startRendering(), 2);
    if (window.RPG_AUDIO) Object.assign(OUT.audio, await window.RPG_AUDIO(window.BK));
    return OUT;
  };
})();
