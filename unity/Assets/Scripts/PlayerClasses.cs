using System.Collections.Generic;
using UnityEngine;

// Skill kits for the non-Night-Lord classes. Slots: 0 = J (basic), 1 = K, 2 = L, 3 = U; mobility on the second jump.
//   HERO       Slash · Brandish · Dragon Fury · Rage          · Leap
//   ARCH MAGE  Ice Bolt · Blizzard · Meteor · Ice Strike     · Teleport
//   BISHOP     Holy Arrow · Angel Ray · Genesis · Heal       · Teleport
//   BOWMASTER  Arrow · Power Shot · Hurricane · Arrow Bomb   · Double Jump
public partial class Player
{
    ClassDef cls;
    bool IsNL { get { return cls == null || cls.id == "nightlord"; } }
    public string ClassId { get { return cls == null ? "nightlord" : cls.id; } }
    float rageT;
    SpriteRenderer auraSR;
    string cSkill;
    float cDur, cNext;
    int cStage;
    bool cBig;
    readonly List<ITarget> cTargets = new List<ITarget>();

    public void SetClass(ClassDef c)
    {
        cls = c;
        sh = Atlas.Sheets[c.sheet]; shGhost = Atlas.Sheets[c.ghost];
        anim = new Anim(sh, "idle");
        rageT = 0; act = Act.None;
        if (auraSR == null) { auraSR = Px.MakeSR("aura", Game.I.world, 15); auraSR.enabled = false; }
    }

    Vector2 HandPos() { return Hand(sh, anim.Frame, x, y, face); }
    void Begin(string skill, string animName, float dur, bool big = false)
    {
        act = Act.CAct; actT = 0; cSkill = skill; cDur = dur; cStage = 0; cNext = 0; cBig = big;
        anim.Play(animName, true);
        if (grounded) vx = 0;
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
            case "hero1": Begin("brandish", "skill", 0.5f); G.fxs.Callout("brandish"); Sfx.Play("swish"); break;
            case "hero2": Begin("dragon", "cast", 0.7f, true); G.fxs.Callout("dragon"); Sfx.Play("charge"); break;
            case "hero3": Begin("rage", "cast", 0.5f); G.fxs.Callout("rage"); Sfx.Play("charge"); break;
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
            case "brandish":
                if (cStage == 0 && actT >= 0.08f) { cStage = 1; G.fxs.Play("fx_hero_brandish", x + face * 22, y + 16, true, 0, -1, face < 0, 56); Melee(50, 4, 2.2f, false, "slash"); }
                if (cStage == 1 && actT >= 0.24f) { cStage = 2; Melee(50, 4, 2.2f, true, "xslash"); G.Shake(8, 1); }
                break;
            case "dragon":
                G.gradeTarget = 1;
                if (G.tick % 2 == 0) G.parts.Spawn(x + Px.Range(-8, 8), y + Px.Range(0, 20), 0, Px.Range(20, 50), 0.4f, Particles.EMBER, 0, false, true);
                if (cStage == 0 && actT >= 0.35f) { cStage = 1; anim.Play("skill", true); P.Shoot("fx_hero_dragon", hp.x + face * 8, y + 16, face, 210, Dmg(1.8f), 99, 250, 3, 0, null, "hitBig", true); G.Flash(2); Sfx.Play("whoosh"); }
                break;
            case "rage":
                if (G.tick % 2 == 0) G.parts.Spawn(x + Px.Range(-8, 8), y + Px.Range(0, 10), 0, Px.Range(30, 60), 0.5f, Particles.EMBER, 0, false, true);
                if (cStage == 0 && actT >= 0.2f) { cStage = 1; rageT = 20; G.hud.Chat("RAGE: ATTACK +30% FOR 20S", "gold", 2.5f); Sfx.Play("unlock"); }
                break;
            // ---------------------------------------------------------------- arch mage
            case "bolt":
                if (cStage == 0 && actT >= 0.1f) { cStage = 1; P.Shoot("fx_mage_bolt", hp.x, hp.y, face, 240, Dmg(1.15f), 1, 200, 1, 0, null, "tink"); Sfx.Play("star"); }
                break;
            case "blizzard":
            {
                G.gradeTarget = 1;
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
                G.gradeTarget = 1;
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
                G.gradeTarget = 1;
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
                G.gradeTarget = 1;
                if (actT < 0.6f && G.tick % 2 == 0) { float a = Px.Range(0, 6.28f); G.parts.Spawn(hp.x + Mathf.Cos(a) * 14, hp.y + Mathf.Sin(a) * 10, -Mathf.Cos(a) * 36, -Mathf.Sin(a) * 30, 0.35f, Particles.SPARK, 0, false, true); }
                if (cStage == 0 && actT >= 0.6f) { cStage = 1; anim.Play("skill", true); P.Shoot("fx_bow_power", hp.x, hp.y, face, 420, Dmg(3.2f), 99, 280, 1, 0, null, "hitBig", true); G.Flash(2); G.Shake(6, 1); Sfx.Play("whoosh"); }
                break;
            case "hurricane":
                G.gradeTarget = 1;
                if (actT >= cNext && actT < 1.4f)
                {
                    cNext = actT + 0.07f;
                    P.Shoot("fx_bow_arrow", hp.x, hp.y + Px.Range(-1, 1), face, 380, Dmg(0.7f), 1, 220, 1, 0, null, "stick", false, false);
                    Sfx.Play("star", 0.5f);
                }
                break;
        }
        if (actT >= cDur)
        {
            act = Act.None;
            if (cBig && G.proj.BigAlive == 0) G.gradeTarget = 0;
        }
    }
    readonly List<ITarget> genesis = new List<ITarget>();

    // second jump in the air
    void DoMobility()
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
                float from = x;
                x = Mathf.Clamp(x + face * 60, G.map.MinX, G.map.MaxX);
                for (int k = 0; k < 4; k++) G.fxs.Ghost(shGhost.frames[anim.Frame], Mathf.Lerp(from, x, k / 4f), y, face < 0, 0.12f + k * 0.03f);
                G.parts.Burst(from, y + 12, 12, Particles.VSPARK, 50, 0.35f, 0, true);
                G.parts.Burst(x, y + 12, 12, Particles.VSPARK, 50, 0.35f, 0, true);
                vy = Mathf.Max(vy, 20);
                Sfx.Play("blink");
                break;
            }
        }
    }

    // buffs / auras drawn with the player
    void ClassDraw()
    {
        var G = Game.I;
        if (rageT > 0) rageT -= Px.DT;
        bool aura = rageT > 0 && Atlas.Sheets.ContainsKey("fx_hero_rage");
        if (auraSR != null)
        {
            auraSR.enabled = aura && sr.enabled;
            if (aura)
            {
                var s = Atlas.Sheets["fx_hero_rage"];
                auraSR.sprite = s.frames[Mathf.FloorToInt(G.time * 12) % s.count];
                Px.Place(auraSR.transform, x, y);
                if (G.tick % 6 == 0) G.parts.Spawn(x + Px.Range(-7, 7), y + Px.Range(2, 18), 0, Px.Range(10, 25), 0.5f, Particles.EMBER, 0, false, false);
            }
        }
    }
}
