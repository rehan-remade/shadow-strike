using System.Collections.Generic;
using UnityEngine;

// Skill kits for the non-Night-Lord classes. Slots: 0 = J (basic), 1 = K, 2 = L, 3 = U; mobility on the second jump.
//   HERO       Slash · Rush · Dragon Fury · Worldreaver      · Leap
//   ARCH MAGE  Ice Bolt · Blizzard · Meteor · Ice Strike     · Teleport
//   BISHOP     Holy Arrow · Angel Ray · Genesis · Heal       · Teleport
//   BOWMASTER  Arrow · Power Shot · Hurricane · Arrow Bomb   · Double Jump
public partial class Player
{
    ClassDef cls;
    bool IsNL { get { return cls == null || cls.id == "nightlord"; } }
    public string ClassId { get { return cls == null ? "nightlord" : cls.id; } }
    SpriteRenderer rushSR;
    string cSkill;
    float cDur, cNext;
    int cStage;
    bool cBig, cLock;        // cLock: the skill drives the body (no walking / jumping, super armour)
    readonly List<ITarget> cTargets = new List<ITarget>();
    readonly HashSet<ITarget> rushHit = new HashSet<ITarget>();
    float reaverX, reaverY, reaverT;
    int reaverStep; bool reaverL, reaverR;

    public void SetClass(ClassDef c)
    {
        cls = c;
        sh = Atlas.Sheets[c.sheet]; shGhost = Atlas.Sheets[c.ghost];
        anim = new Anim(sh, "idle");
        act = Act.None;
        if (rushSR == null) { rushSR = Px.MakeSR("rushfx", Game.I.fx, 32, Px.LAYER_FX); rushSR.enabled = false; }
    }

    Vector2 HandPos() { return Hand(sh, anim.Frame, x, y, face); }
    void Begin(string skill, string animName, float dur, bool big = false, bool lockBody = false)
    {
        act = Act.CAct; actT = 0; cSkill = skill; cDur = dur; cStage = 0; cNext = 0; cBig = big; cLock = lockBody;
        anim.Play(animName, true);
    }

    // targets in front, nearest first
    List<ITarget> InFront(float reach, float dyMax, int max)
    {
        cTargets.Clear();
        foreach (var t in Game.I.targets)
        {
            if (!t.Active) continue;
            float dx = (t.CentreX(t.BaseY) - x) * face;
            if (dx < -8 || dx > reach || Mathf.Abs(t.BaseY - y) > dyMax) continue;
            cTargets.Add(t);
        }
        cTargets.Sort((a, b) => Mathf.Abs(a.CentreX(a.BaseY) - x).CompareTo(Mathf.Abs(b.CentreX(b.BaseY) - x)));
        if (cTargets.Count > max) cTargets.RemoveRange(max, cTargets.Count - max);
        return cTargets;
    }
    // melee sweep in front of the player
    void Melee(float reach, int max, float mult, bool big, string sfx)
    {
        foreach (var t in InFront(reach, 26, max))
        {
            float ty = t.BaseY + t.MidH;
            t.Hit(t.CentreX(ty), ty, new HitOpt { push = big ? 2.4f : 1.2f, stop = big ? 6 : 3, shakeN = big ? 10 : 5, straw = big ? 12 : 6, big = big, bigNum = big, crit = Px.Rand() < 0.3f, dmgBase = Dmg(mult), sfx = sfx }, face);
        }
    }

    void ClassInput(Inp inp)
    {
        var c = cls;
        if (inp.partner && cdSp <= 0) { if (Spend(3)) { cdSp = c.cd[3]; StartSkill(3); } }
        else if (inp.assassin && cdAs <= 0) { if (Spend(2)) { cdAs = c.cd[2]; StartSkill(2); } }
        else if (inp.avenger && cdAv <= 0) { if (Spend(1)) { cdAv = c.cd[1]; StartSkill(1); } }
        else if (inp.attack && cdThrow <= 0) { cdThrow = c.cd[0]; StartSkill(0); }
    }

