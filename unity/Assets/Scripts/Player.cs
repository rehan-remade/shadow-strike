using System.Collections.Generic;
using UnityEngine;

// The Night Lord. MapleStory movement (one-way platforms, drop-through, ropes/ladders, Flash Jump) and the
// level-gated skill kit: J Triple Throw, K Avenger, L Assassinate, U Shadow Partner. 1/2 drink potions.
public partial class Player
{
    const float RUN = 70, GRAV = 430, JUMP_V = 158, FLASH_VX = 200, FLASH_VY = 70, AIR_ACC = 320, CLIMB = 42;
    public const float CD_THROW = 0.36f, CD_AV = 4f, CD_AS = 6f, CD_SP = 30f, SP_DUR = 20f;
    const int DELAY = 6;

    enum Act { None, Throw, Charge, AvThrow, Seal, Blink, Slash, CAct }
    Act act = Act.None;
    float actT;
    int throwStage;
    ITarget slashT;
    float blinkTo;

    public float x = 60, y = Px.GROUND, vx, vy;
    public int face = 1;
    public bool grounded = true;
    bool flashUsed;
    float flashAnimT, landT, potCd, regenT, dropT;
    int dropIgnore = -1;
    Climb climb;
    public float cdThrow, cdAv, cdAs, cdSp, partnerT;
    public float invuln, hurtFlash;
    public bool dead, frozen;
    float deadT, tombY, tombVy;

    Sheet sh, shClone, shGhost, bigS, bigC;
    readonly SpriteRenderer sr, csr, chargeSR, cChargeSR, tomb, prompt;
    Anim anim;
    bool visible = true;

    struct Snap { public float x, y; public int face, frame; public bool vis, charging; public int chargeK; }
    readonly Snap[] hist = new Snap[64];
    int histHead;
    public bool CloneOn { get; private set; }
    struct CloneEvt { public int due, kind; }
    readonly List<CloneEvt> cloneEvts = new List<CloneEvt>();
    readonly List<int> pendingStars = new List<int>();

    public bool CanBeHit { get { return !dead && invuln <= 0 && act != Act.Blink && !frozen; } }

    public Player()
    {
        var G = Game.I;
        sh = Atlas.Sheets["ninja"]; shClone = Atlas.Sheets["ninja_clone"]; shGhost = Atlas.Sheets["ninja_ghost"];
        bigS = Atlas.Sheets["bigstar"]; bigC = Atlas.Sheets["bigstar_clone"];
        sr = Px.MakeSR("player", G.world, 16);
        csr = Px.MakeSR("clone", G.world, 14); csr.enabled = false;
        chargeSR = Px.MakeSR("charge", G.fx, 31, Px.LAYER_FX); chargeSR.enabled = false;
        cChargeSR = Px.MakeSR("clonecharge", G.fx, 30, Px.LAYER_FX); cChargeSR.enabled = false;
        tomb = Px.MakeSR("tomb", G.world, 17); tomb.sprite = Atlas.Single("tomb"); tomb.enabled = false;
        prompt = Px.MakeSR("prompt", G.world, 45); prompt.enabled = false;
        anim = new Anim(sh, "idle");
    }

    public void PlaceAt(float px, float py)
    {
        x = px; y = py; vx = vy = 0; grounded = true; climb = null; act = Act.None; visible = true;
        CloneOn = false; csr.enabled = false; cChargeSR.enabled = false; chargeSR.enabled = false;
        pendingStars.Clear(); cloneEvts.Clear();
        for (int i = 0; i < hist.Length; i++) hist[i] = new Snap { x = x, y = y, face = face, frame = 0, vis = true };
        Draw();
    }
    public void SetVisible(bool v) { sr.enabled = v; if (!v) { csr.enabled = false; prompt.enabled = false; } }

    Vector2 Hand(Sheet s, int frame, float px, float py, int f) { var h = s.hands[frame]; return new Vector2(px + (f > 0 ? h.x : -h.x - 1), py + h.y); }
    Vector2 CloneOffset(int f) { return new Vector2(-f * 7, 0); }   // same ground, just behind like a shadow
    float Dmg(float mult) { return Stats.Atk * mult * (rageT > 0 ? 1.3f : 1f); }

