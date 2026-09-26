using System.Collections.Generic;
using UnityEngine;

// Straw training dummy. Drawn as 34 one-pixel rows so it can lean with a per-row shear (pixel-perfect wobble),
// driven by an underdamped spring. Handles hits: flash, hitstop, shake, straw, damage numbers, stuck stars.
public class Dummy : ITarget
{
    const int DW = 24, DH = 34;
    public const int LEFT = -6, RIGHT = 6, BODY_LO = 8, BODY_HI = 33;   // hitbox (x from centre, y above ground)
    readonly SpriteRenderer[] rows = new SpriteRenderer[DH];
    readonly Dictionary<string, Sprite[]> skins = new Dictionary<string, Sprite[]>();
    public float theta, omega, flashT, shiver, skinT;
    public string skin = "normal";

    class Stuck { public SpriteRenderer sr; public float lx, h, life; public bool on; }
    readonly Stuck[] stuck = new Stuck[16];
    readonly Sprite[] starS, starC;


    readonly float bx, by;
    readonly DamageStack stack = new DamageStack();
    public float BaseY { get { return by; } }
    public bool Grind { get { return true; } }

    public Dummy(float x, float groundY, Transform parent)
    {
        bx = x; by = groundY;
        foreach (var k in new[] { "normal", "flash", "shadow" })
        {
            var arr = new Sprite[DH];
            for (int r = 0; r < DH; r++) arr[r] = Atlas.Slice("dummy_" + k, new Rect(0, DH - 1 - r, DW, 1));
            skins[k] = arr;
        }
        for (int r = 0; r < DH; r++) rows[r] = Px.MakeSR("dummy_row", parent, 10);
        starS = Atlas.Sheets["star"].frames; starC = Atlas.Sheets["star_clone"].frames;
        for (int i = 0; i < stuck.Length; i++) { stuck[i] = new Stuck { sr = Px.MakeSR("stuck", parent, 11) }; stuck[i].sr.enabled = false; }
        Tick();
    }

    public int Shear(float h) { return Mathf.RoundToInt(h * Mathf.Tan(theta)); }
    public float SurfL(float y) { return bx + LEFT + Shear(y - by); }
    public float SurfR(float y) { return bx + RIGHT + Shear(y - by); }
    public bool InBand(float y) { float h = y - by; return h >= BODY_LO && h <= BODY_HI; }
    public float CentreX(float y) { return bx + Shear(y - by); }

    public bool visible = true;
    public bool Active { get { return visible; } }
    public int MidH { get { return 18; } }
    public int Reach { get { return 15; } }
    public void Mark() { skin = "shadow"; skinT = 0.5f; shiver = 0.3f; }
    public void Drag(float toX) { }
    public void SetVisible(bool v) { visible = v; foreach (var r in rows) r.enabled = v; if (!v) foreach (var s in stuck) { s.on = false; s.sr.enabled = false; } }

    public void Hit(float x, float y, HitOpt o, int dir)
    {
        var G = Game.I;
        omega += o.push * dir;
        flashT = Mathf.Max(flashT, o.big ? 0.1f : 0.05f);
        G.Hitstop(o.stop);
        G.Shake(o.shakeN, o.big ? 2 : 1);
        for (int k = 0; k < o.straw; k++)
        {
            bool back = Px.Rand() < 0.3f;
            float vx = back ? Px.Range(-50, -5) : Px.Range(10, o.big ? 110 : 60);
            G.parts.Spawn(x + Px.Range(-1, 2), y + Px.Range(-2, 2), vx * dir, Px.Range(5, o.big ? 110 : 70), Px.Range(1.2f, 2.2f), Particles.STRAW, 210, true);
        }
        G.fxs.Impact(x, y, o.big);
        if (o.dmgBase > 0)
        {
            int v = Px.Roll(o.dmgBase * (o.crit ? 1.6f : 1f));
            G.numbers.Show(v, o.crit, o.bigNum, stack, bx + 2, by + 33);
            G.AddDamage(v);
        }
        if (!string.IsNullOrEmpty(o.sfx)) Sfx.Play(o.sfx);
    }

    public void StickStar(float x, float y, bool clone)
    {
        foreach (var s in stuck) if (!s.on)
            {
                s.on = true; s.life = 1.4f; s.h = y - by; s.lx = x - bx - Shear(s.h);
                s.sr.sprite = clone ? starC[0] : starS[0]; s.sr.enabled = true; return;
            }
    }


    public void Tick()
    {
        omega += (-60 * theta - 3.4f * omega) * Px.DT;
        theta += omega * Px.DT;
        if (theta > 0.42f) { theta = 0.42f; omega *= -0.3f; }
        if (theta < -0.42f) { theta = -0.42f; omega *= -0.3f; }
        if (flashT > 0) flashT -= Px.DT;
        if (shiver > 0) shiver -= Px.DT;
        if (skinT > 0) { skinT -= Px.DT; if (skinT <= 0) skin = "normal"; }
        var spr = skins[flashT > 0 ? "flash" : skin];
        int sv = shiver > 0 ? (((Game.I.tick >> 1) & 1) == 1 ? 1 : -1) : 0;
        float tan = Mathf.Tan(theta);
        for (int r = 0; r < DH; r++)
        {
            int h = DH - 1 - r;
            rows[r].sprite = spr[r];
            Px.Place(rows[r].transform, bx - 12 + Mathf.RoundToInt(h * tan) + sv, by + h);
        }
        foreach (var s in stuck)
        {
            if (!s.on) continue;
            s.life -= Px.DT;
            if (s.life <= 0) { s.on = false; s.sr.enabled = false; continue; }
            s.sr.enabled = s.life > 0.4f || (Game.I.tick & 2) == 0;
            Px.Place(s.sr.transform, bx + s.lx + Shear(s.h), by + s.h);
        }
    }
}
