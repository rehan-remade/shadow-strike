using System.Collections.Generic;
using UnityEngine;

// Throwing stars (Triple Throw: first target in the path) and Avenger shurikens
// (pierce through field monsters, grind on the boss / training dummy).
public class Projectiles
{
    class Star { public SpriteRenderer sr; public float x, y, vx, dist, dmg; public bool clone, on; }
    class Big { public SpriteRenderer sr; public float x, y, vx, t, rot, dist, dmg; public int state, hits; public bool clone, on; public ITarget grind; public HashSet<ITarget> done = new HashSet<ITarget>(); }
    readonly List<Star> stars = new List<Star>();
    readonly List<Big> bigs = new List<Big>();
    readonly Sheet starS, starC, bigS, bigC;
    public int BigAlive { get; private set; }
    const float STAR_RANGE = 170, BIG_RANGE = 230;

    public Projectiles()
    {
        starS = Atlas.Sheets["star"]; starC = Atlas.Sheets["star_clone"];
        bigS = Atlas.Sheets["bigstar"]; bigC = Atlas.Sheets["bigstar_clone"];
    }

    public void Clear()
    {
        foreach (var s in stars) { s.on = false; s.sr.enabled = false; }
        foreach (var b in bigs) { b.on = false; b.sr.enabled = false; }
        foreach (var q in shots) { q.on = false; q.sr.enabled = false; }
    }

    // ---------------------------------------------------------------- generic class shots
    class Shot
    {
        public SpriteRenderer sr; public Sheet sh; public float x, y, vx, vy, dist, range, dmg, t, explodeR, groundY; public int pierce, hitsPer;
        public string explodeFx, sfx; public bool on, drop, big; public HashSet<ITarget> done = new HashSet<ITarget>();
    }
    readonly List<Shot> shots = new List<Shot>();
    Shot NewShot(string sheet, bool bright)
    {
        Shot q = shots.Find(z => !z.on && z.sr.gameObject.layer == (bright ? Px.LAYER_FX : 0));
        if (q == null) { q = new Shot { sr = Px.MakeSR("shot", bright ? Game.I.fx : Game.I.world, 30, bright ? Px.LAYER_FX : 0) }; shots.Add(q); }
        q.sh = Atlas.Sheets.ContainsKey(sheet) ? Atlas.Sheets[sheet] : null; q.on = true; q.t = 0; q.dist = 0; q.done.Clear(); q.sr.enabled = q.sh != null;
        return q;
    }
    // straight projectile: pierce = how many targets it can pass through, hitsPer = hits on each
    public void Shoot(string sheet, float x, float y, int dir, float speed, float dmg, int pierce, float range, int hitsPer = 1,
                      float explodeR = 0, string explodeFx = null, string sfx = "stick", bool big = false, bool bright = true)
    {
        var q = NewShot(sheet, bright);
        q.x = x; q.y = y; q.vx = dir * speed; q.vy = 0; q.dmg = dmg; q.pierce = pierce; q.range = range; q.hitsPer = hitsPer;
        q.explodeR = explodeR; q.explodeFx = explodeFx; q.sfx = sfx; q.drop = false; q.big = big;
    }
    // falling projectile (ice spears, meteor): hits the first target it touches or bursts on the ground
    public void Drop(string sheet, float x, float y, float vx, float vy, float dmg, float groundY, float explodeR = 0, string explodeFx = null, string sfx = "hit", bool big = false)
    {
        var q = NewShot(sheet, true);
        q.x = x; q.y = y; q.vx = vx; q.vy = vy; q.dmg = dmg; q.pierce = 1; q.range = 9999; q.hitsPer = 1; q.groundY = groundY;
        q.explodeR = explodeR; q.explodeFx = explodeFx; q.sfx = sfx; q.drop = true; q.big = big;
    }
    // damage everything within r of (x, y); returns how many were hit
    public int Area(float x, float y, float r, float dmg, int hits, bool big, string sfx, int dir)
    {
        int n = 0;
        foreach (var t in Game.I.targets)
        {
            if (!t.Active) continue;
            float tx = t.CentreX(t.BaseY + t.MidH), ty = t.BaseY + t.MidH;
            if (Mathf.Abs(tx - x) > r + 6 || Mathf.Abs(ty - y) > r * 0.8f + 10) continue;
            for (int k = 0; k < hits && t.Active; k++)
                t.Hit(tx, ty, new HitOpt { push = big ? 2.2f : 1f, stop = big ? 6 : 2, shakeN = big ? 10 : 4, straw = big ? 14 : 5, big = big && k == hits - 1, crit = Px.Rand() < 0.3f, bigNum = big && k == hits - 1, dmgBase = dmg, sfx = k == 0 ? sfx : null }, tx >= x ? 1 : -1);
            n++;
        }
        return n;
    }
    void Explode(Shot q)
    {
        var G = Game.I;
        if (q.explodeFx != null && Atlas.Sheets.ContainsKey(q.explodeFx)) G.fxs.Play(q.explodeFx, q.x, q.drop ? q.groundY : q.y - 8, true, 0, -1, false, 58);
        if (q.explodeR > 0) { Area(q.x, q.y, q.explodeR, q.dmg, 1, q.big, "hitBig", q.vx >= 0 ? 1 : -1); G.Shake(q.big ? 16 : 8, q.big ? 2 : 1); Sfx.Play("hitBig"); }
    }
    void TickShots()
    {
        var G = Game.I;
        foreach (var q in shots)
        {
            if (!q.on) continue;
            q.t += Px.DT;
            float sx = q.vx * Px.DT, sy = q.vy * Px.DT;
            q.x += sx; q.y += sy; q.dist += Mathf.Sqrt(sx * sx + sy * sy);
            int dir = q.vx >= 0 ? 1 : -1;
            foreach (var t in G.targets)
            {
                if (!t.Active || q.done.Contains(t) || !t.InBand(q.y) || q.x < t.SurfL(q.y) - 2 || q.x > t.SurfR(q.y) + 2) continue;
                q.done.Add(t);
                if (q.explodeR > 0) { Explode(q); q.pierce = 0; break; }
                for (int k = 0; k < q.hitsPer && t.Active; k++)
                    t.Hit(q.x, q.y, new HitOpt { push = q.big ? 2f : 0.9f, stop = q.big ? 5 : 2, shakeN = q.big ? 8 : 3, straw = 4, big = q.big && k == q.hitsPer - 1, crit = Px.Rand() < 0.25f, bigNum = q.big && k == q.hitsPer - 1, dmgBase = q.dmg, sfx = k == 0 ? q.sfx : null }, dir);
                G.parts.Burst(q.x, q.y, 5, Particles.SPARK, 60, 0.25f, 0, true);
                if (--q.pierce <= 0) break;
            }
            bool end = q.pierce <= 0 || q.dist > q.range || q.x < G.camX - 40 || q.x > G.camX + Px.W + 40;
            if (q.drop && q.y <= q.groundY) { if (q.explodeR > 0) Explode(q); else G.parts.Burst(q.x, q.groundY + 1, 6, Particles.WHITE, 50, 0.4f, 120, false, true, 0, Mathf.PI); end = true; }
            if (end) { q.on = false; q.sr.enabled = false; continue; }
            if (q.sh != null)
            {
                var a = q.sh.anims.ContainsKey("play") ? q.sh.anims["play"] : null;
                q.sr.sprite = a != null ? q.sh.frames[a.frames[Mathf.FloorToInt(q.t * a.fps) % a.frames.Length]] : q.sh.frames[Mathf.FloorToInt(q.t * q.sh.Meta("fps", 12)) % q.sh.count];
                q.sr.flipX = q.drop ? q.vx > 0 : dir < 0;
            }
            if (G.tick % 3 == 0) G.parts.Spawn(q.x - dir * 4, q.y, 0, 0, 0.18f, Particles.WHITE, 0, false, true);
            Px.Place(q.sr.transform, q.x, q.y);
        }
    }