    bool Spend(int skill)
    {
        var G = Game.I;
        if (!Stats.Unlocked(skill)) { G.hud.Chat(Stats.SkillName[skill] + " UNLOCKS AT LV " + Stats.SkillLevel[skill], "white", 2f); Sfx.Play("deny"); return false; }
        if (Stats.D.mp < Stats.SkillMp[skill]) { G.hud.Chat("NOT ENOUGH MP.", "white", 2f); Sfx.Play("deny"); return false; }
        Stats.D.mp -= Stats.SkillMp[skill];
        return true;
    }

    public void Tick(Inp inp)
    {
        var G = Game.I; var M = G.map;
        cdThrow -= Px.DT; cdAv -= Px.DT; cdAs -= Px.DT; cdSp -= Px.DT; potCd -= Px.DT;
        if (invuln > 0) invuln -= Px.DT;
        if (hurtFlash > 0) hurtFlash -= Px.DT;
        if (dropT > 0) { dropT -= Px.DT; if (dropT <= 0) dropIgnore = -1; }
        if (dead) { DeadTick(); return; }
        if (flashAnimT > 0) flashAnimT -= Px.DT;
        if (landT > 0) landT -= Px.DT;

        // regen
        regenT += Px.DT;
        if (regenT >= 3f)
        {
            regenT = 0;
            float k = M.def.id == "town" ? 3f : 1f;
            Stats.D.hp = Mathf.Min(Stats.MaxHp, Stats.D.hp + Mathf.CeilToInt(Stats.MaxHp * 0.02f * k));
            Stats.D.mp = Mathf.Min(Stats.MaxMp, Stats.D.mp + Mathf.CeilToInt(Stats.MaxMp * 0.03f * k));
        }
        // potions
        if (potCd <= 0 && inp.pot1) { potCd = 0.3f; if (Stats.D.red > 0 && Stats.D.hp < Stats.MaxHp) { Stats.D.red--; Stats.D.hp = Mathf.Min(Stats.MaxHp, Stats.D.hp + 60); Sfx.Play("potion"); G.pops.Show("+60", "green", x, y + 28); } else Sfx.Play("deny"); }
        if (potCd <= 0 && inp.pot2) { potCd = 0.3f; if (Stats.D.blue > 0 && Stats.D.mp < Stats.MaxMp) { Stats.D.blue--; Stats.D.mp = Mathf.Min(Stats.MaxMp, Stats.D.mp + 40); Sfx.Play("potion"); G.pops.Show("+40", "blue", x, y + 28); } else Sfx.Play("deny"); }

        int dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

        if (climb != null) { ClimbTick(inp, dir); Finish(); return; }

        if (act == Act.None)
        {
            if (dir != 0) face = dir;
            if (grounded) vx = dir * RUN;
            else vx = Mathf.MoveTowards(vx, dir * RUN, (Mathf.Abs(vx) > RUN ? 140 : AIR_ACC) * Px.DT);

            // interactions: Up = portal / NPC / grab rope, Down = climb down / drop through
            if (inp.upPress && grounded && G.TryInteract()) { Finish(); return; }
            if (inp.up)
            {
                var c = M.ClimbAt(x, y, false);
                if (c != null && (!grounded || y < c.y1 - 2)) { StartClimb(c); Finish(); return; }
            }
            if (inp.down && grounded && !inp.jump)
            {
                var c = M.ClimbAt(x, y, true);
                if (c != null) { StartClimb(c); y -= 3; Finish(); return; }
            }
            if (inp.jump)
            {
                var fh = M.At(x, y);
                if (grounded && inp.down && fh != null && !fh.solid) { dropIgnore = fh.id; dropT = 0.3f; grounded = false; vy = 20; }
                else if (grounded) { vy = JUMP_V; grounded = false; Sfx.Play("jump", 0.6f); }
                else if (!flashUsed) { if (IsNL) FlashJump(); else DoMobility(); }
            }
            if (!IsNL) ClassInput(inp);
            else if (inp.partner && cdSp <= 0) { if (Spend(3)) StartSeal(); }
            else if (inp.assassin && cdAs <= 0) { if (Spend(2)) StartBlink(); }
            else if (inp.avenger && cdAv <= 0) { if (Spend(1)) StartCharge(); }
            else if (inp.attack && cdThrow <= 0) StartThrow();
        }
        else if (grounded) vx = 0;

        if (act != Act.None) { actT += Px.DT; RunAct(); }

        for (int i = pendingStars.Count - 1; i >= 0; i--)
            if (G.tick >= pendingStars[i])
            {
                pendingStars.RemoveAt(i);
                var hp = Hand(sh, anim.Frame, x, y, face);
                G.proj.ThrowStar(hp.x + face * 2, hp.y, face, false, Dmg(1f));
                if (CloneOn) cloneEvts.Add(new CloneEvt { due = G.tick + DELAY, kind = 0 });
            }

        // physics: gravity + one-way footholds
        if (act != Act.Blink)
        {
            float oy = y;
            if (grounded && M.At(x, y) == null) grounded = false;       // walked off an edge
            if (!grounded)
            {
                vy -= GRAV * Px.DT;
                y += vy * Px.DT;
                if (vy <= 0)
                {
                    var f = M.Land(x, oy, y, dropIgnore);
                    if (f != null)
                    {
                        if (vy < -140) { landT = 0.1f; G.parts.Burst(x, f.y, 5, Particles.DUST, 30, 0.4f, 40, false, false, 0, Mathf.PI); }
                        y = f.y; vy = 0; grounded = true; flashUsed = false;
                    }
                }
                if (y < -40) { y = Px.GROUND; x = M.def.spawnX; vy = 0; }   // safety net
            }
            float nx = Mathf.Clamp(x + vx * Px.DT, M.MinX, M.MaxX);
            if (grounded && M.At(nx, y) == null && M.At(x, y) != null) { /* step off the edge */ }
            x = nx;
        }
        if (Mathf.Abs(vx) > RUN + 20 && G.tick % 3 == 0) G.fxs.Ghost(shGhost.frames[anim.Frame], x, y, face < 0, 0.2f);

        if (act == Act.None)
        {
            if (grounded) anim.Play(landT > 0 ? "crouch" : Mathf.Abs(vx) > 1 ? "run" : "idle");
            else anim.Play(flashAnimT > 0 ? "flash" : vy > 20 ? "jump" : "fall");
        }
        anim.Tick();
        Finish();
    }

