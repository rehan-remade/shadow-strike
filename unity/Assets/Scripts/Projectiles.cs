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

    public void Clear() { foreach (var s in stars) { s.on = false; s.sr.enabled = false; } foreach (var b in bigs) { b.on = false; b.sr.enabled = false; } }

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
