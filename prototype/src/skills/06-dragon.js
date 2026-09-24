// Hero / Dark Knight: Dragon Fury. Rage aura, Rush with crimson afterimages, a two-hit
// Brandish (up-slash + down-slash crescents), backflip home, then Dragon Roar: a spectral
// crimson dragon erupts from the blade, flies across and bites the dummy into an explosion.
const SKILL = (function () {
  const KL = { o: 0, A: C.armor0, B: C.armor1, D: C.armor2, E: C.armor3, v: 0, p: C.red, P: C.redD, q: C.crim1, g: C.gold, G: C.goldD };
  const KNIGHT = sprite([
    '....qppp......',
    '...pppPp......',
    '..pPP.oooo....',
    '.pP..oABBBo...',
    '.P..oABBBBDo..',
    '....oBvvvvvo..',
    '....oBBBDvDo..',
    '....oDBBDDDo..',
    '...ooEDDDDEoo.',
    '..oAAoBBBBoAAo',
    '..oABoABBDoBDo',
    '..oDDoABBDoDDo',
    '...ooBABBDDoo.',
    '....oBgGgDDo..',
    '....oBABBDDo..',
    '....oDDDDEEo..',
    '....ogggGGGo..',
    '...oBBDoDBBDo.',
    '...oBDEoEBDEo.',
    '...oBDo.oBDo..',
    '...oBDo.oBDo..',
    '..oBBDo.oBBDo.',
    '..oEEEo.oEEEEo',
  ], KL);
  const TUCK = sprite([
    '...qppp.....',
    '..pP.oooo...',
    '.pP.oABBBo..',
    '....oBvvvvo.',
    '..oooBBDDoo.',
    '.oAAoBBBBoAo',
    '.oABoABBDoDo',
    '.oDDoBBBDDo.',
    '..oogggGGo..',
    '..oBBDDBBDo.',
    '.oBBDDEBBDDo',
    '.oEEEo.oEEEo',
  ], KL);
  const HL = { o: C.crim4, d: C.crim3, m: C.crim2, l: C.crim1, w: C.crim0, W: 35, e: C.fireY, t: 35 };
  const HEAD = sprite([
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
  const JAW = sprite([
    '...odtdtdtdtdtdo....',
    '....oddmmmmmmmo.....',
    '.....ooooooooo......',
  ], HL);
  const RAGE = gradeLevels('#1c0309', [0.26, 0.46, 0.64]);
  const GHOST = [makeLut('#c81c3c', 0.64), makeLut('#8a1030', 0.72), makeLut('#4a0a1e', 0.8)];
  const RP_HOT = ramp([35, C.crim0, C.crim1, C.crim2, C.crim3]);
  const RP_EMB = ramp([C.crim0, C.crim1, C.crim2, C.crim3, C.crim4]);
  const STOPX = DX - 18;
  const KW = 80, KH = 64, KAX = 40, KAY = 52;
  const kc = mk(KW, KH), kcx = kc.getContext('2d', { willReadFrequently: true });
  const rc = mk(KW, KH), rcx = rc.getContext('2d', { willReadFrequently: true });
  const rImg = rcx.createImageData(KW, KH);

  const IDLE = { sa: -2.55, hx: 0, hy: 2, crouch: 0 };
  const pose = Object.assign({}, IDLE), shown = Object.assign({}, IDLE);
  let two = 0, stT = 0, kx = AX, ky = 0, rot = 0, tuck = 0;
  let aura = 0, cracks = 0, glow = 0, explT = -1, tipX = 0, tipY = 0;
  const ghosts = [], arcs = [];
  const drg = { on: 0, q: 0, open: 0, shake: 0, die: 0, gone: 0 };
  const NSEG = 18;
  const BITEX = DX - 8, BITEY = GY - 20;

  // ground cracks radiating from the knight's feet: [dir, points...]
  const CRACKS = [];
  for (let c = 0; c < 6; c++) {
    const dir = c & 1 ? 1 : -1, pts = [[AX + dir * (1 + c), GY + (c % 3)]];
    let x = pts[0][0], y = pts[0][1];
    for (let s = 0; s < 6; s++) { x += dir * (2 + Math.floor(hash(c, s) * 3)); y = clamp(y + Math.round(hash(c + 7, s) * 2 - 1), GY, GY + 4); pts.push([x, y]); }
    CRACKS.push(pts);
  }

  // ---------------------------------------------------------------- knight
  function drawSword(hx, hy, sa, gl) {
    const dx = Math.cos(sa), dy = Math.sin(sa), qx = -dy, qy = dx;
    const P = (i, k, c) => px(hx + dx * i + qx * k, hy + dy * i + qy * k, c);
    const LB = 19;
    const bw = i => { const r = i - 2; return r > LB - 4 ? Math.max(0, (LB - r) / 4 * 1.5) : 1.5; };
    const hot = gl > 0.5, fl = (tick >> 1) & 1;
    // outline pass
    for (let i = 2; i <= LB + 2.5; i += 0.5) {
      const w = bw(i);
      for (let k = -w - 1; k <= w + 1.01; k += 0.5) if (Math.abs(k) > w) P(i, k, hot ? (fl && Math.abs(k) > w + 0.6 ? C.crim1 : C.crim2) : 0);
      if (hot && gl > 0.8 && hash(Math.floor(i), tick >> 2) > 0.8) P(i, (hash(Math.floor(i), 3 + (tick >> 2)) > 0.5 ? 1 : -1) * (w + 2), C.crim1);
    }
    P(LB + 3, 0, hot ? C.crim1 : 0);
    // blade
    for (let i = 2; i <= LB + 2; i += 0.5) {
      const w = bw(i);
      for (let k = -w; k <= w + 0.01; k += 0.5) {
        let c;
        if (hot) c = Math.abs(k) < 0.6 ? 35 : k < 0 ? C.crim0 : (fl ? C.crim1 : C.crim0);
        else c = k < -0.6 ? C.armor0 : k > 0.6 ? C.armor2 : (i > 3 && i < LB - 3 ? C.armor1 : C.steel);
        P(i, k, c);
      }
    }
    // guard, grip, pommel
    for (let k = -3; k <= 3; k += 0.5) { P(1, k, Math.abs(k) > 2.4 ? C.goldD : C.gold); P(1.5, k, Math.abs(k) > 2.4 ? 0 : C.goldD); }
    for (let i = -3; i <= 0.5; i += 0.5) P(i, 0, (Math.floor(i) & 1) ? C.redD : C.red);
    P(-4, 0, C.gold); P(-4, 1, C.goldD); P(-4, -1, C.goldD);
  }

  function drawCape(x0, y0, len, stream) {
    const ph = Math.floor(time * 8);
    for (let r = 0; r < len; r++) {
      const f = r / len;
      const wv = Math.round(Math.sin(r * 0.55 - ph * 1.1) * f * 1.6);
      const left = Math.round(x0 - 1 - r * (0.3 + stream * 1.1) + wv);
      const y = y0 + Math.floor(r * (1 - stream * 0.55));
      const right = x0 + 4;
      R(left, y, right - left, 1, C.red);
      px(left, y, 0);
      if (r > 2) px(left + 1, y, C.redD);
      if (((r + ph) % 4) < 2 && right - left > 5) px(left + 3, y, C.redD);
      if (r === len - 1) R(left, y, right - left, 1, C.redD);
    }
  }

  // render the whole knight into kc (feet at KAX,KAY); returns the canvas to blit
  function renderKnight() {
    use(kcx); kcx.clearRect(0, 0, KW, KH);
    const fg = fireGlow();
    const rimR = aura > 0.35 ? ((tick >> 2) & 1 ? C.crim1 : C.crim2) : -1;
    const rimL = fg > 0.82 && aura < 0.35 ? 8 : -1;
    if (tuck) {
      const bx0 = KAX - 6, by0 = KAY - 14;
      drawSword(bx0 + 8, by0 + 7, -2.3, 0);
      drawCape(bx0 + 3, by0 + 4, 7, 0.6);
      drawRows(TUCK, bx0, by0, { rimL, rimR, rimRows: [3, 10] });
      R(bx0 + 8, by0 + 6, 2, 2, C.armor0); px(bx0 + 9, by0 + 7, C.armor1);
    } else {
      const bx0 = KAX - 7, by0 = KAY - 22;
      const bob = (K === 'idle' || (K === 'recover' && PROG > 0.5)) ? (Math.floor(time * 2.2) & 1) : 0;
      const cr = Math.round(shown.crouch) + bob;
      const sx = bx0 + 11, sy = by0 + 10 + cr, bsx = bx0 + 3;
      const hx = Math.round(sx + shown.hx), hy = Math.round(sy + shown.hy);
      const behind = Math.cos(shown.sa) < -0.3 && !two;
      const stream = K === 'rush' ? 1 : K === 'slash1' || K === 'slash2' ? 0.4 : K === 'roar' || K === 'bite' ? 0.5 : 0;
      drawCape(bsx + 1, by0 + 9 + cr, 12 - Math.round(stream * 2), stream);
      if (behind) drawSword(hx, hy, shown.sa, glow);
      if (two) { line(bsx + 1, sy + 1, hx - 1, hy + 1, C.armor3); line(bsx + 1, sy + 2, hx - 1, hy + 2, C.armor3); }
      else { line(bsx, sy + 1, bsx - 1, sy + 5, C.armor3); px(bsx - 1, sy + 6, C.armor2); }
      drawRows(KNIGHT, bx0, by0, { bob: cr, bobRows: 17, rimL, rimR, rimRows: [3, 21] });
      if (!behind) drawSword(hx, hy, shown.sa, glow);
      line(sx, sy, hx, hy, C.armor2); line(sx, sy - 1, hx, hy - 1, C.armor1);
      R(hx - 1, hy - 1, 2, 2, C.armor0); px(hx, hy, C.armor1);
      if (aura > 0.5) { px(bx0 + 7, by0 + 5 + cr, (tick >> 2) & 1 ? C.crim1 : 35); px(bx0 + 8, by0 + 5 + cr, C.crim1); }
      tipX = kx - KAX + hx + Math.cos(shown.sa) * 22; tipY = GY + ky - KAY + hy + Math.sin(shown.sa) * 22;
    }
    use(g);
    if (!rot) return kc;
    // nearest-neighbour rotation about the body centre
    const src = kcx.getImageData(0, 0, KW, KH).data, out = rImg.data;
    const pcx = KAX, pcy = KAY - 8, ca = Math.cos(rot), sn = Math.sin(rot);
    for (let y = 0; y < KH; y++) for (let x = 0; x < KW; x++) {
      const ddx = x - pcx, ddy = y - pcy;
      const u = Math.round(ca * ddx + sn * ddy + pcx), v = Math.round(-sn * ddx + ca * ddy + pcy);
      const o = (y * KW + x) * 4;
      if (u < 0 || v < 0 || u >= KW || v >= KH) { out[o + 3] = 0; continue; }
      const s = (v * KW + u) * 4;
      out[o] = src[s]; out[o + 1] = src[s + 1]; out[o + 2] = src[s + 2]; out[o + 3] = src[s + 3] ? 255 : 0;
    }
    rcx.putImageData(rImg, 0, 0);
    return rc;
  }
  function snapGhost() {
    const cvs = renderKnight();
    ghosts.push({ a: lutCanvas(cvs, GHOST[0]), b: lutCanvas(cvs, GHOST[1]), c: lutCanvas(cvs, GHOST[2]), x: Math.round(kx) - KAX, y: Math.round(GY + ky) - KAY, age: 0 });
    while (ghosts.length > 4) ghosts.shift();
  }

  // ---------------------------------------------------------------- brandish arcs
  const HF = [0.4, 0.74, 1, 1, 1, 1];
  function newArc(a0, a1, hits) { arcs.push({ cx: kx + 4, cy: GY - 12, a0, a1, t: 0, hits }); sfx('swing'); }
  function arcHead(a) { const s = Math.min(5, Math.floor(a.t / 4)); return a.a0 + (a.a1 - a.a0) * HF[s]; }
  function drawArc(a) {
    const stage = Math.floor(a.t / 4);
    if (stage > 5) return;
    const head = HF[stage], span = a.a1 - a.a0, dir = span < 0 ? -1 : 1, as = Math.abs(span);
    const cut = stage >= 3 ? (stage - 2) * 0.24 : 0;
    const dis = stage >= 3 ? (stage - 2) * 0.22 : 0;
    const RO = 26, MT = 8.5;
    for (let y = Math.floor(a.cy - RO - 1); y <= a.cy + RO + 1; y++) for (let x = Math.floor(a.cx - RO - 1); x <= a.cx + RO + 1; x++) {
      if (y > GY + 1) continue;
      const ddx = x - a.cx, ddy = y - a.cy, r = Math.hypot(ddx, ddy);
      if (r > RO + 0.5 || r < RO - MT - 1) continue;
      let da = (Math.atan2(ddy, ddx) - a.a0) * dir;
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
      if (d < 1.2) c = v > 0.35 ? 35 : C.crim0;
      else if (d < w * 0.45) c = v > 0.55 && fresh ? C.crim0 : C.crim1;
      else if (d < w * 0.8) c = v > 0.3 ? C.crim1 : C.crim2;
      else c = v > 0.3 ? C.crim2 : C.crim3;
      if (!fresh && d < 1.2) c = C.crim0;
      px(x, y, c);
    }
    // sparks at the leading tip
    if (stage < 3) {
      const ha = a.a0 + span * head;
      const tx = a.cx + Math.cos(ha) * (RO + 1), ty = a.cy + Math.sin(ha) * (RO + 1);
      px(tx, ty, 35); px(tx + 1, ty, 35); px(tx, ty + 1, C.crim0);
    }
  }
  function arcHit(a, big) {
    const ly = a.a1 > a.a0 ? DUM.chest + 2 : DUM.chest - 3;
    const x = DX - 3 + dumShear(ly), y = GY + ly;
    if (big) {
      hitDummy(x, y, { push: a.a1 > a.a0 ? 2.8 : 2.2, stop: 7, shake: 10, straw: 16, dmg: roll(468000), crit: true, sfx: false, impactC: C.crim1 });
      ringFx(x, y, 10, 0.2, RP_HOT, 0.8);
    } else {
      hitDummy(x, y, { push: 1.2, stop: 4, shake: 6, straw: 8, dmg: roll(441000), crit: rand() < 0.5, sfx: false, impactC: C.crim1 });
    }
    const ang = arcHead(a) + (a.a1 > a.a0 ? 1.57 : -1.57);
    burst(x, y, big ? 18 : 10, RP_HOT, 110, 0.35, 60, { a0: ang - 0.7, a1: ang + 0.7, sz: 0.25 });
    sfx(big ? 'slash' : 'slash2');
  }

  // ---------------------------------------------------------------- dragon
  function dPath(q) {
    return [lerp(tipX0, BITEX, q), lerp(tipY0, BITEY, q) - Math.sin(Math.PI * q) * 10];
  }
  let tipX0 = 0, tipY0 = 0;
  function dragonSegs() {
    const out = [];
    for (let i = 1; i <= NSEG; i++) {
      const qi = drg.q - i / NSEG;
      if (qi <= 0.01) break;
      const p = dPath(qi);
      const tp = 1 - i / NSEG;
      const wig = Math.sin(qi * 15 - time * 11) * 3.5 * Math.sin(Math.PI * Math.min(1, qi * 1.4));
      out.push([p[0] - 1, p[1] + wig, Math.max(1, Math.round(1 + 3.2 * Math.pow(tp, 0.7))), i]);
    }
    return out;
  }
  function drawBody(segs) {
    const L = segs.filter(e => e[3] > drg.gone).map(e => [Math.round(e[0]), Math.round(e[1]), e[2], e[3]]);
    const fl = (tick >> 2) & 1;
    for (let j = L.length - 1; j >= 0; j--) { const [x, y, r, i] = L[j]; if (r > 1) { px(x, y - r - 2, C.crim4); if (i & 1) { px(x, y - r - 3, C.crim4); px(x - 1, y - r - 2, C.crim4); } } disc(x, y, r + 1, C.crim4); }
    for (let j = L.length - 1; j >= 0; j--) { const [x, y, r, i] = L[j]; disc(x, y, r, C.crim2); if (r > 1) { px(x, y - r - 1, C.crim1); if (i & 1) px(x, y - r - 2, fl ? C.crim0 : C.crim1); } }
    for (let j = L.length - 1; j >= 0; j--) {
      const [x, y, r, i] = L[j];
      if (r > 1) { R(x - r + 1, y - r + 1, r, 1, C.crim1); R(x - r + 2, y + r - 1, r * 2 - 3, 1, C.crim3); }
      if (r > 2) { px(x - 1, y - r + 1, C.crim0); if ((i + (tick >> 3)) % 3 === 0) px(x, y, C.crim1); }
    }
  }
  function drawHead(x0, y0, open) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    const step = Math.floor(time * 12);
    // flame mane behind the skull
    for (let r = 2; r < 11; r++) {
      const len = 2 + Math.floor(hash(step, r) * 5) + (r > 4 && r < 9 ? 2 : 0);
      for (let k = 0; k < len; k++) px(x0 + 1 - k, y0 + r - Math.floor(k / 3), k > len - 2 ? C.crim3 : k > len / 2 ? C.crim2 : C.crim1);
    }
    const off = c => c > 3 ? Math.round(open * (c - 3) / 15) : 0;
    // mouth interior
    if (open > 0) for (let c = 4; c < 18; c++) {
      const o = off(c);
      for (let y = 0; y < o; y++) px(x0 + c, y0 + 11 + y, y === 0 ? C.crim3 : c > 6 && y > 0 && y < o ? ((c + step) & 1 ? C.fireY : C.crim0) : C.crim4);
    }
    drawRows(HEAD, x0, y0);
    for (let r = 0; r < JAW.length; r++) for (let c = 0; c < JAW[r].length; c++) {
      const v = JAW[r][c]; if (v < 0) continue;
      px(x0 + c, y0 + 11 + r + off(c), v);
    }
    if ((tick >> 3) & 1) px(x0 + 8, y0 + 6, 35);
  }

  // ---------------------------------------------------------------- flames
  function flameField(cx, by, hw, hh, inten, speed) {
    const ts = Math.floor(time * 12) / 12;
    for (let y = Math.floor(by - hh); y <= by; y++) {
      const f = (by - y) / hh;
      for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
        const d = (x - cx) / hw;
        const n = vnoise(x * 0.38, (y + ts * speed) * 0.22);
        const v = Math.pow(1 - f, 0.8) * (1 - Math.pow(Math.abs(d), 2.5)) * inten * 1.7 + (n - 0.5) * 1.0 - 0.2;
        if (v < 0.22) continue;
        px(x, y, v > 1.0 ? 35 : v > 0.8 ? C.crim0 : v > 0.58 ? C.crim1 : v > 0.38 ? C.crim2 : v > 0.28 ? C.crim3 : C.crim4);
      }
    }
  }

  function setPose(t, rate) { for (const key in t) pose[key] = rate ? ease(pose[key], t[key], rate) : t[key]; }

  return {
    title: 'Dragon Fury',
    pad: [73.4, 110, 146.8, 174.6],
    seq: [
      ['idle', 0.8],
      ['charge', 1.3, { call: 'DRAGON FURY' }],
      ['rush', 0.3],
      ['slash1', 0.45],
      ['slash2', 0.5],
      ['backflip', 0.55],
      ['roar', 0.95],
      ['bite', 0.65],
      ['recover', 1.4],
      ['idle', 0.4],
    ],
    reset() {
      Object.assign(pose, IDLE); Object.assign(shown, IDLE);
      two = 0; stT = 0; kx = AX; ky = 0; rot = 0; tuck = 0; aura = cracks = glow = 0; explT = -1;
      ghosts.length = 0; arcs.length = 0; drg.on = drg.q = drg.open = drg.die = drg.gone = 0;
    },
    enter(k, i, dur) {
      stT = -1;
      if (k === 'charge') { sfx('rage', dur); burst(AX, GY - 1, 14, RP.dust, 50, 0.6, 120, { land: 1, a0: -Math.PI, a1: 0 }); }
      if (k === 'rush') { sfx('dash'); burst(AX - 2, GY - 1, 16, RP.dust, 70, 0.6, 140, { land: 1, a0: -Math.PI, a1: -Math.PI / 2 }); }
      if (k === 'slash1') { burst(kx + 5, GY - 1, 14, RP.dust, 60, 0.5, 140, { land: 1, a0: -Math.PI * 0.9, a1: -Math.PI * 0.4 }); sfx('skid'); }
      if (k === 'backflip') { sfx('flip'); burst(kx, GY - 1, 12, RP.dust, 50, 0.5, 140, { land: 1, a0: -Math.PI, a1: 0 }); }
      if (k === 'roar') { kx = AX; ky = 0; rot = 0; tuck = 0; burst(AX, GY - 1, 14, RP.dust, 55, 0.5, 140, { land: 1, a0: -Math.PI, a1: 0 }); shakeFx(4, 1); sfx('land'); }
      if (k === 'bite') {
        drg.q = 1; drg.open = 0;
        const x = DX - 2 + dumShear(DUM.chest), y = GY + DUM.chest;
        hitDummy(x, y, { push: 1.8, stop: 6, shake: 10, straw: 14, dmg: roll(1260000), crit: true, sfx: false, impactC: C.crim1 });
        burst(x, y, 16, RP_HOT, 90, 0.4, 40); sfx('chomp');
      }
      if (k === 'idle' && i === 0) { kx = AX; ky = 0; rot = 0; tuck = 0; }
    },
    update(k, p) {
      stT++;
      const fs = () => Object.assign(shown, pose);
      if (k === 'idle') { two = 0; setPose(IDLE, 10); if (tick % 5 === 0) fs(); }
      else if (k === 'charge') {
        two = 1; setPose({ sa: -1.62, hx: 1, hy: -1, crouch: 1 }, 12); if (tick % 5 === 0) fs();
        cracks = p;
        if (p > 0.25 && stT % 5 === 0) spawn(AX + rr(-15, 15), GY - 1, rr(-3, 3), rr(-16, -7), rr(0.8, 1.3), RP.rock, -3, 0, 0, rand() < 0.4 ? 2 : 1, 1.6);
        if (stT % 2 === 0) spawn(kx + rr(-8, 8), GY - rr(0, 8), rr(-4, 4), rr(-45, -20), rr(0.35, 0.6), RP_HOT, -30);
        if (stT === 39) { ringFx(AX, GY, 22, 0.45, RP.crim, 0.25); shakeFx(7, 1); sfx('stomp'); burst(AX, GY - 1, 20, RP.rock, 60, 0.8, 200, { land: 1, a0: -Math.PI, a1: 0, sz: 0.4 }); }
        if (stT === 66) { ringFx(AX, GY - 11, 16, 0.3, RP_HOT, 0.9); burst(tipX, tipY, 14, RP_HOT, 60, 0.4, 0); }
        if (p > 0.3 && stT % 9 === 0) shakeFx(3, 1);
      } else if (k === 'rush') {
        two = 0; setPose({ sa: -3.53, hx: -3, hy: 3, crouch: 1 }, 40); fs();
        kx = lerp(AX, STOPX, easeOut(p));
        if (stT % 3 === 0 && stT <= 12) snapGhost();
        if (stT % 2 === 0) spawn(kx - 3, GY - 1, rr(-50, -10), rr(-30, -5), rr(0.3, 0.6), RP.dust, 140, 0, 1);
      } else if (k === 'slash1') {
        kx = STOPX; two = 0;
        if (stT < 5) { setPose({ sa: 0.45, hx: 3, hy: 2, crouch: 2 }, 0); fs(); }
        if (stT === 5) newArc(0.45, -2.2, 1);
      } else if (k === 'slash2') {
        if (stT === 3) newArc(-2.2, 0.5, 1);
      } else if (k === 'backflip') {
        const e = easeInOut(p);
        kx = lerp(STOPX, AX, e); ky = -Math.sin(Math.PI * p) * 20;
        tuck = p > 0.08 && p < 0.92 ? 1 : 0;
        rot = tuck ? -Math.round(e * 8) / 8 * Math.PI * 2 : 0;
        if (rot <= -Math.PI * 2 + 0.01) rot = 0;
        if (!tuck) { setPose({ sa: -2.3, hx: 1, hy: 0, crouch: 2 }, 0); fs(); }
        if (stT === 7 || stT === 14) snapGhost();
      } else if (k === 'roar') {
        two = 1;
        if (stT < 12) { setPose({ sa: 0.15, hx: -4, hy: 1, crouch: 2 }, 30); if (tick % 5 === 0 || stT === 0) fs(); }
        else {
          setPose({ sa: 0, hx: 6, hy: 0, crouch: 1 }, 0); fs();
          if (stT === 12) {
            renderKnight(); tipX0 = tipX; tipY0 = tipY;
            drg.on = 1; drg.q = 0; drg.die = 0; drg.gone = 0;
            ringFx(tipX, tipY, 12, 0.25, RP_HOT, 0.9); burst(tipX, tipY, 26, RP_HOT, 90, 0.45, 0, { sz: 0.3 });
            shakeFx(8, 1); flashFx(2, 1); sfx('roar'); sfx('thrust');
          }
          const q = (stT - 12) / 45;
          drg.q = clamp(q * 0.55 + q * q * 0.45, 0, 1);
          drg.open = Math.round(clamp((drg.q - 0.45) / 0.4, 0, 1) * 5);
          if (stT % 2 === 0) { const s = dragonSegs(); if (s.length) { const e = s[Math.floor(rand() * s.length)]; spawn(e[0], e[1], rr(-10, 10), rr(-25, -5), rr(0.4, 0.8), RP_EMB, -10); } }
          if (stT % 10 === 0) shakeFx(3, 1);
        }
      } else if (k === 'bite') {
        drg.shake = stT < 18 ? ((stT >> 1) & 1 ? 1 : -1) : 0;
        if (stT === 8) {
          const x = DX - 2 + dumShear(DUM.belly), y = GY + DUM.belly;
          hitDummy(x, y, { push: 1.5, stop: 5, shake: 8, straw: 10, dmg: roll(1330000), crit: true, sfx: false, impactC: C.crim1 });
          sfx('chomp');
        }
        if (stT === 18) {
          const x = DX, y = GY - 17;
          hitDummy(x, y, { big: true, push: 3.6, stop: 12, shake: 20, straw: 34, dmg: roll(4860000), crit: true, bigNum: true, sfx: false, impactC: C.crim0 });
          dum.skin = 'red'; flashFx(3, 1); sfx('explode');
          ringFx(x, y, 18, 0.3, RP.white, 0.8); ringFx(x, y, 30, 0.5, RP_HOT, 0.8); ringFx(x, y, 40, 0.6, RP.crim, 0.8, 0.08);
          ringFx(x, GY, 46, 0.6, RP.crim, 0.2);
          burst(x, y, 50, RP.fire, 150, 0.9, 60, { sz: 0.4 }); burst(x, y, 30, RP_HOT, 120, 0.5, 0);
          burst(x, GY - 1, 18, RP.rock, 90, 1.0, 240, { land: 1, a0: -Math.PI, a1: 0, sz: 0.4 });
          for (let q = 0; q < 26; q++) spawn(BITEX + rr(0, 20), BITEY - 8 + rr(0, 18), rr(-60, 60), rr(-80, 10), rr(0.5, 1.1), RP_EMB, 40);
          explT = 0; drg.die = 1;
        }
      } else if (k === 'recover') {
        if (p < 0.2) { setPose({ sa: 0, hx: 6, hy: 0, crouch: 1 }, 0); }
        else { two = p < 0.4 ? 1 : 0; setPose(IDLE, 7); }
        if (tick % 5 === 0) fs();
        cracks = 1 - p;
        if (stT === 30) dum.skin = 'normal';
        if (stT === 50) sfx('sheathe');
      }

      // shared status easing
      const auraT = k === 'charge' ? p * 1.1 : k === 'rush' ? 0.7 : k === 'slash1' || k === 'slash2' ? 0.55 : k === 'backflip' ? 0.3 : k === 'roar' ? 1.05 : k === 'bite' ? 0.9 : 0;
      aura = ease(aura, auraT, k === 'recover' ? 3 : 8);
      glow = ease(glow, (k === 'charge' && p > 0.3) || k === 'rush' || k === 'slash1' || k === 'slash2' || k === 'backflip' || k === 'roar' || k === 'bite' || (k === 'recover' && p < 0.5) ? 1 : 0, 8);
      if (k === 'idle' && glow < 0.05) glow = 0;
      if (explT >= 0) { explT += DT; if (explT > 0.8) explT = -1; }
      if (k !== 'idle' && k !== 'recover' && aura > 0.4 && stT % 3 === 0 && !tuck) spawn(kx + rr(-7, 7), GY + ky - rr(2, 16), rr(-5, 5), rr(-30, -14), rr(0.3, 0.6), RP_EMB, -20);

      // arcs (knight sword follows the leading tip)
      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i];
        a.t++;
        if (a.t <= 12) { const sa = arcHead(a); setPose({ sa, hx: Math.round(Math.cos(sa) * 4), hy: Math.round(Math.sin(sa) * 4), crouch: a.a1 > a.a0 ? 2 : 1 }, 0); fs(); }
        if (a.t === 4) arcHit(a, true);
        if (a.t === 9) arcHit(a, false);
        if (a.t === 8 && a.a1 > a.a0) { burst(a.cx + 22, GY - 1, 14, RP.rock, 70, 0.8, 220, { land: 1, a0: -Math.PI, a1: 0 }); burst(a.cx + 22, GY - 1, 10, RP.dust, 50, 0.6, 100, { land: 1, a0: -Math.PI, a1: 0 }); }
        if (a.t > 26) arcs.splice(i, 1);
      }
      // ghosts
      for (let i = ghosts.length - 1; i >= 0; i--) if (++ghosts[i].age > 15) ghosts.splice(i, 1);
      // dragon dissolve: head first, then body toward the blade
      if (drg.on && drg.die) {
        drg.die++;
        if (drg.die % 2 === 0) {
          drg.gone++;
          const s = dragonSegs();
          for (const e of s) if (e[3] === drg.gone) burst(e[0], e[1], 5 + e[2] * 2, RP_EMB, 40, 0.8, -15);
          if (drg.gone > NSEG) drg.on = 0;
        }
      }
    },
    grade(k, p) {
      let lvl = 0;
      if (k === 'charge') lvl = Math.min(3, Math.floor(p * 3.6));
      else if (k === 'rush' || k === 'slash1' || k === 'slash2' || k === 'backflip' || k === 'roar' || k === 'bite') lvl = 3;
      else if (k === 'recover') lvl = Math.floor((1 - p) * 3.99);
      return RAGE[Math.min(3, lvl)];
    },
    // the knight is drawn in drawFx so it stays lit above the rage grade
    drawActor() {},
    drawFx(k, p) {
      // glowing ground cracks under the charge spot
      if (cracks > 0.02) {
        const fl = (tick >> 2) & 1;
        for (let c = 0; c < CRACKS.length; c++) {
          const pts = CRACKS[c], n = Math.floor(cracks * (pts.length - 1) + 0.999);
          for (let s = 0; s < n; s++) {
            const a = pts[s], b = pts[s + 1];
            line(a[0], a[1] + 1, b[0], b[1] + 1, C.crim4);
            line(a[0], a[1], b[0], b[1], cracks > 0.5 && fl && s < 2 ? C.crim0 : s < 3 ? C.crim1 : C.crim2);
          }
        }
      }
      if (aura > 0.1 && ky > -3) ellipse(kx, GY, 8 + aura * 4, 2 + aura, (tick >> 2) & 1 ? C.crim2 : C.crim3, 2);
      // rush speed streaks
      if (k === 'rush' || (k === 'slash1' && stT < 6)) {
        for (let q = 0; q < 6; q++) {
          const y = GY - 3 - Math.floor(hash(q, 2) * 18), x1 = kx - 6 - hash(q, 3) * 6, x0 = Math.max(AX - 10, x1 - 16 - hash(q, 4) * 20);
          line(x0, y, x1, y, q & 1 ? C.crim2 : C.crim3);
        }
      }
      // afterimages
      for (const gh of ghosts) g.drawImage(gh.age < 5 ? gh.a : gh.age < 10 ? gh.b : gh.c, gh.x, gh.y);
      curFill = -1;
      // rage aura behind the knight
      if (aura > 0.08) flameField(kx, GY + ky, 10 + aura * 4, 34 * Math.min(1, aura + 0.2), aura, 42);
      // the knight (kept lit above the grade)
      const kcv = renderKnight();
      g.drawImage(kcv, Math.round(kx) - KAX, Math.round(GY + ky) - KAY);
      curFill = -1;
      // dragon
      if (drg.on) {
        const segs = dragonSegs();
        drawBody(segs);
        if (!drg.gone) {
          const hp = dPath(drg.q);
          const wig = Math.sin(drg.q * 15 - time * 11) * 1.2 * (1 - drg.q);
          drawHead(hp[0] - 1 + drg.shake, hp[1] - 8 + wig, drg.open);
        }
        if (drg.q < 0.12) { ellipse(tipX0, tipY0, 3 + ((tick >> 2) & 1), 3, C.crim0, 0); px(tipX0, tipY0, 35); }
      }
      // brandish crescents
      for (const a of arcs) drawArc(a);
      // explosion flames
      if (explT >= 0) {
        const e = explT / 0.8;
        if (explT < 0.05) disc(DX, GY - 17, 9, 35);
        else if (explT < 0.1) { disc(DX, GY - 17, 11, C.crim0); disc(DX, GY - 17, 7, 35); }
        flameField(DX, GY, 16 * (1 - e * 0.4), 40 * (1 - e), 1.25 * (1 - e * 0.8), 70);
      }
    },
  };
})();