    void Finish()
    {
        var G = Game.I;
        if (CloneOn)
        {
            partnerT -= Px.DT;
            if (partnerT <= 0)
            {
                CloneOn = false; csr.enabled = false; cChargeSR.enabled = false;
                var s0 = hist[(histHead - DELAY + hist.Length) % hist.Length]; var co = CloneOffset(s0.face);
                Puff(s0.x + co.x, s0.y + co.y + 10); Sfx.Play("poof");
            }
        }
        for (int i = cloneEvts.Count - 1; i >= 0; i--)
        {
            if (G.tick < cloneEvts[i].due) continue;
            var e = cloneEvts[i]; cloneEvts.RemoveAt(i);
            if (!CloneOn) continue;
            var s = hist[(histHead - DELAY + hist.Length) % hist.Length]; var co = CloneOffset(s.face);
            var hp = Hand(shClone, s.frame, s.x + co.x, s.y + co.y, s.face);
            if (e.kind == 0) G.proj.ThrowStar(hp.x + s.face * 2, hp.y, s.face, true, Dmg(0.5f));
            else G.proj.ThrowBig(hp.x, hp.y + 8, s.face, true, Dmg(0.65f));
        }
        Draw();
    }

    // ------------------------------------------------------------------ ropes & ladders
    void StartClimb(Climb c)
    {
        climb = c; x = c.x; vx = vy = 0; grounded = false; act = Act.None; chargeSR.enabled = false;
        anim.Play("climb", true); Sfx.Play("rope", 0.5f);
    }
    void ClimbTick(Inp inp, int dir)
    {
        var M = Game.I.map;
        float v = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
        y += v * CLIMB * Px.DT;
        if (v != 0) anim.Tick();
        if (y >= climb.y1)
        {
            var f = M.At(climb.x, climb.y1);
            if (f != null) { y = f.y; grounded = true; climb = null; return; }
            y = climb.y1;
        }
        if (y <= climb.y0)
        {
            y = climb.y0;
            var f = M.At(x, y);
            if (f != null && inp.down) { grounded = true; climb = null; return; }
        }
        if (inp.jump && dir != 0) { climb = null; face = dir; vx = dir * 60; vy = 90; flashUsed = false; Sfx.Play("jump", 0.5f); }
    }

