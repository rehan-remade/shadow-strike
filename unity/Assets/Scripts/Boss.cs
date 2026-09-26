using System.Collections.Generic;
using UnityEngine;

// King Shroom: a MapleStory-style field boss. Drops in from the sky (crushing the dummy), then loops
// Idle -> Walk / Stomp (jump + ground shockwaves) / Spit (lobbed spores). Enrages under 35% HP.
// Dies with a blinking death pose, a meso shower and an EXP pop.
public class Boss : ITarget
{
    public static float MAX_HP = 12000f;   // -bosshp overrides (trailer captures)
    public const int LAYERS = 5;
    enum St { Off, Spawn, Land, Idle, Walk, Crouch, Air, Spit, Dead }
    St st = St.Off;
    float t, dur;
    public float x = 220, y = Px.GROUND, vx, vy;
    readonly DamageStack stack = new DamageStack();
    public float BaseY { get { return y; } }
    public bool Grind { get { return true; } }
    int face = -1;
    public float hp, lagHp, lagT, barFill;
    float flashT, hurtT;
    int spitN, spitDone;
    bool firstLand, gone;

    readonly Sheet sh, shW;
    readonly SpriteRenderer sr;
    readonly Anim anim;

    class Spore { public SpriteRenderer sr; public float x, y, vx, vy; public bool on; }
    class Wave { public SpriteRenderer[] bars = new SpriteRenderer[3]; public float x, t; public int dir; public bool on, hurt; }
    class Coin { public SpriteRenderer sr; public float x, y, vx, vy, t; public bool on, rest; }
    readonly List<Spore> spores = new List<Spore>();
    readonly List<Wave> waves = new List<Wave>();
    readonly List<Coin> coins = new List<Coin>();
    readonly Sheet sporeS, coinS;
    static readonly int[] HITP = { 35, 54, 55, 56, 57 };   // white -> crimson sparks

    public Boss()
    {
        sh = Atlas.Sheets["boss"]; shW = Atlas.Sheets["boss_white"];
        sporeS = Atlas.Sheets["spore"]; coinS = Atlas.Sheets["coin"];
        sr = Px.MakeSR("boss", Game.I.world, 12); sr.enabled = false;
        anim = new Anim(sh, "idle");
    }

    public bool Present { get { return st != St.Off; } }
    public bool Active { get { return st != St.Off && st != St.Dead && st != St.Spawn; } }
    public bool Enraged { get { return hp < MAX_HP * 0.35f; } }
    public int MidH { get { return 20; } }
    public int Reach { get { return 22; } }
    public float SurfL(float yy) { return x - 15; }
    public float SurfR(float yy) { return x + 15; }
    public bool InBand(float yy) { return yy >= y + 2 && yy <= y + 40; }
    public float CentreX(float yy) { return x; }
    public void StickStar(float sx, float sy, bool clone) { Game.I.parts.Burst(sx, sy, 3, HITP, 50, 0.25f, 60, true); }
    public void Mark() { hurtT = 0.3f; }
    public void Drag(float toX) { }

    public void Spawn()
    {
        var G = Game.I;
        st = St.Spawn; t = 0; x = 220; y = Px.H + 40; vx = 0; vy = -40; face = G.player.x < x ? -1 : 1;
        hp = lagHp = MAX_HP; barFill = 0; firstLand = true; gone = false;
        anim.Play("jump", true);
        sr.enabled = true;
        G.fxs.Callout("king");
        Sfx.Play("charge");
    }

    void Go(St s, float d, string a) { st = s; t = 0; dur = d; if (a != null) anim.Play(a, true); }
    public void Despawn()
    {
        st = St.Off; sr.enabled = false; Game.I.bossDark = 0;
        foreach (var s in spores) { s.on = false; s.sr.enabled = false; }
        foreach (var w in waves) { w.on = false; foreach (var b in w.bars) b.enabled = false; }
        foreach (var c in coins) { c.on = false; c.sr.enabled = false; }
    }