    void StartSkill(int slot)
    {
        var G = Game.I;
        switch (cls.id + slot)
        {
            case "hero0": Begin("slash", "attack", 0.32f); Sfx.Play("swish"); break;
            case "hero1": Begin("rush", "rush", 1f, false, true); rushHit.Clear(); G.fxs.Callout("rush"); Sfx.Play("whoosh"); break;
            case "hero2": Begin("dragon", "cast", 0.7f, true); G.fxs.Callout("dragon"); Sfx.Play("charge"); break;
            case "hero3":
                Begin("reaver", "slam", 3f, true, true); G.fxs.Callout("worldreaver"); Sfx.Play("charge");
                if (grounded) { vy = 175; grounded = false; Sfx.Play("jump", 0.6f); }
                break;
            case "archmage0": Begin("bolt", "attack", 0.34f); break;
            case "archmage1": Begin("blizzard", "cast", 1.3f, true); G.fxs.Callout("blizzard"); Sfx.Play("charge"); break;
            case "archmage2": Begin("meteor", "cast", 1.1f, true); G.fxs.Callout("meteor"); Sfx.Play("charge"); break;
            case "archmage3": Begin("icestrike", "skill", 0.45f); G.fxs.Callout("ice"); break;
            case "bishop0": Begin("holy", "attack", 0.34f); break;
            case "bishop1": Begin("angelray", "skill", 0.45f); G.fxs.Callout("angel"); break;
            case "bishop2": Begin("genesis", "cast", 1.3f, true); G.fxs.Callout("genesis"); Sfx.Play("charge"); break;
            case "bishop3": Begin("heal", "cast", 0.45f); G.fxs.Callout("heal"); break;
            case "bowmaster0": Begin("arrow", "attack", 0.3f); break;
            case "bowmaster1": Begin("power", "cast", 0.9f, true); G.fxs.Callout("power"); Sfx.Play("charge"); break;
            case "bowmaster2": Begin("hurricane", "skill", 1.5f, true); G.fxs.Callout("hurricane"); break;
            case "bowmaster3": Begin("bomb", "attack", 0.32f); break;
        }
    }