    void FlashJump()
    {
        var G = Game.I;
        if (!Stats.Unlocked(4)) return;
        if (Stats.D.mp < Stats.SkillMp[4]) { Sfx.Play("deny"); return; }
        Stats.D.mp -= Stats.SkillMp[4];
        flashUsed = true; flashAnimT = 0.25f;
        vx = face * FLASH_VX; vy = Mathf.Max(vy, 0) * 0.3f + FLASH_VY;
        Puff(x - face * 8, y + 8);
        G.parts.Burst(x - face * 6, y + 8, 10, Particles.SMOKE, 60, 0.4f, 0, false, false, 0, Mathf.PI * 2, 0.4f);
        for (int k = 1; k <= 3; k++) G.fxs.Ghost(shGhost.frames[anim.Frame], x - face * k * 5, y, face < 0, 0.12f + k * 0.04f);
        Sfx.Play("blink");
    }
    void Puff(float px, float py) { Game.I.fxs.Play("puff", px, py, false, 0, -1, false, 18); }

    // ------------------------------------------------------------------ skills
    void StartThrow() { act = Act.Throw; actT = 0; throwStage = 0; cdThrow = CD_THROW; anim.Play("throw", true); Sfx.Play("swish", 0.7f); }
    void StartCharge() { act = Act.Charge; actT = 0; cdAv = CD_AV; anim.Play("charge", true); Game.I.fxs.Callout("avenger"); Sfx.Play("charge"); Sfx.Play("whirr"); }
    void StartSeal() { act = Act.Seal; actT = 0; cdSp = CD_SP; anim.Play("seal", true); Sfx.Play("swish"); }
    void StartBlink()
    {
        var G = Game.I;
        // nearest living target in front, within reach
        slashT = null; float best = 1e9f;
        foreach (var t in G.targets)
        {
            if (!t.Active) continue;
            float dx = t.CentreX(t.BaseY + t.MidH) - x;
            if (Mathf.Abs(t.BaseY - y) > 36 || Mathf.Abs(dx) > 110 || (Mathf.Sign(dx) != face && Mathf.Abs(dx) > 6)) continue;
            if (Mathf.Abs(dx) < best) { best = Mathf.Abs(dx); slashT = t; }
        }
        float from = x;
        if (slashT != null) blinkTo = Mathf.Clamp(slashT.CentreX(slashT.BaseY) - face * slashT.Reach, G.map.MinX, G.map.MaxX);
        else blinkTo = Mathf.Clamp(x + face * 56, G.map.MinX, G.map.MaxX);
        act = Act.Blink; actT = 0; cdAs = slashT != null ? CD_AS : 1.5f;
        Puff(x, y + 10); Sfx.Play("blink");
        for (int k = 0; k < 5; k++) G.fxs.Ghost(shGhost.frames[anim.Frame], Mathf.Lerp(from, blinkTo, k / 5f), y, face < 0, 0.12f + k * 0.03f);
        visible = false; vy = Mathf.Max(vy, 0);
    }