    public void Hit(float hx, float hy, HitOpt o, int dir)
    {
        if (!Active) return;
        var G = Game.I;
        // flash only on crits / big hits so the boss isn't white for the whole fight
        if (o.big) flashT = 0.08f; else if (o.crit && flashT <= 0) flashT = 0.03f;
        if (o.big) hurtT = 0.2f;
        G.Hitstop(o.stop);
        G.Shake(o.shakeN, o.big ? 2 : 1);
        G.parts.Burst(hx, hy, o.big ? 18 : 6, HITP, o.big ? 120 : 70, 0.4f, 120, true);
        G.fxs.Impact(hx, hy, o.big);
        if (o.dmgBase > 0)
        {
            int v = Px.Roll(o.dmgBase * (o.crit ? 1.6f : 1f));
            hp -= v; lagT = 0.45f;
            G.numbers.Show(v, o.crit, o.bigNum, stack, x + 2, y + 40, 3);
            G.AddDamage(v);
        }
        if (!string.IsNullOrEmpty(o.sfx)) Sfx.Play(o.sfx);
        if (hp <= 0) Die();
    }

    void Die()
    {
        var G = Game.I;
        hp = 0; Go(St.Dead, 3.6f, "die");
        foreach (var s in spores) { s.on = false; s.sr.enabled = false; }
        foreach (var w in waves) { w.on = false; foreach (var b in w.bars) b.enabled = false; }
        G.Hitstop(14); G.Shake(24, 2); G.Flash(3);
        G.fxs.Callout("boss");
        Sfx.Play("hitBig");
    }

    void Choose()
    {
        var P = Game.I.player;
        float dist = Mathf.Abs(P.x - x), r = Px.Rand();
        float idle = Enraged ? Px.Range(0.25f, 0.5f) : Px.Range(0.5f, 0.9f);
        if (dist > 55) { if (r < 0.45f) Go(St.Walk, Px.Range(1.1f, 1.6f), "walk"); else if (r < 0.75f) Go(St.Crouch, Enraged ? 0.25f : 0.38f, "crouch"); else StartSpit(); }
        else { if (r < 0.5f) Go(St.Crouch, Enraged ? 0.25f : 0.38f, "crouch"); else if (r < 0.75f) StartSpit(); else Go(St.Walk, Px.Range(0.8f, 1.2f), "walk"); }
        if (st == St.Idle) dur = idle;
    }
    void StartSpit() { spitN = Enraged ? 5 : 3; spitDone = 0; Go(St.Spit, 0.35f + spitN * 0.12f + 0.3f, "spit"); }