    void ClassRun()
    {
        var G = Game.I; var P = G.proj;
        var hp = HandPos();
        switch (cSkill)
        {
            // ---------------------------------------------------------------- hero
            case "slash":
                if (cStage == 0 && actT >= 0.08f) { cStage = 1; G.fxs.Play("fx_hero_slash", x + face * 16, y + 14, true, 0, -1, face < 0, 56); Melee(36, 2, 1.3f, false, "slash"); }
                break;
            case "rush":      // shoulder-charge forward, carrying monsters along, then a Brandish finisher
                if (cStage == 0)
                {
                    vx = face * 240; if (!grounded) vy = 0;          // an air rush holds its altitude
                    if (G.tick % 4 == 0) G.fxs.Ghost(shGhost.frames[anim.Frame], x - face * 5, y, face < 0, 0.14f);
                    if (grounded && G.tick % 3 == 0) G.parts.Burst(x - face * 6, y + 1, 2, Particles.DUST, 30, 0.35f, 40, false, false, 0, Mathf.PI);
                    foreach (var t in InFront(22, 24, 8))
                    {
                        if (rushHit.Add(t)) { float ty = t.BaseY + t.MidH; t.Hit(t.CentreX(ty), ty, new HitOpt { push = 1f, stop = 2, shakeN = 4, straw = 6, crit = Px.Rand() < 0.3f, dmgBase = Dmg(1.3f), sfx = "hit" }, face); }
                        t.Drag(x + face * 16);
                    }
                    bool wall = (face > 0 && x >= G.map.MaxX - 1) || (face < 0 && x <= G.map.MinX + 1);
                    if (actT >= 0.36f || wall)
                    {
                        cStage = 1; vx = face * 40; anim.Play("skill", true); cDur = actT + 0.32f;
                        G.fxs.Play("fx_hero_brandish", x + face * 22, y + 16, true, 0, -1, face < 0, 56);
                        Melee(54, 6, 2.6f, true, "xslash"); G.Shake(10, 1); Sfx.Play("slash");
                    }
                }
                else vx = Mathf.MoveTowards(vx, 0, 400 * Px.DT);
                break;
            case "reaver":    // leap, drive the sword into the ground, the earth erupts outward both ways
                if (cStage == 0)
                {
                    anim.t = 0; vx = face * 40;                        // hold the overhead pose on the way up
                    if (actT >= 0.12f && vy <= 40) { cStage = 1; vy = -380; Sfx.Play("whoosh"); }
                }
                else if (cStage == 1)
                {
                    anim.t = 0; vx = 0; vy = Mathf.Min(vy, -380);
                    if (G.tick % 2 == 0) G.fxs.Ghost(shGhost.frames[anim.Frame], x, y + 6, face < 0, 0.14f);
                    if (grounded)
                    {
                        cStage = 2; anim.t = 0.12f;                    // sword planted
                        reaverX = x + face * 12; reaverY = y; reaverT = actT; reaverStep = 0; reaverL = reaverR = true;
                        G.fxs.Play("fx_hero_slam", reaverX, y, true, 0, -1, face < 0, 56);
                        P.Area(reaverX, y + 12, 34, Dmg(3f), 1, true, "hitBig", face);
                        G.Shake(16, 1); G.Flash(2); Sfx.Play("hitBig");
                        G.parts.Burst(reaverX, y + 2, 22, Particles.DUST, 100, 0.6f, 140, false, false, 0, Mathf.PI);
                        G.parts.Burst(reaverX, y + 4, 14, Particles.EMBER, 80, 0.5f, 60, false, true, 0, Mathf.PI);
                        cDur = actT + 0.1f + 7 * 0.05f + 0.25f;
                    }
                    else if (actT > 2f) act = Act.None;
                }
                else
                {
                    vx = 0;
                    while (reaverStep < 7 && actT >= reaverT + (reaverStep + 1) * 0.05f)
                    {
                        reaverStep++;
                        for (int sd = -1; sd <= 1; sd += 2)
                        {
                            if (sd < 0 ? !reaverL : !reaverR) continue;
                            float sx = reaverX + sd * reaverStep * 15;
                            if (G.map.At(sx, reaverY) == null || sx < G.map.MinX || sx > G.map.MaxX) { if (sd < 0) reaverL = false; else reaverR = false; continue; }
                            G.fxs.Play("fx_hero_quake", sx, reaverY, true, 0, -1, sd < 0, 55);
                            foreach (var t in Game.I.targets)
                            {
                                if (!t.Active || Mathf.Abs(t.CentreX(t.BaseY) - sx) > 9 || Mathf.Abs(t.BaseY - reaverY) > 18) continue;
                                float ty = t.BaseY + t.MidH;
                                t.Hit(t.CentreX(ty), ty, new HitOpt { push = 1.6f, stop = 3, shakeN = 6, straw = 10, big = reaverStep >= 6, bigNum = reaverStep >= 6, crit = Px.Rand() < 0.35f, dmgBase = Dmg(1.8f), sfx = "hit" }, sd);
                            }
                        }
                        G.Shake(5, 1); Sfx.Play("hitBig", 0.35f);
                    }
                }
                break;
            case "dragon":
                if (G.tick % 2 == 0) G.parts.Spawn(x + Px.Range(-8, 8), y + Px.Range(0, 20), 0, Px.Range(20, 50), 0.4f, Particles.EMBER, 0, false, true);
                if (cStage == 0 && actT >= 0.35f) { cStage = 1; anim.Play("skill", true); P.Shoot("fx_hero_dragon", hp.x + face * 8, y + 16, face, 210, Dmg(1.8f), 99, 250, 3, 0, null, "hitBig", true); G.Flash(2); Sfx.Play("whoosh"); }
                break;
            // ---------------------------------------------------------------- arch mage
            case "bolt":
                if (cStage == 0 && actT >= 0.1f) { cStage = 1; P.Shoot("fx_mage_bolt", hp.x, hp.y, face, 240, Dmg(1.15f), 1, 200, 1, 0, null, "tink"); Sfx.Play("star"); }
                break;
            case "blizzard":
            {
                float ax = Mathf.Clamp(x + face * 80, G.map.MinX, G.map.MaxX);
                if (cStage == 0 && actT >= 0.35f) { cStage = 1; anim.Play("skill", true); G.fxs.Play("fx_mage_circle", ax, y + 1, true, 0, -1, false, 52, 1.0f); cNext = actT; }
                if (cStage == 1 && actT >= cNext && actT < 1.2f)
                {
                    cNext = actT + 0.08f;
                    float sx = ax + Px.Range(-55, 55);
                    P.Drop("fx_mage_spear", sx + 18 * face, y + 130, -18 * face, -280, Dmg(1f), y, 0, null, "tink");
                }
                break;
            }
            case "meteor":
                if (G.tick % 2 == 0) { float a = Px.Range(0, 6.28f); G.parts.Spawn(hp.x + Mathf.Cos(a) * 12, hp.y + Mathf.Sin(a) * 10, -Mathf.Cos(a) * 30, -Mathf.Sin(a) * 30, 0.35f, Particles.EMBER, 0, false, true); }
                if (cStage == 0 && actT >= 0.55f)
                {
                    cStage = 1; anim.Play("skill", true);
                    var tg = InFront(190, 70, 1);
                    float tx = tg.Count > 0 ? tg[0].CentreX(tg[0].BaseY) : x + face * 90, ty = tg.Count > 0 ? tg[0].BaseY : y;
                    P.Drop("fx_mage_meteor", tx + 70 * face, ty + 160, -140 * face, -320, Dmg(6f), ty, 58, "fx_mage_boom", "hitBig", true);
                    Sfx.Play("whoosh");
                }
                break;
            case "icestrike":
                if (cStage == 0 && actT >= 0.08f) { cStage = 1; G.fxs.Play("fx_mage_icestrike", x + face * 10, y, true, 0, -1, false, 56); P.Area(x + face * 10, y + 10, 56, Dmg(1.6f), 2, false, "tink", face); G.Shake(6, 1); }
                break;
            // ---------------------------------------------------------------- bishop
            case "holy":
                if (cStage == 0 && actT >= 0.1f) { cStage = 1; P.Shoot("fx_bishop_arrow", hp.x, hp.y, face, 260, Dmg(1.1f), 1, 200, 1, 0, null, "stick"); Sfx.Play("star"); }
                break;
            case "angelray":
                if (cStage == 0 && actT >= 0.12f) { cStage = 1; P.Shoot("fx_bishop_ray", hp.x, hp.y, face, 300, Dmg(2.2f), 3, 240, 2, 0, null, "hit"); Sfx.Play("whoosh"); }
                break;
            case "genesis":
                if (cStage == 0 && actT >= 0.45f)
                {
                    cStage = 1; anim.Play("skill", true); cNext = actT + 0.3f;
                    var tg = InFront(180, 70, 4);
                    genesis.Clear(); genesis.AddRange(tg);
                    if (genesis.Count == 0) G.fxs.Play("fx_bishop_pillar", x + face * 70, y, true, 0, -1, false, 57);
                    foreach (var t in genesis) G.fxs.Play("fx_bishop_pillar", t.CentreX(t.BaseY), t.BaseY, true, 0, -1, false, 57);
                    G.Flash(2); G.Shake(10, 1); Sfx.Play("hitBig");
                }
                if (cStage >= 1 && cStage <= 4 && actT >= cNext)
                {
                    cStage++; cNext = actT + 0.18f;
                    foreach (var t in genesis)
                        if (t.Active) { float ty = t.BaseY + t.MidH; t.Hit(t.CentreX(ty), ty, new HitOpt { push = 1.2f, stop = 3, shakeN = 5, straw = 6, big = cStage == 5, bigNum = cStage == 5, crit = Px.Rand() < 0.3f, dmgBase = Dmg(1.7f), sfx = "hit" }, face); }
                }
                break;
            case "heal":
                if (cStage == 0 && actT >= 0.1f)
                {
                    cStage = 1;
                    G.fxs.Play("fx_bishop_heal", x, y, true, 0, -1, false, 57);
                    int h = Mathf.RoundToInt(Stats.MaxHp * 0.3f);
                    Stats.D.hp = Mathf.Min(Stats.MaxHp, Stats.D.hp + h);
                    G.pops.Show("+" + h, "green", x, y + 30);
                    P.Area(x, y + 12, 60, Dmg(1.5f), 1, false, "hit", face);
                    Sfx.Play("unlock");
                }
                break;
            // ---------------------------------------------------------------- bowmaster
            case "arrow":
                if (cStage == 0 && actT >= 0.09f) { cStage = 1; P.Shoot("fx_bow_arrow", hp.x, hp.y, face, 360, Dmg(1.1f), 1, 220, 1, 0, null, "stick", false, false); Sfx.Play("star"); }
                break;
            case "bomb":
                if (cStage == 0 && actT >= 0.09f) { cStage = 1; P.Shoot("fx_bow_bombarrow", hp.x, hp.y, face, 300, Dmg(1.6f), 1, 200, 1, 32, "fx_bow_bomb", "hitBig"); Sfx.Play("star"); }
                break;
            case "power":
                if (actT < 0.6f && G.tick % 2 == 0) { float a = Px.Range(0, 6.28f); G.parts.Spawn(hp.x + Mathf.Cos(a) * 14, hp.y + Mathf.Sin(a) * 10, -Mathf.Cos(a) * 36, -Mathf.Sin(a) * 30, 0.35f, Particles.SPARK, 0, false, true); }
                if (cStage == 0 && actT >= 0.6f) { cStage = 1; anim.Play("skill", true); P.Shoot("fx_bow_power", hp.x, hp.y, face, 420, Dmg(3.2f), 99, 280, 1, 0, null, "hitBig", true); G.Flash(2); G.Shake(6, 1); Sfx.Play("whoosh"); }
                break;
            case "hurricane":
                if (actT >= cNext && actT < 1.4f)
                {
                    cNext = actT + 0.07f;
                    P.Shoot("fx_bow_arrow", hp.x, hp.y + Px.Range(-1, 1), face, 380, Dmg(0.7f), 1, 220, 1, 0, null, "stick", false, false);
                    Sfx.Play("star", 0.5f);
                }
                break;
        }
        if (act == Act.CAct && actT >= cDur) { act = Act.None; cLock = false; }
    }
    readonly List<ITarget> genesis = new List<ITarget>();