    public void ThrowStar(float x, float y, int dir, bool clone, float dmg)
    {
        Star s = stars.Find(q => !q.on);
        if (s == null) { s = new Star { sr = Px.MakeSR("star", Game.I.world, 20) }; stars.Add(s); }
        s.on = true; s.x = x; s.y = y; s.vx = dir * 330; s.clone = clone; s.dist = 0; s.dmg = dmg; s.sr.enabled = true;
        Sfx.Play("star", 0.8f);
        foreach (var t in Game.I.targets)     // spawned inside a target: hit immediately
            if (t.Active && t.InBand(y) && x >= t.SurfL(y) && x <= t.SurfR(y)) { HitStar(s, t); break; }
    }

    public void ThrowBig(float x, float y, int dir, bool clone, float dmg)
    {
        Big b = bigs.Find(q => !q.on);
        if (b == null) { b = new Big { sr = Px.MakeSR("bigstar", Game.I.fx, 30, Px.LAYER_FX) }; bigs.Add(b); }
        b.on = true; b.x = x; b.y = y; b.vx = dir * 260; b.t = 0; b.state = 0; b.hits = 0; b.clone = clone; b.dist = 0; b.dmg = dmg; b.grind = null; b.done.Clear(); b.sr.enabled = true;
        Sfx.Play("whoosh");
    }