    public void Tick()
    {
        var G = Game.I; var P = G.player;
        if (flashT > 0) flashT -= Px.DT;
        if (hurtT > 0) hurtT -= Px.DT;
        if (st != St.Off)
        {
            t += Px.DT;
            barFill = Mathf.MoveTowards(barFill, 1, Px.DT * 1.2f);
            if (lagT > 0) lagT -= Px.DT; else lagHp = Mathf.MoveTowards(lagHp, hp, MAX_HP * 0.4f * Px.DT);
            G.bossDark = st == St.Spawn ? 1 : 0;
        }
        switch (st)
        {
            case St.Spawn:
                vy -= 520 * Px.DT; y += vy * Px.DT;
                if (y <= Px.GROUND) { y = Px.GROUND; Landed(true); Go(St.Land, 0.6f, "land"); }
                break;
            case St.Land:
                if (t >= dur) Go(St.Idle, 0.6f, "idle");
                break;
            case St.Idle:
                face = P.x < x ? -1 : 1;
                if (t >= dur) Choose();
                break;
            case St.Walk:
                face = P.x < x ? -1 : 1;
                x = Mathf.Clamp(x + face * (Enraged ? 36 : 24) * Px.DT, 26, Px.W - 26);
                if (t >= dur || Mathf.Abs(P.x - x) < 16) Go(St.Idle, Enraged ? 0.3f : 0.6f, "idle");
                break;
            case St.Crouch:
                if (t >= dur) { vy = 185; vx = Mathf.Clamp((P.x - x) / 0.86f, -85, 85); face = vx < 0 ? -1 : 1; Go(St.Air, 99, "jump"); Sfx.Play("swish"); }
                break;
            case St.Air:
                vy -= 430 * Px.DT; y += vy * Px.DT; x = Mathf.Clamp(x + vx * Px.DT, 26, Px.W - 26);
                if (y <= Px.GROUND) { y = Px.GROUND; Landed(false); Go(St.Land, 0.35f, "land"); }
                break;
            case St.Spit:
                face = P.x < x ? -1 : 1;
                while (spitDone < spitN && t >= 0.35f + spitDone * 0.12f)
                {
                    float spread = (spitDone - (spitN - 1) / 2f) * 12f;
                    LobSpore(x + face * 6, y + 18, P.x + spread);
                    spitDone++;
                }
                if (t >= dur) Go(St.Idle, Enraged ? 0.3f : 0.7f, "idle");
                break;
            case St.Dead:
                if (t >= 1.2f && !gone)
                {
                    gone = true;
                    for (int k = 0; k < 8; k++) G.drops.Spawn("meso", Mathf.RoundToInt(Px.Range(60, 140)), x + Px.Range(-8, 8), y + 16);
                    G.drops.Spawn("crown", 1, x, y + 16); G.drops.Spawn("red", 1, x, y + 16); G.drops.Spawn("blue", 1, x, y + 16);
                    Stats.GainExp(1500); Stats.OnKill("king"); Stats.D.bossDown = true;
                    G.parts.Burst(x, y + 18, 30, HITP, 120, 0.7f, 80, true, false, 0, Mathf.PI * 2, 0.4f);
                    G.fxs.Play("puff", x, y + 16, false, 0, -1, false, 18);

                    Sfx.Play("poof"); Sfx.Play("coin");
                }
                if (t >= dur) { st = St.Off; G.OnBossGone(); }
                break;
        }
        if (Active && P.CanBeHit && Mathf.Abs(P.x - x) < 13 && P.y < y + 34 && P.y + 16 > y) P.Hurt(Px.Roll(40), P.x < x ? -1 : 1);

        // spores
        foreach (var s in spores)
        {
            if (!s.on) continue;
            s.vy -= 300 * Px.DT; s.x += s.vx * Px.DT; s.y += s.vy * Px.DT;
            s.sr.sprite = sporeS.frames[(G.tick >> 3) & 1];
            if (P.CanBeHit && Mathf.Abs(s.x - P.x) < 5 && s.y > P.y && s.y < P.y + 18) { P.Hurt(Px.Roll(28), s.vx > 0 ? 1 : -1); Pop(s); continue; }
            if (s.y <= Px.GROUND + 2) { Pop(s); continue; }
            Px.Place(s.sr.transform, s.x, s.y);
        }
        // shockwaves
        foreach (var w in waves)
        {
            if (!w.on) continue;
            w.t += Px.DT; w.x += w.dir * 100 * Px.DT;
            if (w.t > 1.2f || w.x < -4 || w.x > Px.W + 4) { w.on = false; foreach (var b in w.bars) b.enabled = false; continue; }
            int wx = Mathf.RoundToInt(w.x);
            Bar(w.bars[0], wx, Px.GROUND, 1, 5, 35); Bar(w.bars[1], wx - w.dir, Px.GROUND, 1, 3, 38); Bar(w.bars[2], wx - 2 * w.dir, Px.GROUND, 1, 2, 26);
            if (G.tick % 2 == 0) G.parts.Spawn(w.x, Px.GROUND + 1, -w.dir * Px.Range(5, 25), Px.Range(10, 40), 0.4f, Particles.DUST, 120, true);
            if (w.hurt && P.CanBeHit && P.y <= Px.GROUND + 3 && Mathf.Abs(P.x - w.x) < 4) P.Hurt(Px.Roll(55), w.dir);
        }
        // meso
        foreach (var c in coins)
        {
            if (!c.on) continue;
            c.t += Px.DT;
            if (!c.rest)
            {
                c.vy -= 400 * Px.DT; c.x += c.vx * Px.DT; c.y += c.vy * Px.DT;
                if (c.y <= Px.GROUND + 2 && c.vy < 0) { c.y = Px.GROUND + 2; c.vy *= -0.4f; c.vx *= 0.5f; if (Mathf.Abs(c.vy) < 20) { c.rest = true; } }
            }
            if (c.t > 4f) { c.on = false; c.sr.enabled = false; continue; }
            c.sr.enabled = c.t < 3.3f || (G.tick & 2) == 0;
            c.sr.sprite = coinS.frames[c.rest && ((G.tick / 8) % 6 != 0) ? 0 : (int)(c.t * 14) % 4];
            Px.Place(c.sr.transform, c.x, c.y);
        }

        if (st == St.Off) return;
        if (hurtT > 0 && (st == St.Idle || st == St.Walk)) anim.Play("hurt"); else if (anim.name == "hurt") anim.Play(st == St.Walk ? "walk" : "idle");
        anim.Tick();
        var fr = anim.Frame;
        sr.sprite = (flashT > 0 ? shW : sh).frames[fr];
        sr.flipX = face > 0;
        sr.enabled = st != St.Dead || (!gone && (t < 0.5f || ((G.tick >> 2) & 1) == 0));
        Px.Place(sr.transform, x, y);
    }

