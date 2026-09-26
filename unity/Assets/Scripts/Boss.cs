using System.Collections.Generic;
using UnityEngine;

// King Shroom: a MapleStory-style field boss fought in three stages. Every attack is telegraphed with a
// blinking ground marker, so it can be read and dodged:
//   STAGE 1  Walk · Stomp (jump onto a marked spot + jumpable shockwaves) · Spit (lobbed spores, marked)
//   STAGE 2  (66% HP, "SPORE STORM") double stomps, a wider spit fan, Spore Rain from the sky, capling adds
//   STAGE 3  (33% HP, "FINAL STAND") red and faster, triple stomps, the Quake Slam (three shockwave rings), more adds
// Between stages it roars and is briefly invulnerable. Dies with a blinking pose, a meso shower and an EXP pop.
public class Boss : ITarget
{
    public static float MAX_HP = 12000f;   // -bosshp overrides (trailer captures)
    public const int LAYERS = 5;
    enum St { Off, Spawn, Land, Idle, Walk, Crouch, Air, Spit, Rain, Roar, Dead }
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
    public int Stage { get; private set; }
    int stompsLeft, slamWaves, rainWave, lastAtk;
    bool slamMode, summoned;
    float tx, slamNext;
    readonly List<float> rainX = new List<float>();
    const float AIR_T = 0.86f;

    readonly Sheet sh, shW;
    readonly SpriteRenderer sr;
    readonly Anim anim;