    void RunAct()
    {
        var G = Game.I;
        if (act == Act.CAct) { ClassRun(); return; }
        switch (act)
        {
            case Act.Throw:
                if (throwStage == 0 && actT >= 0.06f) { throwStage = 1; for (int k = 0; k < 3; k++) pendingStars.Add(G.tick + k * 3); }
                if (actT >= 0.3f) act = Act.None;
                break;
            case Act.Charge:
                G.gradeTarget = 1;
                if (G.tick % 2 == 0)
                {
                    var hp = Hand(sh, anim.Frame, x, y, face); float a = Px.Range(0, Mathf.PI * 2);
                    G.parts.Spawn(hp.x + Mathf.Cos(a) * 12, hp.y + 8 + Mathf.Sin(a) * 10, -Mathf.Cos(a) * 30, -Mathf.Sin(a) * 30, 0.35f, Particles.VSPARK, 0, false, true);
                }
                if (actT >= 0.5f)
                {
                    act = Act.AvThrow; actT = 0; anim.Play("throw", true); anim.t = 1f / 16f;
                    var hp = Hand(sh, anim.Frame, x, y, face);
                    G.proj.ThrowBig(hp.x + face * 4, hp.y + 8, face, false, Dmg(1.3f));
                    if (CloneOn) cloneEvts.Add(new CloneEvt { due = G.tick + DELAY, kind = 1 });
                    G.Flash(2);
                }
                break;
            case Act.AvThrow:
                if (actT >= 0.25f) act = Act.None;
                break;
            case Act.Seal:
                if (actT >= 0.15f && !CloneOn)
                {
                    CloneOn = true; partnerT = SP_DUR;
                    var co = CloneOffset(face);
                    Puff(x + co.x, y + co.y + 10);
                    G.parts.Burst(x + co.x, y + co.y + 10, 16, Particles.SMOKE, 50, 0.5f, -20, false, false, 0, Mathf.PI * 2, 0.5f);
                    G.fxs.Callout("shadow"); Sfx.Play("poof");
                }
                if (actT >= 0.4f) act = Act.None;
                break;
            case Act.Blink:
                if (actT >= 0.14f)
                {
                    x = blinkTo; visible = true; Puff(x, y + 10);
                    var f = G.map.At(x, y); if (f == null) grounded = false;
                    if (slashT != null && slashT.Active)
                    {
                        face = slashT.CentreX(slashT.BaseY) >= x ? 1 : -1;
                        act = Act.Slash; actT = 0; anim.Play("slash", true); throwStage = 0;
                    }
                    else { act = Act.None; anim.Play("crouch", true); }
                }
                break;
            case Act.Slash:
                G.gradeTarget = 1;
                var T = slashT;
                if (T == null || !T.Active) { if (actT >= 0.3f) act = Act.None; break; }
                float cy = T.BaseY + T.MidH, tx = T.CentreX(cy);
                if (throwStage == 0)
                {
                    throwStage = 1;
                    G.fxs.Play("slasharc", tx - 1, cy, true, 11, 11, face < 0);
                    T.Hit(tx, cy + 4, new HitOpt { push = 1.5f, stop = 5, shakeN = 6, straw = 8, crit = true, dmgBase = Dmg(2.2f), sfx = "slash" }, face);
                }
                else if (throwStage == 1 && actT >= 0.12f && T.Active)
                {
                    throwStage = 2;
                    G.fxs.Play("slasharc", tx - 1, cy, true, 0, 11, face < 0);
                    T.Hit(tx, cy - 4, new HitOpt { push = 1.5f, stop = 5, shakeN = 6, straw = 8, crit = true, dmgBase = Dmg(2.2f), sfx = "slash" }, face);
                }
                else if (throwStage == 2 && actT >= 0.24f && T.Active)
                {
                    throwStage = 3;
                    G.fxs.Play("xslash", tx, cy, true);
                    T.Mark();
                    T.Hit(tx, cy, new HitOpt { push = 3.2f, stop = 10, shakeN = 18, straw = 26, big = true, crit = true, bigNum = true, dmgBase = Dmg(6.5f), sfx = "xslash" }, face);
                    G.Flash(3);
                    G.parts.Burst(tx, cy, 30, Particles.VSPARK, 130, 0.6f, 60, true, false, 0, Mathf.PI * 2, 0.3f);
                    G.fxs.Callout("assassinate");
                }
                if (actT >= 0.55f) act = Act.None;
                break;
        }
        if (act != Act.Charge && act != Act.Slash && G.proj.BigAlive == 0) G.gradeTarget = 0;
    }