    void HitStar(Star s, ITarget t)
    {
        var G = Game.I;
        int dir = s.vx > 0 ? 1 : -1;
        float hx = dir > 0 ? t.SurfL(s.y) + 1 : t.SurfR(s.y) - 1;
        t.Hit(hx, s.y, new HitOpt { push = 0.9f, stop = 2, shakeN = 3, straw = 4, crit = Px.Rand() < 0.25f, dmgBase = s.dmg, sfx = "stick" }, dir);
        t.StickStar(hx + dir, s.y, s.clone);
        G.parts.Burst(hx, s.y, 4, Particles.SPARK, 60, 0.25f, 0, true);
        s.on = false; s.sr.enabled = false;
    }

    public void Tick()
    {
        TickShots();
        var G = Game.I;
        foreach (var s in stars)
        {
            if (!s.on) continue;
            float px = s.x, step = s.vx * Px.DT;
            s.x += step; s.dist += Mathf.Abs(step);
            ITarget best = null; float bestD = 1e9f;
            foreach (var t in G.targets)
            {
                if (!t.Active || !t.InBand(s.y)) continue;
                float edge = s.vx > 0 ? t.SurfL(s.y) : t.SurfR(s.y);
                bool crossed = s.vx > 0 ? (px < edge && s.x >= edge) : (px > edge && s.x <= edge);
                float dd = Mathf.Abs(edge - px);
                if (crossed && dd < bestD) { best = t; bestD = dd; }
            }
            if (best != null) { HitStar(s, best); continue; }
            if (s.dist > STAR_RANGE || s.x < G.camX - 20 || s.x > G.camX + Px.W + 20) { s.on = false; s.sr.enabled = false; continue; }
            s.sr.sprite = (s.clone ? starC : starS).frames[(G.tick >> 1) & 1];
            if ((G.tick & 1) == 0) G.parts.Spawn(s.x - s.vx * 0.012f, s.y, 0, 0, 0.12f, s.clone ? Particles.SMOKE : Particles.VSPARK, 0, false, true);
            Px.Place(s.sr.transform, s.x, s.y);
        }
        BigAlive = 0;
        foreach (var b in bigs)
        {
            if (!b.on) continue;
            BigAlive++;
            b.t += Px.DT; b.rot += Px.DT * 40;
            int dir = b.vx > 0 ? 1 : -1;
            if (b.state == 0)
            {
                float step = b.vx * Px.DT;
                b.x += step; b.dist += Mathf.Abs(step);
                foreach (var t in G.targets)
                {
                    if (!t.Active || b.done.Contains(t) || !t.InBand(b.y) || b.x < t.SurfL(b.y) - 2 || b.x > t.SurfR(b.y) + 2) continue;
                    b.done.Add(t);
                    if (t.Grind) { b.state = 1; b.t = 0; b.grind = t; b.hits = 0; Sfx.Play("grind"); break; }
                    // pierce: three quick hits on a field monster
                    for (int k = 0; k < 3 && t.Active; k++)
                        t.Hit(b.x, b.y + Px.Range(-3, 3), new HitOpt { push = 0.6f, stop = 1, shakeN = 3, straw = 3, crit = Px.Rand() < 0.3f, dmgBase = b.dmg, sfx = "tink" }, dir);
                    G.parts.Burst(b.x, b.y, 8, Particles.VSPARK, 110, 0.35f, 60, true);
                }
            }
            else if (b.state == 1)
            {
                var t = b.grind;
                b.x = t.CentreX(b.y) - dir * 3;
                int want = Mathf.Min(5, 1 + Mathf.FloorToInt(b.t / 0.1f));
                while (b.hits < want && t.Active)
                {
                    b.hits++;
                    t.Hit(b.x + dir * 2, b.y + Px.Range(-3, 3), new HitOpt { push = 0.8f, stop = 2, shakeN = 5, straw = 5, crit = Px.Rand() < 0.3f, dmgBase = b.dmg, sfx = "tink" }, dir);
                    G.parts.Burst(b.x + dir * 3, b.y, 8, Particles.VSPARK, 110, 0.35f, 60, true);
                    G.parts.Burst(b.x + dir * 3, b.y, 4, Particles.SPARK, 90, 0.3f, 120, true);
                }
                if (b.t >= 0.52f || !t.Active) { b.state = 2; Sfx.Play("shing"); }
            }
            else { b.x += b.vx * 1.2f * Px.DT; b.dist += Mathf.Abs(b.vx * 1.2f * Px.DT); }
            if (b.dist > BIG_RANGE + 60 || b.x < G.camX - 30 || b.x > G.camX + Px.W + 30) { b.on = false; b.sr.enabled = false; continue; }
            var sh = b.clone ? bigC : bigS;
            b.sr.sprite = sh.frames[5 * 8 + ((int)b.rot % 8)];
            if (G.tick % 2 == 0) G.parts.Spawn(b.x - dir * 6, b.y + Px.Range(-3, 3), -dir * 20, 0, 0.2f, Particles.VSPARK, 0, false, true);
            Px.Place(b.sr.transform, b.x, b.y);
        }
    }
}