SND.swing = (c, o, t) => { noiseS(c, o, t, 0.2, 0.55, 400, 'bandpass', 1.6, 3600, 0.09); tone(c, o, t, 'sine', 300, 120, 0.18, 0.08, 0.06); };
SND.slash = (c, o, t) => {
  noiseS(c, o, t, 0.28, 0.9, 2600, 'highpass'); noiseS(c, o, t, 0.3, 0.7, 900, 'lowpass', 0, 120);
  tone(c, o, t, 'sawtooth', 240, 50, 0.26, 0.3); tone(c, o, t, 'sine', 110, 32, 0.34, 0.9);
  tone(c, o, t + 0.005, 'square', 1500, 1100, 0.14, 0.05); tone(c, o, t + 0.01, 'sine', 2600, 2400, 0.3, 0.03);
};
SND.slash2 = (c, o, t) => { noiseS(c, o, t, 0.14, 0.6, 2200, 'highpass'); tone(c, o, t, 'sine', 150, 50, 0.16, 0.5); tone(c, o, t, 'square', 1200, 900, 0.08, 0.03); };
SND.rage = (c, o, t, d) => {
  tone(c, o, t, 'sawtooth', 45, 95, d, 0.14, d * 0.7); tone(c, o, t, 'sawtooth', 47, 100, d, 0.1, d * 0.7);
  noiseS(c, o, t, d, 0.4, 180, 'lowpass', 2, 900, d * 0.8);
  for (let i = 0; i < 9; i++) noiseS(c, o, t + 0.3 + i * 0.1, 0.04, 0.12 + i * 0.02, 3000, 'highpass');
  tone(c, o, t, 'square', 110, 220, d, 0.025, d * 0.9);
};
SND.stomp = (c, o, t) => { noiseS(c, o, t, 0.4, 0.8, 500, 'lowpass', 0, 60); tone(c, o, t, 'sine', 80, 30, 0.45, 0.8); };
SND.dash = (c, o, t) => { noiseS(c, o, t, 0.3, 0.6, 300, 'bandpass', 1.2, 2800, 0.05); tone(c, o, t, 'sine', 100, 40, 0.15, 0.5); };
SND.skid = (c, o, t) => { noiseS(c, o, t, 0.18, 0.35, 1800, 'bandpass', 2, 600); };
SND.flip = (c, o, t) => { noiseS(c, o, t, 0.45, 0.4, 500, 'bandpass', 2, 2400, 0.25); noiseS(c, o, t + 0.22, 0.2, 0.3, 2400, 'bandpass', 2, 700); };
SND.land = (c, o, t) => { noiseS(c, o, t, 0.16, 0.5, 700); tone(c, o, t, 'sine', 120, 45, 0.16, 0.5); tone(c, o, t + 0.01, 'square', 900, 800, 0.05, 0.03); };
SND.thrust = (c, o, t) => { noiseS(c, o, t, 0.35, 0.6, 600, 'bandpass', 1.4, 4000, 0.04); tone(c, o, t, 'sine', 180, 60, 0.3, 0.5); };
SND.roar = (c, o, t) => {
  const dur = 1.35;
  const os = c.createOscillator(); os.type = 'sawtooth';
  os.frequency.setValueAtTime(70, t); os.frequency.linearRampToValueAtTime(135, t + 0.3); os.frequency.exponentialRampToValueAtTime(52, t + dur);
  const os2 = c.createOscillator(); os2.type = 'sawtooth';
  os2.frequency.setValueAtTime(73, t); os2.frequency.linearRampToValueAtTime(141, t + 0.3); os2.frequency.exponentialRampToValueAtTime(55, t + dur);
  const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.setValueAtTime(34, t); lfo.frequency.linearRampToValueAtTime(22, t + dur);
  const lg = c.createGain(); lg.gain.value = 0.45;
  const am = c.createGain(); am.gain.value = 0.55;
  lfo.connect(lg); lg.connect(am.gain);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 5;
  f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1900, t + 0.28); f.frequency.exponentialRampToValueAtTime(260, t + dur);
  const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.55, t + 0.07); gg.gain.setValueAtTime(0.55, t + 0.5); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  os.connect(am); os2.connect(am); am.connect(f); f.connect(gg); gg.connect(o);
  os.start(t); os2.start(t); lfo.start(t); os.stop(t + dur + 0.05); os2.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  noiseS(c, o, t, dur, 0.4, 700, 'bandpass', 3, 250, 0.08);
  tone(c, o, t, 'sine', 60, 35, dur, 0.35, 0.1);
};
SND.chomp = (c, o, t) => { noiseS(c, o, t, 0.09, 0.8, 1800); tone(c, o, t, 'sine', 220, 55, 0.14, 0.7); tone(c, o, t, 'square', 320, 110, 0.07, 0.08); noiseS(c, o, t + 0.02, 0.25, 0.4, 600, 'lowpass', 0, 100); };
SND.explode = (c, o, t) => {
  noiseS(c, o, t, 1.4, 1.0, 900, 'lowpass', 0, 50); tone(c, o, t, 'sine', 95, 24, 1.1, 1.0); tone(c, o, t, 'sawtooth', 70, 28, 0.7, 0.35);
  noiseS(c, o, t, 0.5, 0.5, 3500, 'highpass');
  for (let i = 0; i < 10; i++) noiseS(c, o, t + 0.1 + i * 0.06 + hash(i, 5) * 0.04, 0.05, 0.25 - i * 0.02, 2000 + hash(i, 6) * 2500, 'bandpass', 3);
};
SND.sheathe = (c, o, t) => { noiseS(c, o, t, 0.2, 0.2, 3000, 'highpass', 0, 6000, 0.12); tone(c, o, t + 0.18, 'square', 1760, 1760, 0.05, 0.04); tone(c, o, t + 0.18, 'sine', 2640, 2640, 0.35, 0.04); };