    // second jump in the air
    void DoMobility(Inp inp)
    {
        var G = Game.I;
        if (!Stats.Unlocked(4)) return;
        if (Stats.D.mp < Stats.SkillMp[4]) { Sfx.Play("deny"); return; }
        Stats.D.mp -= Stats.SkillMp[4];
        flashUsed = true; flashAnimT = 0.25f;
        switch (cls.mob)
        {
            case Mobility.Leap:
                vy = 205; vx = face * 70;
                G.parts.Burst(x, y, 10, Particles.DUST, 50, 0.4f, 60, false, false, Mathf.PI, Mathf.PI * 2);
                Sfx.Play("jump");
                break;
            case Mobility.DoubleJump:
                vy = 155; vx = face * 110;
                G.parts.Burst(x, y + 4, 8, Particles.WHITE, 40, 0.3f, 0, true);
                for (int k = 1; k <= 2; k++) G.fxs.Ghost(shGhost.frames[anim.Frame], x - face * k * 6, y, face < 0, 0.12f + k * 0.04f);
                Sfx.Play("jump");
                break;
            case Mobility.Teleport:
            {
                // any of 8 directions from the arrow keys (none held = forward)
                int dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), dy = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
                if (dx == 0 && dy == 0) dx = face;
                if (dx != 0 && act == Act.None) face = dx;
                float fx0 = x, fy0 = y;
                float tx = Mathf.Clamp(x + dx * (dy != 0 ? 44 : 64), G.map.MinX, G.map.MaxX), ty = y + dy * 50;
                // settle onto a platform near the destination, so Up lands you on the ledge above and Down on the one below
                var f = dy > 0 ? G.map.Land(tx, ty + 14, ty - 14) : dy < 0 ? G.map.Land(tx, ty + 10, ty - 40) : null;
                if (dy < 0 && f == null && ty < Px.GROUND) f = G.map.Land(tx, y, Px.GROUND - 1);
                x = tx; y = ty;
                if (f != null) { y = f.y; vy = 0; grounded = true; flashUsed = false; }
                else vy = dy > 0 ? 40 : Mathf.Max(vy, 20);
                for (int k = 0; k < 4; k++) G.fxs.Ghost(shGhost.frames[anim.Frame], Mathf.Lerp(fx0, x, k / 4f), Mathf.Lerp(fy0, y, k / 4f), face < 0, 0.12f + k * 0.03f);
                G.parts.Burst(fx0, fy0 + 12, 12, Particles.VSPARK, 50, 0.35f, 0, true);
                G.parts.Burst(x, y + 12, 12, Particles.VSPARK, 50, 0.35f, 0, true);
                Sfx.Play("blink");
                break;
            }
        }
    }

    // effects that ride along with the player
    void ClassDraw()
    {
        var G = Game.I;
        if (rushSR == null) return;
        bool on = act == Act.CAct && cSkill == "rush" && cStage == 0 && Atlas.Sheets.ContainsKey("fx_hero_rush");
        rushSR.enabled = on && sr.enabled;
        if (on)
        {
            var sh2 = Atlas.Sheets["fx_hero_rush"];
            rushSR.sprite = sh2.frames[Mathf.FloorToInt(G.time * 16) % sh2.count]; rushSR.flipX = face < 0;
            Px.Place(rushSR.transform, x + face * 6, y);
        }
    }
}