    void Landed(bool first)
    {
        var G = Game.I;
        G.Shake(first ? 26 : 16, 2);
        G.parts.Burst(x, Px.GROUND + 1, first ? 30 : 16, Particles.DUST, 80, 0.6f, 120, false, true, 0, Mathf.PI);
        for (int d = -1; d <= 1; d += 2) SpawnWave(x + d * 12, d, !first);
        Sfx.Play("hitBig");
    }

    void SpawnWave(float wx, int dir, bool hurt)
    {
        Wave w = waves.Find(q => !q.on);
        if (w == null) { w = new Wave(); for (int k = 0; k < 3; k++) { w.bars[k] = Px.MakeSR("wave", Game.I.world, 25); w.bars[k].sprite = Px.White; } waves.Add(w); }
        w.on = true; w.x = wx; w.dir = dir; w.t = 0; w.hurt = hurt;
    }

    void LobSpore(float sx, float sy, float tx)
    {
        Spore s = spores.Find(q => !q.on);
        if (s == null) { s = new Spore { sr = Px.MakeSR("spore", Game.I.world, 24) }; spores.Add(s); }
        const float T = 0.9f, g = 300;
        s.on = true; s.x = sx; s.y = sy; s.vx = (tx - sx) / T; s.vy = (Px.GROUND + 4 - sy + 0.5f * g * T * T) / T; s.sr.enabled = true;
        Sfx.Play("swish", 0.7f);
    }
    void Pop(Spore s)
    {
        s.on = false; s.sr.enabled = false;
        Game.I.parts.Burst(s.x, s.y, 8, HITP, 50, 0.35f, 60, false);
        Sfx.Play("poof", 0.5f);
    }
    void DropCoin()
    {
        Coin c = coins.Find(q => !q.on);
        if (c == null) { c = new Coin { sr = Px.MakeSR("coin", Game.I.world, 26) }; coins.Add(c); }
        c.on = true; c.rest = false; c.t = Px.Range(0, 0.2f); c.x = x + Px.Range(-6, 6); c.y = y + 16; c.vx = Px.Range(-70, 70); c.vy = Px.Range(90, 170); c.sr.enabled = true;
    }
    static void Bar(SpriteRenderer b, int bx, int by, int w, int h, int c)
    {
        b.enabled = true; b.color = Px.Pal[c]; b.transform.localScale = new Vector3(w, h, 1); b.transform.localPosition = new Vector3(bx, by, 0);
    }
}