    // ------------------------------------------------------------------ getting hit
    public void Hurt(int dmg, int dirKnock)
    {
        if (!CanBeHit) return;
        var G = Game.I;
        Stats.D.hp = Mathf.Max(0, Stats.D.hp - dmg);
        G.pops.Show(dmg.ToString(), "vio", x, y + 30);
        invuln = 1.4f; hurtFlash = 0.15f;
        act = Act.None; pendingStars.Clear(); chargeSR.enabled = false; visible = true; G.gradeTarget = 0;
        climb = null;
        vx = dirKnock * 90; vy = 120; grounded = false; flashUsed = true;
        G.Shake(6, 1);
        G.parts.Burst(x, y + 10, 8, Particles.VSPARK, 70, 0.35f, 80, true);
        Sfx.Play("hurt");
        if (Stats.D.hp <= 0) Die();
    }

    void Die()
    {
        dead = true; deadT = 0;
        tomb.enabled = true; tombY = y + 110; tombVy = 0;
        CloneOn = false; csr.enabled = false; cChargeSR.enabled = false;
        Game.I.gradeTarget = 0;
        Sfx.Play("whoosh");
    }
    public void Revive()
    {
        dead = false; tomb.enabled = false; invuln = 2f;
        Stats.D.hp = Mathf.Max(1, Stats.MaxHp / 3);
    }

    void DeadTick()
    {
        var G = Game.I;
        deadT += Px.DT;
        if (tombY > y)
        {
            tombVy -= 600 * Px.DT; tombY += tombVy * Px.DT;
            if (tombY <= y) { tombY = y; G.Shake(6, 1); G.parts.Burst(x, y + 1, 10, Particles.DUST, 50, 0.5f, 100, false, true, 0, Mathf.PI); Sfx.Play("stick"); }
        }
        Px.Place(tomb.transform, x - 6, tombY);
        anim.Play("fall"); anim.Tick();
        sr.enabled = true;
        sr.sprite = shGhost.frames[anim.Frame]; sr.flipX = face < 0;
        Px.Place(sr.transform, x, y + 14 + Mathf.Round(Mathf.Sin(deadT * 4) * 2));
        chargeSR.enabled = false; prompt.enabled = false;
        if (deadT >= 1.6f && !G.dialog.Open) G.OnPlayerDeath();
    }

    // ------------------------------------------------------------------ draw
    void Draw()
    {
        var G = Game.I;
        int fr = anim.Frame;
        sr.enabled = visible && (invuln <= 0 || ((G.tick >> 1) & 1) == 0);
        sr.sprite = sh.frames[fr]; sr.flipX = face < 0;
        Px.Place(sr.transform, x, y);

        int chargeK = -1;
        if (act == Act.Charge)
        {
            chargeK = Mathf.Min(5, Mathf.FloorToInt(actT / 0.5f * 6));
            var hp = Hand(sh, fr, x, y, face);
            chargeSR.enabled = true;
            chargeSR.sprite = bigS.frames[chargeK * 8 + (G.tick >> 1) % 8];
            Px.Place(chargeSR.transform, hp.x, hp.y + 3 + chargeK);
        }
        else chargeSR.enabled = false;

        histHead = (histHead + 1) % hist.Length;
        hist[histHead] = new Snap { x = x, y = y, face = face, frame = fr, vis = visible, charging = chargeK >= 0, chargeK = chargeK };

        if (CloneOn)
        {
            var s = hist[(histHead - DELAY + hist.Length) % hist.Length]; var co = CloneOffset(s.face);
            csr.enabled = s.vis && (G.tick / 2) % 11 != 0;
            csr.sprite = shClone.frames[s.frame]; csr.flipX = s.face < 0;
            Px.Place(csr.transform, s.x + co.x, s.y + co.y);
            if (s.charging)
            {
                var hp = Hand(shClone, s.frame, s.x + co.x, s.y + co.y, s.face);
                cChargeSR.enabled = true; cChargeSR.sprite = bigC.frames[s.chargeK * 8 + (G.tick >> 1) % 8];
                Px.Place(cChargeSR.transform, hp.x, hp.y + 3 + s.chargeK);
            }
            else cChargeSR.enabled = false;
        }

        // "UP" prompt over portals / NPCs
        string hint = G.InteractHint();
        prompt.enabled = hint != null && grounded && act == Act.None;
        if (prompt.enabled) { prompt.sprite = G.hud.UpKey; Px.Place(prompt.transform, x - 5, y + 26 + ((G.tick >> 4) & 1)); }
        ClassDraw();
    }
}
