// Shadow Strike: HERO (warrior) class. The steel knight from src/skills/06-dragon.js (Dragon Fury):
// steel plate, red cape + plume, big broadsword, crimson crescents, spectral dragon, Rush and Worldreaver.
// Kit: J Slash, K Rush (brandish = its finisher), L Dragon Fury, U Worldreaver (slam + quake), SP Leap.
// Sheets: pc_hero, pc_hero_ghost (anims incl. rush, slam), portrait_pc_hero, icons_hero (j k l u sp),
// fx_hero_slash, fx_hero_brandish, fx_hero_dragon, fx_hero_rush, fx_hero_slam, fx_hero_quake.
window.RPG_CLASS_HERO = function (BK) {
  const { Sheet, png, Grid } = BK;
  const FW = 48, FH = 40, CX = 24, FY = 37;     // frame, anchor column, feet row
  const LB = 11, TIP = LB + 2;                  // blade length, hand -> tip distance
  const WHITE = 35;

  // ------------------------------------------------------------------ layered index grids
  function Lay(w, h) {
    w = w || FW; h = h || FH;
    const a = new Int16Array(w * h).fill(-1);
    return {
      w, h, a,
      set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) a[y * w + x] = c; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? a[y * w + x] : -1; },
    };
  }
  // composite layer L over grid G; sep = draw an ink seam where L overlaps existing pixels
  function comp(G, L, sep) {
    const { w, h } = L;
    if (sep) {
      const seam = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (L.get(x, y) >= 0 || G.get(x, y) < 0) continue;
        if (L.get(x - 1, y) >= 0 || L.get(x + 1, y) >= 0 || L.get(x, y - 1) >= 0 || L.get(x, y + 1) >= 0) seam.push(x, y);
      }
      for (let i = 0; i < seam.length; i += 2) G.set(seam[i], seam[i + 1], 0);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = L.get(x, y); if (v >= 0) G.set(x, y, v); }
  }
  function toCanvasMap(G, map) {
    const c = mk(G.w, G.h); use(c.getContext('2d'));
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { const v = G.get(x, y); if (v >= 0) px(x, y, map ? map[v] : v); }
    use(g); return c;
  }
  // capsule from (x0,y0) to (x1,y1), radius r; cf(s) picks the colour from s = light-side offset (+ = lit, upper-left)
  function caps(L, x0, y0, x1, y1, r, cf) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1e-6;
    for (let y = Math.floor(Math.min(y0, y1) - r - 1); y <= Math.ceil(Math.max(y0, y1) + r + 1); y++)
      for (let x = Math.floor(Math.min(x0, x1) - r - 1); x <= Math.ceil(Math.max(x0, x1) + r + 1); x++) {
        const t = clamp(((x - x0) * dx + (y - y0) * dy) / l2, 0, 1);
        const ox = x - (x0 + dx * t), oy = y - (y0 + dy * t);
        if (ox * ox + oy * oy > r * r + 0.01) continue;
        L.set(x, y, cf(-(ox + oy) * 0.7071, t));
      }
  }
  const rows = (L, S, x0, y0) => { for (let r = 0; r < S.length; r++) for (let c = 0; c < S[r].length; c++) if (S[r][c] >= 0) L.set(x0 + c, y0 + r, S[r][c]); };

  const KL = { o: 0, A: C.armor0, B: C.armor1, D: C.armor2, E: C.armor3, v: 0, p: C.red, P: C.redD, q: C.crim1, g: C.gold, G: C.goldD, s: C.steel };
  const HELM = sprite([
    '.ABBB.',
    'ABBBBD',
    'ABBBBD',
    'Bvvvvv',
    'BBBDvD',
    'DBBDDD',
  ], KL);
  const TORSO = sprite([
    '..EDDE..',
    'BBABBBDD',
    'BABBBBDD',
    'BBBgGBDD',
    'BABGBBDD',
    '.BBBBDD.',
    '.ggGgGG.',
    '.BDDEBD.',
  ], KL);
  const PAUL_F = sprite(['.AAB.', 'ABBBD', 'BBBDD', '.DDE.'], KL);
  const PAUL_B = sprite(['DDD', 'DEE', '.E.'], KL);

  // ------------------------------------------------------------------ parts
  function sword(L, hx, hy, sa, hot, mask, fl) {
    const dx = Math.cos(sa), dy = Math.sin(sa), qx = -dy, qy = dx;
    const P = (i, k, c) => { const x = Math.round(hx + dx * i + qx * k), y = Math.round(hy + dy * i + qy * k); L.set(x, y, c); if (mask && i >= 1.5) mask.add(y * L.w + x); };
    const bw = i => { const r = i - 2; return r > LB - 3 ? Math.max(0, (LB - r) / 3) : 1; };
    // grip + pommel (behind the hand)
    for (let i = -3; i <= 0.5; i += 0.5) P(i, 0, (Math.floor(i) & 1) ? C.redD : C.red);
    P(-3.5, 0, C.gold); P(-3.5, 0.6, C.goldD); P(-3.5, -0.6, C.gold);
    // blade
    for (let i = 2; i <= LB + 2; i += 0.5) {
      const w = bw(i);
      for (let k = -w; k <= w + 0.01; k += 0.5) {
        let c;
        if (hot) c = Math.abs(k) < 0.4 ? WHITE : k < 0 ? C.crim0 : (fl ? C.crim1 : C.crim0);
        else c = k < -0.4 ? C.armor0 : k > 0.4 ? C.armor2 : (i > 3.5 && i < LB - 1 ? C.armor1 : C.steel);
        P(i, k, c);
      }
    }
    // guard
    for (let k = -2.5; k <= 2.5; k += 0.5) P(1, k, Math.abs(k) > 1.9 ? C.goldD : C.gold);
    P(1.5, 0, C.goldD);
  }
  function gauntlet(L, hx, hy, far) {
    hx = Math.round(hx); hy = Math.round(hy);
    L.set(hx - 1, hy - 1, far ? C.armor2 : C.armor0); L.set(hx, hy - 1, far ? C.armor2 : C.armor0);
    L.set(hx - 1, hy, far ? C.armor3 : C.armor1); L.set(hx, hy, far ? C.armor3 : C.armor2);
  }
  const shade = (hi, mid, lo) => s => (s > 0.45 ? hi : s < -0.45 ? lo : mid);
  function leg(L, hip, ank, far, toeDown) {
    const L1 = 3.8, L2 = 3.8;
    const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = Math.hypot(dx, dy) || 1;
    let kx = hip[0] + dx / 2, ky = hip[1] + dy / 2;
    if (d < L1 + L2) { const hh = Math.sqrt(L1 * L1 - d * d / 4); kx += dy / d * hh; ky -= dx / d * hh; }
    const cf = far ? shade(C.armor1, C.armor2, C.armor3) : shade(C.armor0, C.armor1, C.armor2);
    caps(L, hip[0], hip[1], kx, ky, 1.25, cf);
    caps(L, kx, ky, ank[0], ank[1], 1.1, cf);
    L.set(kx + 1, ky, far ? C.armor1 : C.armor0);   // knee cop
    const ax = Math.round(ank[0]), ay = Math.round(ank[1]);
    const b1 = far ? C.armor3 : C.armor2, b2 = far ? C.armor3 : C.armor3;
    if (toeDown) {
      for (let y = 0; y < 3; y++) for (let x = -1; x <= 0; x++) L.set(ax + x + (y > 1 ? 1 : 0), ay + y, y ? b2 : b1);
      L.set(ax + 1, ay + 1, b2);
    } else {
      for (let x = -1; x <= 1; x++) L.set(ax + x, ay, b1);
      for (let x = -1; x <= 2; x++) L.set(ax + x, ay + 1, b2);
    }
  }
  function cape(L, x0, y0, len, st, lift, ph) {
    for (let r = 0; r < len; r++) {
      const f = r / len;
      const wv = Math.round(Math.sin(r * 0.6 - ph * 1.57) * f * 1.6);
      const left = Math.round(x0 - 1 - r * (0.28 + st * 1.1) + wv);
      const y = y0 + Math.floor(r * (1 - st * 0.55 - lift));
      const right = x0 + 4;
      for (let x = left; x < right; x++) L.set(x, y, C.red);
      if (r > 2) L.set(left + 1, y, C.redD);
      if (((r + ph) % 4) < 2 && right - left > 5) L.set(left + 3, y, C.redD);
      if (r === len - 1) for (let x = left; x < right; x++) L.set(x, y, C.redD);
    }
  }
  function plume(L, x0, y0, st, ph) {
    // crest on top of the helmet sweeping back (left) and down
    L.set(x0 + 1, y0 + 1, C.red); L.set(x0 + 1, y0, C.crim1);
    for (let s = 0; s <= 7; s++) {
      const wv = Math.round(Math.sin(s * 0.9 - ph * 1.57) * (s / 7) * st * 1.2);
      const x = x0 - s, y = y0 - 1 + Math.round(s * s * 0.1 * (1 - st * 0.7)) + wv;
      L.set(x, y, s < 4 ? C.crim1 : C.red);
      if (s < 6) L.set(x, y + 1, s < 3 ? C.red : C.redD);
      if (s < 3) L.set(x, y + 2, C.redD);
    }
  }

  // ------------------------------------------------------------------ the knight
  // pose: lean, cr (crouch), bob, fb/ff far/near ankle [x rel CX, y abs, toeDown], sa sword angle,
  // h hand rel front shoulder, two (two-handed), bh far hand rel far shoulder, st cape stream, lift, ph phase,
  // pst plume stream, glow, smear [a0,a1], eye, hd [dx,dy] extra head offset
  function knight(p) {
    const G = Grid(FW, FH);
    const ux = p.lean || 0, cr = p.cr || 0, uy = cr + (p.bob || 0), ph = p.ph || 0;
    const hipY = 29 + cr, hsh = Math.round(ux * 0.5);
    const SX = CX + 3 + ux, SY = 23 + uy, BSX = CX - 3 + ux, BSY = 23 + uy;
    const hx = SX + p.h[0], hy = SY + p.h[1];
    const behind = Math.cos(p.sa) < -0.3 && !p.two;
    const mask = new Set();
    const fl = ph & 1;
    // cape
    { const L = Lay(); cape(L, BSX, BSY - 1, 12 - Math.round((p.st || 0) * 2), p.st || 0, p.lift || 0, ph); comp(G, L); }
    // sword behind the body
    if (behind) { const L = Lay(); sword(L, hx, hy, p.sa, p.glow, mask, fl); comp(G, L); }
    // far arm
    { const L = Lay(); const cf = shade(C.armor2, C.armor2, C.armor3);
      if (p.two) { caps(L, BSX, BSY, hx - 2, hy + 1, 1, cf); gauntlet(L, hx - 1, hy + 1, true); }
      else { const bx = BSX + p.bh[0] - 1, by = BSY + p.bh[1]; caps(L, BSX - 1, BSY, bx, by, 1, cf); gauntlet(L, bx, by, true); }
      comp(G, L); }
    // legs
    { const L = Lay(); leg(L, [CX - 2 + hsh, hipY], [CX + p.fb[0], p.fb[1]], true, p.fb[2]); comp(G, L); }
    { const L = Lay(); leg(L, [CX + 1 + hsh, hipY], [CX + p.ff[0], p.ff[1]], false, p.ff[2]); comp(G, L, true); }
    // torso, far pauldron, head, plume
    { const L = Lay(); rows(L, TORSO, CX - 4 + ux, 21 + uy); comp(G, L); }
    { const L = Lay(); rows(L, PAUL_B, CX - 6 + ux, 22 + uy); comp(G, L); }
    { const L = Lay(), hux = ux + (p.hd ? p.hd[0] : 0), huy = uy + (p.hd ? p.hd[1] : 0);   // hd: extra head offset (hunched charge)
      rows(L, HELM, CX - 2 + hux, 15 + huy); plume(L, CX + hux, 14 + huy, p.pst || 0, ph);
      if (p.eye) { L.set(CX + 2 + hux, 18 + huy, fl ? WHITE : C.crim1); L.set(CX + 3 + hux, 18 + huy, C.crim1); }
      comp(G, L); }
    // front arm + sword
    { const L = Lay();
      if (p.smear) {
        const [a0, a1] = p.smear, n = 14;
        for (let i = 0; i <= n; i++) {
          const a = a0 + (a1 - a0) * i / n, t = i / n;
          if (t < 0.25) continue;
          L.set(hx + Math.cos(a) * TIP, hy + Math.sin(a) * TIP, t > 0.6 ? C.armor0 : C.steel);
          if (t > 0.5) L.set(hx + Math.cos(a) * (TIP - 1), hy + Math.sin(a) * (TIP - 1), t > 0.8 ? C.steel : C.armor1);
        }
      }
      if (!behind) sword(L, hx, hy, p.sa, p.glow, mask, fl);
      caps(L, SX, SY, hx, hy, 1, shade(C.armor0, C.armor1, C.armor2));
      gauntlet(L, hx, hy, false);
      rows(L, PAUL_F, SX - 2, SY - 2);
      comp(G, L, true); }
    G.outline();
    // hot blade: crimson outline + sparks
    if (p.glow) {
      const w = FW;
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        if (G.get(x, y) !== 0) continue;
        let near = false;
        for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) if (mask.has((y + oy) * w + x + ox)) { near = true; break; }
        if (near) G.set(x, y, (fl && hash(x, y) > 0.5) ? C.crim1 : C.crim2);
      }
      const dx = Math.cos(p.sa), dy = Math.sin(p.sa);
      for (let i = 3; i <= LB + 1; i++) if (hash(i, ph + 5) > 0.72) {
        const side = hash(i, ph + 9) > 0.5 ? 1 : -1;
        const x = hx + dx * i - dy * side * 3, y = hy + dy * i + dx * side * 3;
        if (G.get(x, y) < 0) G.set(x, y, C.crim1);
      }
    }
    const tip = [hx + Math.cos(p.sa) * TIP, hy + Math.sin(p.sa) * TIP];
    return { G, hand: [Math.round(tip[0]) - CX, FY - Math.round(tip[1])] };
  }

  // ------------------------------------------------------------------ back view (rope / ladder)
  function climb(k) {
    const G = Grid(FW, FH);
    const bob = k & 1, x0 = CX - 6, top = 15 + bob;
    const legUp = k === 0 ? 0 : k === 2 ? 1 : -1;   // which leg is raised
    // legs
    for (const side of [0, 1]) {
      const L = Lay(), hx = CX - 2 + side * 3, up = legUp === side;
      const ay = up ? 33 : 36, ax = hx + (up ? (side ? 1 : -1) : 0);
      const kx = hx + (up ? (side ? 2 : -2) : 0), ky = up ? 31 : 32;
      const cf = shade(C.armor1, C.armor2, C.armor3);
      caps(L, hx, 29 + bob, kx, ky, 1.2, cf); caps(L, kx, ky, ax, ay, 1.1, cf);
      for (let x = -1; x <= 1; x++) { L.set(ax + x, ay, C.armor3); L.set(ax + x, ay + 1, C.armor3); }
      comp(G, L, true);
    }
    // sword slung across the back: hilt over the left shoulder, tip below the cape hem (drawn first, the cape covers it)
    { const L = Lay(); sword(L, CX - 5, 20 + bob, Math.atan2(15, 9), 0, null, 0); comp(G, L); }
    // torso (back plate, mostly under the cape)
    { const L = Lay(); for (let y = 21; y <= 28; y++) for (let x = -4; x <= 3; x++) L.set(CX + x, y + bob, x < -2 ? C.armor1 : x > 1 ? C.armor3 : C.armor2);
      for (let x = -3; x <= 2; x++) L.set(CX + x, 28 + bob, x & 1 ? C.goldD : C.gold); comp(G, L); }
    // cape from the shoulders, hem sways
    { const L = Lay(), sw = [0, 1, 0, -1][k];
      for (let r = 0; r < 9; r++) {
        const y = 21 + bob + r, spread = Math.floor(r / 4), off = Math.round(sw * r / 8);
        const l = CX - 5 - spread + off, rr = CX + 4 + spread + off;
        for (let x = l; x <= rr; x++) L.set(x, y, x === l + 1 ? C.red : x > rr - 2 ? C.redD : ((x - l + r + k) % 5 === 0 && r > 2) ? C.redD : C.red);
        if (r === 8) for (let x = l; x <= rr; x++) L.set(x, y, C.redD);
      }
      comp(G, L); }
    // helmet back + plume down the middle
    { const L = Lay();
      const HB = sprite(['.ABBB.', 'ABBBBD', 'ABBBBD', 'BBBBDD', 'BBBDDD', '.DDDD.'], KL);
      rows(L, HB, CX - 3, top);
      for (let y = top - 2; y <= top + 5; y++) { L.set(CX - 1, y, y < top ? C.crim1 : C.red); L.set(CX, y, y < top ? C.red : C.redD); }
      L.set(CX - 1, top - 3, C.crim1);
      comp(G, L); }
    // pauldrons + arms reaching up the rope
    const arm = (sx, sy, hx, hy, side) => {
      const L = Lay(), ex = sx + (side ? 2 : -2), ey = Math.round((sy + hy) / 2) + 1;
      caps(L, sx, sy, ex, ey, 1, shade(C.armor0, C.armor1, C.armor2)); caps(L, ex, ey, hx, hy, 1, shade(C.armor0, C.armor1, C.armor2));
      gauntlet(L, hx + 1, hy + 1, false);
      rows(L, sprite(side ? ['.BBD', 'BBDD', '.DE.'] : ['ABB.', 'ABBD', '.DD.'], KL), side ? sx - 1 : sx - 2, sy - 1);
      comp(G, L, true);
    };
    const high = 11 + bob, low = 17 + bob;
    const lh = k === 0 ? high : low, rh = k === 2 ? high : (k === 0 ? low + 1 : low);
    arm(CX - 5, 22 + bob, CX - 1, lh, 0);
    arm(CX + 4, 22 + bob, CX, rh, 1);
    G.outline();
    return { G, hand: [0, 22] };
  }

  // ------------------------------------------------------------------ anims
  const B = (o) => Object.assign({ lean: 0, cr: 0, bob: 0, fb: [-3, 36], ff: [2, 36], sa: -1.1, h: [2, 4], bh: [-1, 5], st: 0, lift: 0, ph: 0, pst: 0 }, o);
  const ANIMS = [
    ['idle', 6, 1, [B({ ph: 0 }), B({ ph: 1 }), B({ ph: 2, bob: 1 }), B({ ph: 3, bob: 1 })]],
    ['run', 12, 1, [
      B({ fb: [-6, 34, 1], ff: [5, 36], cr: 1, lean: 1, sa: -0.75, h: [3, 3], bh: [-3, 3], st: 0.8, pst: 0.8, ph: 0 }),
      B({ fb: [-3, 32, 1], ff: [0, 36], cr: -1, lean: 1, sa: -0.8, h: [3, 2], bh: [-1, 4], st: 0.8, pst: 0.8, ph: 1 }),
      B({ fb: [5, 36], ff: [-6, 34, 1], cr: 1, lean: 1, sa: -0.7, h: [4, 3], bh: [2, 3], st: 0.8, pst: 0.8, ph: 2 }),
      B({ fb: [0, 36], ff: [-3, 32, 1], cr: -1, lean: 1, sa: -0.8, h: [3, 2], bh: [0, 5], st: 0.8, pst: 0.8, ph: 3 })]],
    ['jump', 10, 0, [B({ fb: [-4, 33, 1], ff: [3, 32], sa: -0.85, h: [3, -1], bh: [-3, 2], st: 0.3, pst: 0.4, ph: 1 })]],
    ['fall', 10, 1, [B({ fb: [-3, 36, 1], ff: [3, 35, 1], sa: -1.2, h: [2, -3], bh: [-4, -1], lift: 0.6, pst: 0.6, ph: 0 }),
      B({ fb: [-3, 36, 1], ff: [3, 35, 1], sa: -1.25, h: [2, -3], bh: [-4, -2], lift: 0.7, pst: 0.7, ph: 2 })]],
    ['jump2', 12, 0, [B({ fb: [-2, 32, 1], ff: [3, 31], cr: 1, lean: 1, sa: 0.55, h: [3, 2], bh: [-3, 1], st: 0.9, pst: 0.8, ph: 1 }),
      B({ fb: [-7, 36, 1], ff: [4, 31], lean: 1, sa: -1.05, h: [3, -5], bh: [-4, 1], st: 1, pst: 1, ph: 3 })]],
    ['attack', 16, 0, [
      B({ sa: -2.45, h: [-2, -4], lean: -1, fb: [-3, 36], ff: [3, 36], bh: [-3, 3], st: 0.2, ph: 0 }),
      B({ sa: -0.95, h: [3, -4], lean: 1, cr: 1, fb: [-4, 36], ff: [4, 36], bh: [-2, 4], st: 0.4, ph: 1 }),
      B({ sa: 0.2, h: [4, 1], lean: 2, cr: 2, fb: [-5, 36], ff: [5, 36], bh: [-3, 3], st: 0.5, ph: 2 }),
      B({ sa: 0.75, h: [4, 3], lean: 1, cr: 2, fb: [-5, 36], ff: [5, 36], bh: [-2, 4], st: 0.3, ph: 3 })]],
    ['cast', 8, 1, [B({ two: 1, sa: -1.57, h: [0, -3], cr: 1, glow: 1, eye: 1, fb: [-4, 36], ff: [3, 36], st: 0.3, pst: 0.3, ph: 0 }),
      B({ two: 1, sa: -1.57, h: [0, -3], cr: 1, glow: 1, eye: 1, fb: [-4, 36], ff: [3, 36], st: 0.35, pst: 0.4, ph: 1 })]],
    ['skill', 12, 0, [
      B({ two: 1, sa: 0.1, h: [-3, 1], lean: -1, cr: 2, fb: [-5, 36], ff: [4, 36], glow: 1, eye: 1, st: 0.3, ph: 0 }),
      B({ two: 1, sa: 0, h: [3, 0], lean: 2, cr: 1, fb: [-6, 36], ff: [6, 36], glow: 1, eye: 1, st: 0.6, pst: 0.5, ph: 1 }),
      B({ two: 1, sa: 0, h: [3, 0], lean: 2, cr: 1, fb: [-6, 36], ff: [6, 36], glow: 1, eye: 1, st: 0.7, pst: 0.6, ph: 2 })]],
    ['climb', 8, 1, [{ back: 0 }, { back: 1 }, { back: 2 }, { back: 3 }]],
    ['crouch', 10, 0, [B({ cr: 3, fb: [-5, 36], ff: [4, 36], sa: 0.75, h: [3, 3], bh: [-2, 4], st: 0.1, ph: 1 })]],
    ['hurt', 10, 0, [B({ lean: -2, cr: 1, fb: [-2, 36], ff: [5, 34], sa: -2.9, h: [-3, -2], bh: [-5, 0], lift: 0.3, ph: 2 })]],
    // appended (keep earlier frame indices stable): K Rush charge, U Worldreaver leap + plant
    ['rush', 12, 1, [
      B({ two: 1, sa: 0.2, h: [4, 4], lean: 3, cr: 2, hd: [1, 1], fb: [-8, 35, 1], ff: [6, 36], glow: 1, eye: 1, st: 0.9, pst: 1, ph: 0 }),
      B({ two: 1, sa: 0.24, h: [4, 5], lean: 3, cr: 1, hd: [1, 1], fb: [4, 35], ff: [-7, 34, 1], glow: 1, eye: 1, st: 0.95, pst: 1, ph: 2 })]],
    ['slam', 12, 0, [
      B({ two: 1, sa: -1.95, h: [-1, -9], lean: -1, cr: -1, fb: [-4, 32, 1], ff: [3, 31], glow: 1, eye: 1, st: 0.3, lift: 0.3, pst: 0.6, ph: 1 }),
      B({ two: 1, sa: 1.42, h: [5, -2], lean: 2, cr: 3, hd: [1, 1], fb: [-6, 36], ff: [4, 36], glow: 1, eye: 1, st: 0.4, pst: 0.4, ph: 3 })]],
  ];

  const R_ = (pairs) => { const m = PAL.map((_, i) => i); for (const [a, b] of pairs) m[a] = b; return m; };
  const GHOST = R_([[0, C.vio3], [C.armor0, C.vio0], [C.steel, C.vio0], [C.armor1, C.vio1], [C.armor2, C.vio1], [C.armor3, C.vio2],
    [C.red, C.vio1], [C.redD, C.vio2], [C.crim0, WHITE], [C.crim1, C.vio0], [C.crim2, C.vio1], [C.crim3, C.vio2], [C.crim4, C.vio3],
    [C.gold, C.vio0], [C.goldD, C.vio1]]);

  const frames = [];
  const anims = {};
  for (const [an, fps, loop, list] of ANIMS) {
    const idx = [];
    for (const p of list) { frames.push(p.back !== undefined ? climb(p.back) : knight(p)); idx.push(frames.length - 1); }
    anims[an] = { fps, loop: !!loop, frames: idx };
  }
  for (const [name, map] of [['pc_hero', null], ['pc_hero_ghost', GHOST]]) {
    const sh = Sheet(name, FW, FH, 8, { px: CX, py: FY });
    for (const f of frames) sh.add(toCanvasMap(f.G, map), 0, 0, f.hand);
    sh.done();
    const A = BK.OUT.atlas.sheets[name]; A.anims = anims; A.hands = A.extra; delete A.extra;
  }

  // ------------------------------------------------------------------ portrait 34x34
  {
    const G = Grid(34, 34);
    const el = (cx, cy, rx, ry, cf) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) G.set(x, y, cf(dx, dy, x, y)); } };
    // cape behind the shoulders
    for (let y = 22; y < 34; y++) for (let x = 2; x < 16; x++) { if (x < 2 + Math.max(0, 26 - y)) continue; G.set(x, y, x < 5 + (y & 1) ? C.redD : (x + y) % 6 === 0 ? C.redD : C.red); }
    // chest plate + gold emblem
    for (let y = 25; y < 34; y++) for (let x = 9; x < 27; x++) G.set(x, y, x < 12 ? C.armor0 : x > 22 ? C.armor2 : C.armor1);
    for (let y = 28; y < 32; y++) for (let x = 16 - (31 - y > 1 ? 1 : 0); x <= 18 + (31 - y > 1 ? 1 : 0); x++) G.set(x, y, x > 17 ? C.goldD : C.gold);
    G.set(17, 32, C.goldD);
    // far pauldron (left) and near pauldron (right)
    el(8, 26, 5, 3.6, (dx, dy) => (dy < -0.4 ? C.armor1 : dx > 0.5 ? C.armor3 : C.armor2));
    el(27, 26, 6.5, 4.5, (dx, dy) => (dy < -0.45 && dx < 0.3 ? C.armor0 : dx > 0.55 || dy > 0.55 ? C.armor2 : C.armor1));
    for (let x = 22; x <= 32; x++) G.set(x, 29, x & 1 ? C.goldD : C.gold);
    // gorget
    for (let y = 21; y < 25; y++) for (let x = 12; x < 23; x++) G.set(x, y, y === 24 ? C.armor3 : x < 14 ? C.armor1 : C.armor2);
    // helmet dome
    el(18, 13, 8, 9, (dx, dy) => (dx < -0.55 && dy < 0.3 ? C.armor0 : dx > 0.6 || dy > 0.72 ? C.armor2 : dy < -0.6 && dx < 0.2 ? C.armor0 : C.armor1));
    for (let y = 5; y <= 12; y++) G.set(18 + (y > 9 ? 1 : 0), y, C.steel);           // centre ridge highlight
    // plume: a crest riding the top of the helm, sweeping back and down behind it
    for (let s = 0; s <= 17; s++) {
      const x = 21 - s, y = 1 + Math.round(Math.max(0, s - 4) * Math.max(0, s - 4) * 0.075), th = Math.max(2, Math.round(5 - Math.max(0, s - 6) * 0.25));
      for (let t = 0; t < th; t++) G.set(x, y + t, t === 0 ? (s < 12 ? C.crim1 : C.red) : t === th - 1 ? C.redD : (s + t) % 5 === 0 ? C.redD : C.red);
    }
    for (let x = 11; x <= 26; x++) G.set(x, 12, x < 14 ? C.gold : x > 23 ? C.goldD : C.gold);   // brow band
    for (let x = 14; x <= 26; x++) { G.set(x, 15, 0); G.set(x, 16, 0); }                     // visor slit
    G.set(13, 15, C.armor3); G.set(13, 16, C.armor3);
    G.set(19, 15, C.crim1); G.set(20, 15, WHITE); G.set(23, 15, C.crim1); G.set(24, 15, WHITE); G.set(20, 16, C.crim2); G.set(24, 16, C.crim2);
    for (const [x, y] of [[21, 19], [23, 19], [22, 20], [24, 20]]) G.set(x, y, C.armor3);  // breathing holes
    G.outline();
    const face = G.toCanvas(false);
    const c = mk(34, 34); use(c.getContext('2d'));
    for (let y = 0; y < 34; y++) for (let x = 0; x < 34; x++) { const d = Math.hypot(x - 17, y - 14) / 22; px(x, y, bay(x, y) < (1 - d) * 0.9 ? C.vio4 : C.vio5); }
    // faint crimson rage glow behind the helm
    for (let y = 3; y < 26; y++) for (let x = 5; x < 31; x++) { const d = Math.hypot(x - 18, y - 13) / 13; if (d < 1 && bay(x, y) < (1 - d) * 0.35) px(x, y, C.crim4); }
    c.getContext('2d').drawImage(face, 0, 0);
    R(0, 0, 34, 1, 0); R(0, 33, 34, 1, 0); R(0, 0, 1, 34, 0); R(33, 0, 1, 34, 0);
    R(1, 1, 32, 1, C.gold); R(1, 1, 1, 32, C.gold); R(1, 32, 32, 1, C.goldD); R(32, 1, 1, 32, C.goldD);
    R(2, 2, 30, 1, 0); R(2, 31, 30, 1, 0); R(2, 2, 1, 30, 0); R(31, 2, 1, 30, 0);
    for (const [x, y] of [[1, 1], [32, 1], [1, 32], [32, 32]]) px(x, y, C.holy0);
    use(g);
    png('portrait_pc_hero', c);
  }

  // ------------------------------------------------------------------ FX helpers (drawn into their own canvases)
  function canvasOf(w, h, fn) { const c = mk(w, h); use(c.getContext('2d', { willReadFrequently: true })); fn(); use(g); return c; }
  const HF = [0.4, 0.74, 1, 1, 1, 1];
  // crescent sword arc from 06-dragon.js drawArc; stage 0..5
  function drawArc(cx, cy, a0, a1, stage, RO, MT) {
    if (stage < 0 || stage > 5) return;
    const head = HF[stage], span = a1 - a0, dir = span < 0 ? -1 : 1, as = Math.abs(span);
    const cut = stage >= 3 ? (stage - 2) * 0.24 : 0;
    const dis = stage >= 3 ? (stage - 2) * 0.22 : 0;
    for (let y = Math.floor(cy - RO - 1); y <= cy + RO + 1; y++) for (let x = Math.floor(cx - RO - 1); x <= cx + RO + 1; x++) {
      const ddx = x - cx, ddy = y - cy, r = Math.hypot(ddx, ddy);
      if (r > RO + 0.5 || r < RO - MT - 1) continue;
      let da = (Math.atan2(ddy, ddx) - a0) * dir;
      da = ((da % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const u = da / as;
      if (u > head || u < cut) continue;
      const v = u / head;
      const w = MT * Math.pow(Math.sin(Math.PI * Math.pow(v, 1.5)), 0.8) * (stage >= 3 ? 1 - (stage - 2) * 0.18 : 1);
      const d = RO - r;
      if (d > w || d < -0.5) continue;
      if (dis > 0 && bay(x, y) < dis * (1.3 - v)) continue;
      let c;
      const fresh = stage < 3;
      if (d < 1.2) c = v > 0.35 ? WHITE : C.crim0;
      else if (d < w * 0.45) c = v > 0.55 && fresh ? C.crim0 : C.crim1;
      else if (d < w * 0.8) c = v > 0.3 ? C.crim1 : C.crim2;
      else c = v > 0.3 ? C.crim2 : C.crim3;
      if (!fresh && d < 1.2) c = C.crim0;
      px(x, y, c);
    }
    if (stage < 3) {
      const ha = a0 + span * head;
      const tx = cx + Math.cos(ha) * (RO + 1), ty = cy + Math.sin(ha) * (RO + 1);
      px(tx, ty, WHITE); px(tx + 1, ty, WHITE); px(tx, ty + 1, C.crim0);
      for (let q = 0; q < 4; q++) {
        const a = ha - dir * (0.2 + hash(stage, q) * 0.5), rr2 = RO + 2 + hash(q, stage + 3) * 3;
        px(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2, q & 1 ? C.crim1 : C.crim0);
      }
    }
  }
  { const sh = Sheet('fx_hero_slash', 48, 40, 6, { px: 24, py: 20, fps: 24, anims: { play: { fps: 24, loop: false, frames: [0, 1, 2, 3, 4, 5] } } });
    for (let f = 0; f < 6; f++) sh.add(canvasOf(48, 40, () => drawArc(22, 20, -1.95, 1.05, f, 18, 7)), 0, 0);
    sh.done(); }
  { const sh = Sheet('fx_hero_brandish', 72, 56, 8, { px: 36, py: 28, fps: 24, anims: { play: { fps: 24, loop: false, frames: [0, 1, 2, 3, 4, 5, 6, 7] } } });
    for (let f = 0; f < 8; f++) sh.add(canvasOf(72, 56, () => {
      drawArc(33, 29, 0.95, -2.25, f, 25, 8.5);          // upper sweep (up-slash)
      drawArc(33, 27, -2.0, 1.05, f - 2, 21, 7.5);        // lower sweep (down-slash)
    }), 0, 0);
    sh.done(); }

  // ------------------------------------------------------------------ dragon (06-dragon.js drawHead / drawBody)
  const HL = { o: C.crim4, d: C.crim3, m: C.crim2, l: C.crim1, w: C.crim0, W: WHITE, e: C.fireY, t: WHITE };
  const DHEAD = sprite([
    'wl..................',
    '.wll................',
    '..wlll...o..........',
    '...lllooolo.........',
    '..ooddmmmmoooo......',
    '.odmmmmwwlllllooo...',
    'odmmmmmeWlllllllloo.',
    'odmmmmmmmmlllllllllo',
    'odmmmmmmmmmmmmmmmmwo',
    '.oddmmmmmmmmmmmmmmoo',
    '..ooddddtdtdtdtdtoo.',
  ], HL);
  const DJAW = sprite([
    '...odtdtdtdtdtdo....',
    '....oddmmmmmmmo.....',
    '.....ooooooooo......',
  ], HL);
  function drawHead(x0, y0, open, step) {
    for (let r = 2; r < 11; r++) {
      const len = 2 + Math.floor(hash(step, r) * 5) + (r > 4 && r < 9 ? 2 : 0);
      for (let k = 0; k < len; k++) px(x0 + 1 - k, y0 + r - Math.floor(k / 3), k > len - 2 ? C.crim3 : k > len / 2 ? C.crim2 : C.crim1);
    }
    const off = c => c > 3 ? Math.round(open * (c - 3) / 15) : 0;
    if (open > 0) for (let c = 4; c < 18; c++) {
      const o = off(c);
      for (let y = 0; y < o; y++) px(x0 + c, y0 + 11 + y, y === 0 ? C.crim3 : c > 6 && y > 0 && y < o ? ((c + step) & 1 ? C.fireY : C.crim0) : C.crim4);
    }
    drawRows(DHEAD, x0, y0);
    for (let r = 0; r < DJAW.length; r++) for (let c = 0; c < DJAW[r].length; c++) { const v = DJAW[r][c]; if (v >= 0) px(x0 + c, y0 + 11 + r + off(c), v); }
    if (step & 1) px(x0 + 8, y0 + 6, WHITE);
  }
  function drawBody(L, step) {
    const fl = step & 1;
    for (let j = L.length - 1; j >= 0; j--) { const [x, y, r, i] = L[j]; if (r > 1) { px(x, y - r - 2, C.crim4); if (i & 1) { px(x, y - r - 3, C.crim4); px(x - 1, y - r - 2, C.crim4); } } disc(x, y, r + 1, C.crim4); }
    for (let j = L.length - 1; j >= 0; j--) { const [x, y, r, i] = L[j]; disc(x, y, r, C.crim2); if (r > 1) { px(x, y - r - 1, C.crim1); if (i & 1) px(x, y - r - 2, fl ? C.crim0 : C.crim1); } }
    for (let j = L.length - 1; j >= 0; j--) {
      const [x, y, r, i] = L[j];
      if (r > 1) { R(x - r + 1, y - r + 1, r, 1, C.crim1); R(x - r + 2, y + r - 1, r * 2 - 3, 1, C.crim3); }
      if (r > 2) { px(x - 1, y - r + 1, C.crim0); if ((i + step) % 3 === 0) px(x, y, C.crim1); }
    }
  }
  { const sh = Sheet('fx_hero_dragon', 72, 36, 4, { px: 60, py: 18, fps: 12, anims: { play: { fps: 12, loop: true, frames: [0, 1, 2, 3] } } });
    const OPEN = [0, 3, 5, 3], NS = 15;
    for (let f = 0; f < 4; f++) sh.add(canvasOf(72, 36, () => {
      const segs = [];
      for (let i = 1; i <= NS; i++) {
        const tp = 1 - i / NS;
        const x = 50 - i * 3.2, env = Math.min(1, i / 4);
        const y = 19 + Math.sin(i * 0.62 - f * Math.PI / 2) * 3.5 * env;
        segs.push([Math.round(x), Math.round(y), Math.max(1, Math.round(1 + 3 * Math.pow(tp, 0.7))), i]);
      }
      drawBody(segs, f);
      // embers shed by the body
      for (let q = 0; q < 6; q++) { const e = segs[Math.floor(hash(q, f + 11) * segs.length)]; px(e[0] + Math.round(hash(q, f) * 4 - 2), e[1] - e[2] - 3 - Math.floor(hash(f, q + 2) * 4), q & 1 ? C.crim1 : C.crim2); }
      drawHead(47, 11 + (f === 2 ? -1 : 0), OPEN[f], f);
    }), 0, 0);
    sh.done(); }

  // ------------------------------------------------------------------ FX grid helpers (index grids, coloured outlines)
  function outlineC(G, c) {
    const b = G.a.slice();
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (G.a[y * G.w + x] < 0) {
      if (G.get(x - 1, y) >= 0 || G.get(x + 1, y) >= 0 || G.get(x, y - 1) >= 0 || G.get(x, y + 1) >= 0) b[y * G.w + x] = c;
    }
    G.a.set(b);
  }
  function blit(G) { for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { const v = G.a[y * G.w + x]; if (v >= 0) px(x, y, v); } }
  // a small tumbling rock chunk (s = 1..3) into grid G, optional hot crimson rim
  function chunk(G, x, y, s, hot, spin) {
    x = Math.round(x); y = Math.round(y);
    const w = s + (spin & 1), h = Math.max(1, s - (spin & 1));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let c = w * h === 1 ? C.rock0 : i === 0 && j === 0 ? C.burlap : (i === w - 1 && j === h - 1) ? C.rock1 : C.rock0;
      if (hot && ((i === w - 1 && j === 0) || (w === 1 && h === 1))) c = hot > 1 ? C.crim0 : C.crim1;
      G.set(x + i, y + j, c);
    }
  }

  // ------------------------------------------------------------------ K: Rush bow-wave (sits in front of the charging knight)
  { const FWR = 40, FHR = 32, yc = 17, gy = 31;
    const sh = Sheet('fx_hero_rush', FWR, FHR, 4, { px: 8, py: 31, fps: 16, anims: { play: { fps: 16, loop: true, frames: [0, 1, 2, 3] } } });
    for (let f = 0; f < 4; f++) sh.add(canvasOf(FWR, FHR, () => {
      // horizontal speed streaks scrolling back (period 40px = 4 frames x 10px)
      for (let q = 0; q < 10; q++) {
        const y = 3 + Math.floor(hash(q, 41) * 25);
        const len = 5 + Math.floor(hash(q, 42) * 9);
        const x1 = ((Math.floor(hash(q, 43) * 40) - f * 10) % 40 + 40) % 40;
        for (let k = 0; k < len; k++) {
          const x = x1 - k;
          if (x > 27 || x < (y < 8 ? 0 : 11)) continue;
          px(x, y, k === 0 ? (q & 1 ? WHITE : C.crim0) : k < 3 ? C.crim1 : k < len * 0.7 ? C.crim2 : C.crim3);
        }
      }
      // ripples travelling forward inside the cone (3 arcs, 8px period)
      for (let i = 0; i < 2; i++) {
        const off = (f * 2 + i * 4) % 8, xr = 30 - 8 + off, span = 6 + off * 0.6;
        for (let y = Math.round(yc - span); y <= yc + span; y++) {
          const dy = y - yc, x = xr - 0.1 * dy * dy;
          px(x, y, off > 5 ? C.crim1 : off > 2 ? C.crim2 : C.crim3);
          if (Math.abs(dy) < span * 0.5 && off > 3) px(x - 1, y, C.crim3);
        }
      }
      // the bow wave: a bright crescent bulging forward at chest height
      const xf = 34 + (f & 1);
      for (let y = yc - 13; y <= yc + 13; y++) {
        const dy = y - yc, t = Math.abs(dy) / 13;
        const xe = Math.round(xf - 0.075 * dy * dy + (hash(y, f + 3) > 0.8 ? 1 : 0) * (t > 0.3 ? 1 : 0));
        const th = Math.round(4.2 * (1 - t * t)) + 1;
        for (let k = th - 1; k >= 0; k--) {
          const c = k === 0 ? (t < 0.75 ? WHITE : C.crim0) : k === 1 ? (t < 0.5 ? C.crim0 : C.crim1) : k < th - 1 ? C.crim1 : C.crim2;
          px(xe - k, y, c);
        }
        if (th > 2 && ((y + f) & 3) === 0) px(xe - th, y, C.crim3);
      }
      // spray flecks ahead of the wave
      for (let q = 0; q < 5; q++) {
        const a = (hash(q, f + 20) - 0.5) * 2.2, r = 2 + hash(q, f + 21) * 3;
        const x = xf + 1 + Math.cos(a) * r, y = yc + Math.sin(a) * 10 * (0.6 + hash(q, f + 22) * 0.4);
        if (x < FWR) px(x, y, q & 1 ? C.crim0 : C.crim1);
      }
      // dust kicked up at the ground line, drifting back and billowing (each puff cycles over the 4 frames)
      const puff = (bx, by, r) => {
        for (let y = Math.floor(by - r); y <= by + r; y++) for (let x = Math.floor(bx - r); x <= bx + r; x++) {
          if (y > gy) continue;
          const d = Math.hypot(x - bx, (y - by) * 1.9) / r;
          if (d > 1 || hash(x, y + f * 7) < (d > 0.7 ? 0.6 : 0.3)) continue;
          px(x, y, (y - by) < -r * 0.3 && (x - bx) < r * 0.4 ? C.burlap : C.burlapD);
        }
      };
      for (let q = 0; q < 3; q++) {
        const ph = ((f + q * 1.33) % 4) / 4, sz = ph < 0.7 ? 1.5 + ph * 3.5 : (1 - ph) * 13;
        puff(15 - q * 4 - ph * 10, gy - 1 - ph * 2, sz);
      }
      // sparks skidding off the front foot
      for (let q = 0; q < 4; q++) px(12 + Math.floor(hash(q, f + 30) * 10), gy - Math.floor(hash(q, f + 31) * 4), q & 1 ? C.crim1 : C.crim0);
    }), 0, 0);
    sh.done(); }

  // ------------------------------------------------------------------ U: Worldreaver impact (sword driven into the ground)
  { const FWS = 96, FHS = 56, cx = 48, gy = 55, NF = 10;
    const sh = Sheet('fx_hero_slam', FWS, FHS, 5, { px: 48, py: 55, fps: 24, anims: { play: { fps: 24, loop: false, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] } } });
    const rocks = [];
    for (let q = 0; q < 16; q++) {
      const side = q & 1 ? 1 : -1;
      rocks.push({ x0: cx + side * (1 + hash(q, 65) * 6), vx: side * (1 + hash(q, 61) * 3.6), vy: -(2.6 + hash(q, 62) * 3.6),
        s: 1 + Math.floor(hash(q, 63) * 2.6), t0: hash(q, 64) < 0.6 ? 1 : 2, hot: hash(q, 66) < 0.5 });
    }
    // jagged cracks along the ground line, both ways, with little upward forks
    const cracks = [];
    for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
      const pts = []; let y = gy - (k ? 2 : 0), x = cx + side * (k ? 3 : 1);
      const len = k ? 26 : 44;
      for (let i = 0; i < len; i++) {
        pts.push([x, y]);
        x += side;
        const h = hash(i + k * 50, side + 7);
        if (h < 0.2 && y < gy) y++; else if (h > 0.8 && y > gy - 3) y--;
      }
      cracks.push(pts);
    }
    for (let f = 0; f < NF; f++) sh.add(canvasOf(FWS, FHS, () => {
      const G = Grid(FWS, FHS);
      // dome: expanding half ellipse of crimson energy
      if (f >= 1 && f <= 7) {
        const e = easeOut((f - 1) / 6), rx = 9 + 38 * e, ry = 6 + 22 * e, th = f < 4 ? 3.2 : f < 6 ? 2.2 : 1.4;
        for (let y = Math.floor(gy - ry - 1); y <= gy; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
          const d = Math.hypot((x - cx) / rx, (y - gy) / ry), dd = (1 - d) * Math.min(rx, ry);
          if (dd < -0.5) continue;
          if (dd > th) { if (f <= 2 && bay(x, y) < (f === 1 ? 0.2 : 0.07) && dd < th + 5) G.set(x, y, f === 1 ? C.crim2 : C.crim3); continue; }
          if (f >= 5 && bay(x, y) < (f - 4) * 0.22) continue;
          G.set(x, y, dd < 0.8 ? (f <= 3 ? WHITE : f <= 5 ? C.crim0 : C.crim1) : dd < 1.8 ? (f <= 4 ? C.crim1 : C.crim2) : f <= 4 ? C.crim2 : C.crim3);
        }
      }
      // ground shock front skimming outward on both sides
      if (f >= 1 && f <= 8) {
        const e = easeOut((f - 1) / 7), xr = 10 + 36 * e, hgt = f < 5 ? 6 - (f - 1) * 0.5 : 4 - (f - 5);
        for (const side of [-1, 1]) {
          const x0 = cx + side * xr;
          for (let y = Math.round(gy - hgt); y <= gy; y++) {
            const t = (gy - y) / Math.max(1, hgt), lean = Math.round(t * t * 3) * side;
            const x = Math.round(x0 - lean);
            G.set(x, y, f < 6 ? (t < 0.6 ? WHITE : C.crim0) : C.crim1);
            G.set(x - side, y, f < 6 ? C.crim1 : C.crim2);
            if (t < 0.7) G.set(x - side * 2, y, C.crim2);
            if (t < 0.4) G.set(x - side * 3, y, C.crim3);
          }
          for (let k = 3; k < 3 + xr * 0.35; k++) if (bay(Math.round(x0 - side * k), gy) < 0.6 - k * 0.03) G.set(x0 - side * k, gy, C.crim2);
        }
      }
      // glowing cracks: grow f1..f4, cool f6..f9
      if (f >= 1) {
        const grow = Math.min(1, f / 4);
        for (let ci = 0; ci < cracks.length; ci++) {
          const pts = cracks[ci], n = Math.floor(pts.length * grow);
          for (let i = 0; i < n; i++) {
            const [x, y] = pts[i], u = i / pts.length;
            let c;
            if (f <= 5) c = u < 0.15 && f < 4 ? WHITE : u < 0.45 ? C.crim0 : u < 0.8 ? C.crim1 : C.crim2;
            else c = f === 6 ? (u < 0.4 ? C.crim1 : C.crim2) : f === 7 ? (u < 0.5 ? C.crim2 : C.crim3) : C.crim3;
            if (f >= 8 && bay(x, y) < (f - 7) * 0.3 + u * 0.3) continue;
            G.set(x, y, c);
            if (f <= 6 && (i % 7 === 3) && y > gy - 3) { G.set(x, y - 1, C.crim2); if (f < 5) G.set(x + (ci & 1 ? 1 : -1), y - 2, C.crim3); }
          }
        }
      }
      // central flash: white star + light pillar
      if (f <= 3) {
        const r = [4, 6, 4.5, 2.5][f];
        for (let y = Math.floor(gy - r * 1.3); y <= gy; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
          const d = Math.hypot(x - cx, (y - gy) / 1.3);
          if (d > r) continue;
          G.set(x, y, f >= 3 ? (d < r * 0.5 ? C.crim0 : C.crim1) : d < r * 0.6 ? WHITE : C.crim0);
        }
        const pl = [30, 44, 34, 18][f], pw = [1, 2, 1, 0][f];
        for (let y = gy - pl; y < gy - r; y++) {
          const t = (gy - y) / pl;
          for (let k = -pw - 1; k <= pw + 1; k++) {
            if (Math.abs(k) > pw * (1 - t) + 0.5 + (Math.abs(k) > pw ? 0 : 1)) continue;
            const c = Math.abs(k) <= pw * (1 - t) ? (f < 2 ? WHITE : C.crim0) : f < 2 ? C.crim0 : C.crim1;
            if (f === 3 && bay(cx + k, y) < t) continue;
            G.set(cx + k, y, c);
          }
        }
        if (f <= 2) { const hs = [14, 22, 16][f]; for (let x = -hs; x <= hs; x++) { const t = Math.abs(x) / hs; G.set(cx + x, gy - 1, t < 0.5 ? WHITE : C.crim0); if (t < 0.7) G.set(cx + x, gy - 2, C.crim1); } }
      }
      // embers
      if (f >= 2) for (let q = 0; q < 14; q++) {
        const tt = f - 2 + hash(q, 81) * 2, a = -Math.PI / 2 + (hash(q, 82) - 0.5) * 2.6, sp = 2 + hash(q, 83) * 3;
        const x = cx + Math.cos(a) * sp * tt * 1.4, y = gy - 4 + Math.sin(a) * sp * tt + 0.25 * tt * tt;
        if (y > gy || tt > 7.5) continue;
        G.set(x, y, tt < 3 ? C.crim0 : tt < 5 ? C.crim1 : C.crim2);
      }
      outlineC(G, C.crim4);
      // dust billows where the shock front runs out
      if (f >= 4) for (const side of [-1, 1]) for (let q = 0; q < 2; q++) {
        const e = (f - 4) / 5, bx = cx + side * (24 + q * 12 + e * 8), by = gy - 2 - e * 4 - q;
        const r = (2.5 + e * 3 + q * 0.6) * (e > 0.55 ? 1 - (e - 0.55) * 1.5 : 1);
        for (let y = Math.floor(by - r); y <= gy; y++) for (let x = Math.floor(bx - r); x <= bx + r; x++) {
          const d = Math.hypot(x - bx, (y - by) * 1.3) / r;
          if (d > 1 || G.get(x, y) >= 0 || (d > 0.75 && hash(x, y + f * 5) < 0.5)) continue;
          G.set(x, y, (y - by) < -r * 0.3 && (x - bx) * side < r * 0.4 ? C.burlap : C.burlapD);
        }
      }
      blit(G);
      // shattered ground chunks (ink outlined, drawn on top)
      const RG = Grid(FWS, FHS);
      for (let q = 0; q < rocks.length; q++) {
        const r = rocks[q], tt = f - r.t0 + 1;
        if (tt < 0) continue;
        const x = r.x0 + r.vx * tt * 1.5, y = gy - 2 + r.vy * tt * 1.6 + 0.62 * tt * tt;
        if (y > gy - 1 && tt > 1) { if (f < 9 && tt < 6) chunk(RG, x, gy - 1, 1, 0, 0); continue; }
        chunk(RG, x, y, tt < 1 ? Math.min(2, r.s) : r.s, r.hot && tt < 4 ? (tt < 2 ? 2 : 1) : 0, q + f);
      }
      RG.outline();
      blit(RG);
    }), 0, 0);
    sh.done(); }

  // ------------------------------------------------------------------ U: Worldreaver quake segment (spawned repeatedly along the ground)
  { const FWQ = 24, FHQ = 56, cx = 12, gy = 55, NF = 10;
    const sh = Sheet('fx_hero_quake', FWQ, FHQ, 5, { px: 12, py: 55, fps: 24, anims: { play: { fps: 24, loop: false, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] } } });
    const HT = [0, 14, 31, 44, 47, 45, 40, 24, 0, 0];
    // one jagged spike: tip (tx, gy - h), base half-width bw; jag seeds per spike
    function spike(G, bx, h, bw, lean, seed, f, crumble) {
      if (h < 2) return;
      for (let y = gy - Math.round(h); y <= gy; y++) {
        const t = (gy - y) / h;                     // 0 base .. 1 tip
        const mid = bx + lean * t;
        const j1 = (hash(Math.floor(y / 3), seed) - 0.5) * 1.8 * (1 - t), j2 = (hash(Math.floor((y + 1) / 3), seed + 5) - 0.5) * 1.8 * (1 - t);
        const hw = bw * Math.pow(1 - t, 0.85);
        const xl = Math.round(mid - hw + j1), xr = Math.round(mid + hw + j2);
        for (let x = xl; x <= xr; x++) {
          if (crumble > 0 && t > 1 - crumble && hash(x >> 1, (y >> 1) + seed * 31) < 0.3 + (t - (1 - crumble)) * 1.5) continue;
          const rel = (x - mid) / Math.max(0.6, hw);
          let c;
          if (Math.abs(x - mid) < 0.75 && t < 0.88) c = f >= 3 && f <= 5 ? WHITE : C.crim0;
          else if (Math.abs(x - mid) < 1.6 && t < 0.7) c = C.crim0;
          else c = rel < -0.2 ? C.crim1 : rel < 0.45 ? C.crim2 : C.crim3;
          if (t > 0.9) c = f >= 3 && f <= 5 ? C.crim0 : C.crim1;
          G.set(x, y, c);
        }
        // cracked strata lines across the spike
        if (((y + seed) % 5) === 0 && t < 0.8 && t > 0.05) G.set(Math.round(mid + hw * 0.5), y, C.crim3);
      }
    }
    for (let f = 0; f < NF; f++) sh.add(canvasOf(FWQ, FHQ, () => {
      const G = Grid(FWQ, FHQ), h = HT[f];
      const crumble = f === 6 ? 0.35 : f === 7 ? 0.7 : 0;
      // side shards first, then the main spike
      spike(G, cx - 4, h * 0.5, 2.6, -3, 11, f, crumble);
      spike(G, cx + 4, h * 0.38, 2.2, 2.5, 17, f, crumble);
      spike(G, cx, h, 4.6, 1, 3, f, crumble);
      // glowing fissure on the ground
      const hotC = f <= 5 ? 0 : f - 5;
      for (let x = 1; x < FWQ - 1; x++) {
        const d = Math.abs(x - cx) / 11;
        if (d > (f === 0 ? 0.55 : 1) || (f >= 8 && bay(x, gy) < (f - 7) * 0.35 + d * 0.3)) continue;
        const y = gy - (hash(x >> 1, 91) < 0.3 ? 1 : 0);
        const c = [[WHITE, C.crim0, C.crim1], [C.crim0, C.crim1, C.crim2], [C.crim1, C.crim2, C.crim2], [C.crim1, C.crim2, C.crim3], [C.crim2, C.crim3, C.crim3]][hotC][d < 0.3 ? 0 : d < 0.65 ? 1 : 2];
        if (G.get(x, y) < 0) G.set(x, y, c);
        if (y === gy && G.get(x, gy - 1) < 0 && f <= 7 && d < 0.4) G.set(x, gy - 1, hotC < 2 ? C.crim2 : C.crim3);
      }
      // falling fragments while it crumbles
      if (f >= 6 && f <= 8) for (let q = 0; q < 7; q++) {
        const tt = f - 5, side = q & 1 ? 1 : -1;
        const x = cx + side * (1 + hash(q, 93) * 3 + tt * (0.8 + hash(q, 94) * 1.4)), y = gy - 20 - hash(q, 95) * 22 + tt * tt * 2.2 + tt * 3;
        if (y >= gy - 1) continue;
        G.set(x, y, q % 3 === 0 ? C.crim1 : C.crim2); if (q & 2) G.set(x + 1, y, C.crim3);
      }
      outlineC(G, C.crim4);
      // energy motes and embers rising
      if (f >= 1) for (let q = 0; q < 8; q++) {
        const tt = f - 1 + hash(q, 97) * 3, x = cx + (hash(q, 98) - 0.5) * 14 + Math.sin(tt + q) * 1.2, y = gy - 6 - tt * (3 + hash(q, 99) * 3) - (f < 5 ? h * 0.5 : 0);
        if (y < 1 || tt > 9) continue;
        const c = tt < 3 ? C.crim0 : tt < 6 ? C.crim1 : C.crim2;
        if (G.get(x, y) < 0) G.set(x, y, c);
      }
      if (f === 0) for (let q = 0; q < 5; q++) G.set(cx + (hash(q, 101) - 0.5) * 10, gy - 1 - hash(q, 102) * 5, q & 1 ? C.crim0 : C.crim1);
      blit(G);
      // rock rubble torn up around the base
      const RG = Grid(FWQ, FHQ);
      if (f >= 1 && f <= 8) for (let q = 0; q < 4; q++) {
        const side = q & 1 ? 1 : -1, tt = f - 1, fly = q < 2;
        const up = fly ? Math.max(0, 7 * tt - 1.5 * tt * tt) : 0;
        const x = cx + side * (fly ? 5 + tt * 0.9 : 8 + (q & 2 ? 1 : 0)), y = fly ? gy - 3 - up : gy - 1;
        if (fly && tt > 1 && y > gy - 3) continue;
        chunk(RG, x, y, fly ? 2 : 1, f < 5 ? (fly ? 2 : 1) : 0, fly ? tt : 0);
      }
      RG.outline();
      blit(RG);
    }), 0, 0);
    sh.done(); }

  // ------------------------------------------------------------------ hotbar icons 14x14: j k l u sp
  {
    const sh = Sheet('icons_hero', 14, 14, 5, { names: { j: 0, k: 1, l: 2, u: 3, sp: 4 } });
    const icon = fn => canvasOf(14, 14, () => { R(0, 0, 14, 14, C.vio5); fn(); });
    const miniSword = (hx, hy, a, len, hot) => {
      const dx = Math.cos(a), dy = Math.sin(a);
      for (let i = 1; i <= len; i++) { px(hx + dx * i, hy + dy * i, hot ? (i > len - 2 ? C.crim0 : WHITE) : i === len ? C.armor1 : C.armor0); px(hx + dx * i - dy * 0.8, hy + dy * i + dx * 0.8, hot ? C.crim1 : C.armor2); }
      for (let k = -2; k <= 2; k++) px(hx - dy * k, hy + dx * k, C.gold);
      px(hx - dx, hy - dy, C.red); px(hx - dx * 2, hy - dy * 2, C.gold);
    };
    // j: slash (sword + crescent)
    sh.add(icon(() => {
      for (let a = -1.9; a < 0.9; a += 0.05) { const t = (a + 1.9) / 2.8; for (let r = 5.2; r <= 6.2 + t * 1.2; r += 0.5) px(7 + Math.cos(a) * r, 7 + Math.sin(a) * r, r > 6 ? (t > 0.4 ? WHITE : C.crim0) : C.crim2); }
      miniSword(3, 11, -0.85, 9, false);
    }), 0, 0);
    // k: rush (a charging lance-thrust: blade forward, bow-wave chevron ahead, speed streaks behind)
    sh.add(icon(() => {
      for (const [y, x0, x1] of [[2, 0, 6], [4, 1, 7], [10, 1, 7], [12, 0, 6]]) for (let x = x0; x <= x1; x++) px(x, y, x === x1 ? C.crim1 : x > x1 - 3 ? C.crim2 : C.crim3);
      for (let y = 2; y <= 12; y++) { const d = Math.abs(y - 7), x = 12 - Math.round(d * d * 0.16); px(x, y, d < 4 ? WHITE : C.crim0); px(x - 1, y, d < 3 ? C.crim0 : C.crim1); if (d < 4) px(x - 2, y, C.crim2); }
      miniSword(3, 7, 0, 8, true);
    }), 0, 0);
    // l: dragon head
    sh.add(icon(() => {
      const D = sprite([
        'w.............',
        '.wl...o.......',
        '..llooloo.....',
        '.ommmwwllloo..',
        'ommmeWlllllloo',
        'ommmmmmmmmmmwo',
        '.oommtdtdtdoo.',
        '.....o...o....',
        '...odtdtdtdo..',
        '....ommmmmo...',
        '.....ooooo....',
      ], HL);
      drawRows(D, 0, 2);
      for (let r = 4; r < 11; r++) px(0, r + 1, C.crim2);
    }), 0, 0);
    // u: worldreaver (sword planted point-down in cracked ground, crimson spikes erupting)
    sh.add(icon(() => {
      const sp2 = (bx, h, w) => { for (let y = 0; y < h; y++) { const hw = Math.round(w * (1 - y / h)); for (let x = -hw; x <= hw; x++) px(bx + x, 11 - y, x === 0 && y < h - 1 ? C.crim0 : x < 0 ? C.crim1 : C.crim2); } };
      sp2(2, 7, 1.6); sp2(12, 6, 1.4); sp2(4, 4, 1);
      R(0, 12, 14, 2, C.rock2); for (let x = 0; x < 14; x++) if ((x * 5) % 7 < 3) px(x, 12, C.rock1);
      for (const [x, y] of [[7, 12], [6, 13], [8, 12], [9, 13], [5, 12], [10, 12], [4, 13], [11, 13]]) px(x, y, Math.abs(x - 7) < 2 ? WHITE : Math.abs(x - 7) < 4 ? C.crim0 : C.crim1);
      miniSword(7, 3, Math.PI / 2, 9, true);
      px(7, 11, WHITE); px(6, 11, C.crim1); px(8, 11, C.crim1);
    }), 0, 0);
    // sp: leap (a boot kicking off with a rising streak)
    sh.add(icon(() => {
      for (let k = 0; k < 3; k++) line(2 + k * 2, 12 - k, 2 + k * 2 + 2, 12 - k - 2, k === 2 ? C.crim1 : C.crim3);
      for (const [ox, oy, c, d] of [[9, 2, WHITE, C.crim0], [9, 6, C.crim1, C.crim2]]) for (let q = 0; q <= 3; q++) { px(ox - q, oy + q, c); px(ox + q, oy + q, c); if (q) { px(ox - q, oy + q + 1, d); px(ox + q, oy + q + 1, d); } }
      line(9, 9, 9, 12, C.crim2); line(8, 13, 10, 13, C.vio2);
    }), 0, 0);
    sh.done();
  }
};