    class Spore { public SpriteRenderer sr; public float x, y, vx, vy; public bool on; }
    class Wave { public SpriteRenderer[] bars = new SpriteRenderer[3]; public float x, t; public int dir; public bool on, hurt; }
    class Coin { public SpriteRenderer sr; public float x, y, vx, vy, t; public bool on, rest; }
    readonly List<Spore> spores = new List<Spore>();
    readonly List<Wave> waves = new List<Wave>();
    readonly List<Coin> coins = new List<Coin>();
    class Marker { public SpriteRenderer line, l, r, bang; public float x, w, t, life; public bool on; }
    readonly List<Marker> markers = new List<Marker>();
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
    public bool Enraged { get { return Stage >= 3; } }
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
        Stage = 1; stompsLeft = 0; slamWaves = 0; lastAtk = -1; summoned = false; sr.color = Color.white;
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
        ClearHazards();
    }
    void ClearHazards()
    {
        foreach (var s in spores) { s.on = false; s.sr.enabled = false; }
        foreach (var m in markers) HideMarker(m);
        slamWaves = 0;
    }

    public void Hit(float hx, float hy, HitOpt o, int dir)
    {
        if (!Active) return;
        var G = Game.I;
        if (st == St.Roar) { G.parts.Burst(hx, hy, 3, HITP, 40, 0.2f, 60, true); if (G.tick % 6 == 0) Sfx.Play("tink", 0.5f); return; }   // invulnerable between stages
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
        if (hp <= 0) { Die(); return; }
        int want = hp < MAX_HP * 0.33f ? 3 : hp < MAX_HP * 0.66f ? 2 : 1;
        if (want > Stage) StartStage(want);
    }

    void StartStage(int n)
    {
        var G = Game.I;
        Stage = n; stompsLeft = 0; y = Px.GROUND; vx = vy = 0;
        ClearHazards();
        Go(St.Roar, 2.0f, "land"); summoned = false;
        G.fxs.Callout(n == 2 ? "spore" : "final");
        G.Shake(22, 2); G.Flash(2); G.Hitstop(8);
        G.parts.Burst(x, y + 24, 36, HITP, 140, 0.8f, 40, true, false, 0, Mathf.PI * 2, 0.4f);
        G.hud.Chat(n == 2 ? "KING SHROOM CALLS THE SPORE STORM!" : "KING SHROOM MAKES HIS FINAL STAND!", "gold", 3f);
        Sfx.Play("charge"); Sfx.Play("hitBig");
    }

    void SummonAdds()
    {
        var G = Game.I; var fh = G.map.fhs[0];
        string[] ids = Stage == 2 ? new[] { "capling", "capling" } : new[] { "capling", "stumpy", "capling" };
        for (int k = 0; k < ids.Length; k++)
        {
            var m = new Mob(MobDefs.Get(ids[k]), fh, G.map.root);
            float sx = G.player.x + (k % 2 == 0 ? -1 : 1) * (50 + k * 20);
            if (sx < 40 || sx > Px.W - 40) sx = Px.W - sx;
            m.Summon(sx); G.map.mobs.Add(m);
        }
        Sfx.Play("poof");
    }
    void VanishAdds() { foreach (var m in Game.I.map.mobs) if (m.summoned) m.Vanish(); }

    void Die()
    {
        var G = Game.I;
        hp = 0; Go(St.Dead, 3.6f, "die");
        ClearHazards(); VanishAdds(); sr.color = Color.white;
        foreach (var w in waves) { w.on = false; foreach (var b in w.bars) b.enabled = false; }
        G.Hitstop(14); G.Shake(24, 2); G.Flash(3);
        G.fxs.Callout("boss");
        Sfx.Play("hitBig");
    }

    // 0 walk, 1 stomp, 2 spit, 3 spore rain, 4 quake slam
    void Choose()
    {
        var P = Game.I.player;
        float dist = Mathf.Abs(P.x - x);
        float[] w = Stage == 1 ? new[] { 0.3f, 0.4f, 0.3f, 0, 0 } : Stage == 2 ? new[] { 0.15f, 0.35f, 0.25f, 0.25f, 0 } : new[] { 0.1f, 0.3f, 0.2f, 0.2f, 0.2f };
        if (dist < 40) w[0] *= 0.3f;                          // already close: don't just walk into the player
        if (lastAtk == 3 || lastAtk == 4) { w[3] *= 0.2f; w[4] *= 0.2f; }
        float sum = 0; foreach (var v in w) sum += v;
        float r = Px.Rand() * sum; int pick = 0;
        for (; pick < 4; pick++) { if (r < w[pick]) break; r -= w[pick]; }
        lastAtk = pick;
        switch (pick)
        {
            case 0: Go(St.Walk, Px.Range(0.9f, 1.4f), "walk"); break;
            case 1: stompsLeft = Stage; slamMode = false; BeginCrouch(0.6f); break;
            case 2: StartSpit(); break;
            case 3: rainWave = 0; Go(St.Rain, Stage >= 3 ? 2.3f : 1.7f, "spit"); break;
            case 4: stompsLeft = 1; slamMode = true; BeginCrouch(0.7f); break;
        }
    }
    float IdleT() { return Stage == 1 ? Px.Range(0.7f, 1.0f) : Stage == 2 ? Px.Range(0.5f, 0.8f) : Px.Range(0.35f, 0.6f); }
    void BeginCrouch(float d)
    {
        var P = Game.I.player;
        tx = slamMode ? Px.W / 2f : Mathf.Clamp(P.x, 30, Px.W - 30);
        Go(St.Crouch, d, "crouch");
        AddMarker(tx, slamMode ? 56 : 30, d + AIR_T);
    }
    void StartSpit() { spitN = Stage == 1 ? 3 : 5; spitDone = 0; Go(St.Spit, 0.45f + spitN * 0.14f + 0.3f, "spit"); }

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
                if (t >= dur)
                {
                    if (stompsLeft > 0) BeginCrouch(Stage >= 3 ? 0.36f : 0.42f);
                    else Go(St.Idle, IdleT(), "idle");
                }
                break;
            case St.Idle:
                face = P.x < x ? -1 : 1;
                if (t >= dur) Choose();
                break;
            case St.Walk:
                face = P.x < x ? -1 : 1;
                x = Mathf.Clamp(x + face * (Stage >= 3 ? 34 : Stage == 2 ? 28 : 22) * Px.DT, 26, Px.W - 26);
                if (t >= dur || Mathf.Abs(P.x - x) < 24) Go(St.Idle, IdleT(), "idle");
                break;
            case St.Crouch:
                face = tx < x ? -1 : 1;
                if (t >= dur) { vy = 185; vx = Mathf.Clamp((tx - x) / AIR_T, -120, 120); Go(St.Air, 99, "jump"); Sfx.Play("swish"); }
                break;
            case St.Air:
                vy -= 430 * Px.DT; y += vy * Px.DT; x = Mathf.Clamp(x + vx * Px.DT, 26, Px.W - 26);
                if (y <= Px.GROUND)
                {
                    y = Px.GROUND; Landed(false); stompsLeft--;
                    if (slamMode) { slamWaves = 2; slamNext = 0.4f; }
                    Go(St.Land, stompsLeft > 0 ? 0.2f : 0.5f, "land");
                }
                break;
            case St.Spit:
                face = P.x < x ? -1 : 1;
                while (spitDone < spitN && t >= 0.45f + spitDone * 0.14f)
                {
                    float spread = (spitDone - (spitN - 1) / 2f) * (Stage == 1 ? 14f : 18f);
                    LobSpore(x + face * 6, y + 18, Mathf.Clamp(P.x + spread, 8, Px.W - 8));
                    spitDone++;
                }
                if (t >= dur) Go(St.Idle, IdleT(), "idle");
                break;
            case St.Rain:     // mark the landing spots, then spores fall straight down from the sky
            {
                face = P.x < x ? -1 : 1;
                if ((rainWave == 0 && t >= 0.25f) || (rainWave == 1 && Stage >= 3 && t >= 1.0f))
                {
                    rainWave++; rainX.Clear();
                    int n = Stage >= 3 ? 7 : 6;
                    float gap = (Px.W - 40) / (float)n, off = Px.Range(0, gap);
                    for (int k = 0; k < n; k++) { float rx = 20 + off + k * gap + Px.Range(-4, 4); if (rx < Px.W - 12) { rainX.Add(rx); AddMarker(rx, 9, 1.25f); } }
                    Sfx.Play("charge", 0.6f);
                }
                if (rainWave >= 1 && rainX.Count > 0 && t >= (rainWave == 1 ? 0.25f : 1.0f) + 0.6f)
                {
                    foreach (var rx in rainX) DropSpore(rx);
                    rainX.Clear(); Sfx.Play("whoosh", 0.6f);
                }
                if (t >= dur) Go(St.Idle, IdleT(), "idle");
                break;
            }
            case St.Roar:
                if (G.tick % 3 == 0) G.parts.Spawn(x + Px.Range(-14, 14), y + Px.Range(10, 40), 0, Px.Range(30, 70), 0.5f, HITP, 0, true, true);
                if (t < 1.4f && G.tick % 10 == 0) G.Shake(6, 1);
                if (t >= 0.8f && !summoned) { summoned = true; SummonAdds(); }
                if (Stage >= 3) sr.color = Color.Lerp(Color.white, new Color(1f, 0.72f, 0.72f), Mathf.Clamp01(t / 1.2f));
                if (t >= dur) Go(St.Idle, 0.4f, "idle");
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
        if (slamWaves > 0 && st != St.Dead)
        {
            slamNext -= Px.DT;
            if (slamNext <= 0)
            {
                slamWaves--; slamNext = 0.4f;
                for (int d = -1; d <= 1; d += 2) SpawnWave(x + d * 12, d, true);
                G.Shake(10, 1); G.parts.Burst(x, Px.GROUND + 1, 12, Particles.DUST, 70, 0.5f, 120, false, true, 0, Mathf.PI); Sfx.Play("hitBig", 0.7f);
            }
        }
        foreach (var m in markers) TickMarker(m);
        if (Active && st != St.Roar && P.CanBeHit && Mathf.Abs(P.x - x) < 13 && P.y < y + 34 && P.y + 16 > y) P.Hurt(Px.Roll(30), P.x < x ? -1 : 1);

        // spores
        foreach (var s in spores)
        {
            if (!s.on) continue;
            s.vy -= 300 * Px.DT; s.x += s.vx * Px.DT; s.y += s.vy * Px.DT;
            s.sr.sprite = sporeS.frames[(G.tick >> 3) & 1];
            if (P.CanBeHit && Mathf.Abs(s.x - P.x) < 5 && s.y > P.y && s.y < P.y + 18) { P.Hurt(Px.Roll(24), s.vx > 0 ? 1 : (s.vx < 0 ? -1 : (P.x < s.x ? -1 : 1))); Pop(s); continue; }
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
        AddMarker(tx, 9, T);
        Sfx.Play("swish", 0.7f);
    }
    void DropSpore(float rx)
    {
        Spore s = spores.Find(q => !q.on);
        if (s == null) { s = new Spore { sr = Px.MakeSR("spore", Game.I.world, 24) }; spores.Add(s); }
        s.on = true; s.x = rx; s.y = Px.H + 6; s.vx = 0; s.vy = -140; s.sr.enabled = true;
    }

    // ---- telegraphs: a blinking ground line with end ticks and a "!" that blinks faster as impact nears
    void AddMarker(float mx, float w, float life)
    {
        Marker m = markers.Find(q => !q.on);
        if (m == null)
        {
            var R = Game.I.world;
            m = new Marker { line = Px.MakeSR("warn", R, 23), l = Px.MakeSR("warn", R, 23), r = Px.MakeSR("warn", R, 23), bang = Px.MakeSR("warn", R, 23) };
            foreach (var q in new[] { m.line, m.l, m.r, m.bang }) q.sprite = Px.White;
            markers.Add(m);
        }
        m.on = true; m.x = mx; m.w = w; m.t = 0; m.life = life;
    }
    void TickMarker(Marker m)
    {
        if (!m.on) return;
        m.t += Px.DT;
        if (m.t >= m.life) { HideMarker(m); return; }
        float left = m.life - m.t;
        int rate = left < 0.35f ? 2 : left < 0.8f ? 4 : 8;
        bool hi = ((Game.I.tick / rate) & 1) == 0;
        int c = hi ? 35 : 56, x0 = Mathf.RoundToInt(m.x - m.w / 2), wi = Mathf.RoundToInt(m.w);
        Bar(m.line, x0, Px.GROUND, wi, 1, c);
        Bar(m.l, x0, Px.GROUND + 1, 1, 3, c); Bar(m.r, x0 + wi - 1, Px.GROUND + 1, 1, 3, c);
        int bx = Mathf.RoundToInt(m.x);
        bool big = m.w >= 20;
        Bar(m.bang, bx, Px.GROUND + (big ? 5 : 4), 1, big ? 5 : 3, c);   // a tall "!" over stomps, a short tick over spores
    }
    static void HideMarker(Marker m) { m.on = false; m.line.enabled = m.l.enabled = m.r.enabled = m.bang.enabled = false; }
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
