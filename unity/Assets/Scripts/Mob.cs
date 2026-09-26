using System.Collections.Generic;
using UnityEngine;

public class MobDef
{
    public string id, name, drop;
    public int level, hp, atk, exp, mesoMin, mesoMax, w, h;
    public float speed, dropChance;
    public bool hop, fly;
}

public static class MobDefs
{
    static readonly Dictionary<string, MobDef> all = new Dictionary<string, MobDef>
    {
        { "shellback", new MobDef { id = "shellback", name = "SHELLBACK", level = 1, hp = 24, atk = 5, exp = 6, mesoMin = 2, mesoMax = 7, speed = 9, w = 18, h = 13 } },
        { "capling", new MobDef { id = "capling", name = "CAPLING", level = 3, hp = 72, atk = 11, exp = 14, mesoMin = 5, mesoMax = 15, speed = 20, w = 16, h = 18, drop = "cap", dropChance = 0.55f } },
        { "stumpy", new MobDef { id = "stumpy", name = "STUMPY", level = 6, hp = 240, atk = 20, exp = 32, mesoMin = 12, mesoMax = 30, speed = 14, w = 22, h = 24, drop = "root", dropChance = 0.3f } },
        { "wisp", new MobDef { id = "wisp", name = "WISP", level = 8, hp = 200, atk = 24, exp = 40, mesoMin = 15, mesoMax = 36, speed = 22, w = 14, h = 17, fly = true } },
    };
    public static MobDef Get(string id) { return all[id]; }
}

// A field monster: patrols its foothold, hops (capling) or floats (wisp), aggros when hit,
// deals touch damage, shows an HP bar when damaged, drops meso/items and respawns.
public class Mob : ITarget
{
    public const bool ART_FACES_LEFT = false;  // baked mob sprites face right
    public readonly MobDef d;
    readonly Foothold fh;
    readonly SpriteRenderer sr, hpFrame, hpFill;
    readonly Sheet sh, shW;
    readonly Anim anim;
    readonly DamageStack stack = new DamageStack();
    enum S { Stand, Move, Hit, Die, Gone }
    S s = S.Stand;
    public float x, y, hp;
    float vx, vy, actT, stateT, flashT, hpBarT, respawnT, seed, knock;
    int face = -1;
    bool air, aggro;

    public Mob(MobDef def, Foothold f, Transform root)
    {
        d = def; fh = f; seed = Px.Range(0, 100);
        sh = Atlas.Sheets["mob_" + d.id]; shW = Atlas.Sheets.ContainsKey("mob_" + d.id + "_white") ? Atlas.Sheets["mob_" + d.id + "_white"] : sh;
        sr = Px.MakeSR(d.id, root, 13);
        hpFrame = Px.MakeSR("hpf", root, 29); hpFrame.sprite = Px.White; hpFrame.color = Px.P("ink"); hpFrame.enabled = false;
        hpFill = Px.MakeSR("hp", root, 30); hpFill.sprite = Px.White; hpFill.color = Px.P("crim1"); hpFill.enabled = false;
        anim = new Anim(sh, "stand");
        Respawn(false);
    }

    void Respawn(bool fx)
    {
        hp = d.hp; aggro = false; s = S.Stand; actT = Px.Range(0.5f, 2f); vx = vy = 0; air = false;
        x = Px.Range(fh.x0 + 10, Mathf.Max(fh.x0 + 11, fh.x1 - 10));
        y = BaseY0;
        face = Px.Rand() < 0.5f ? -1 : 1;
        anim.Play("stand", true);
        sr.enabled = true;
        if (fx) Game.I.parts.Burst(x, y + d.h / 2, 10, Particles.VSPARK, 40, 0.4f, 0, false);
    }
    float BaseY0 { get { return fh.y; } }        // wisps bob inside their frames

    // ITarget
    public bool Active { get { return s != S.Die && s != S.Gone; } }
    public float BaseY { get { return y; } }
    public float SurfL(float yy) { return x - d.w / 2f; }
    public float SurfR(float yy) { return x + d.w / 2f; }
    public bool InBand(float yy) { return yy >= y - 1 && yy <= y + d.h + 3; }
    public float CentreX(float yy) { return x; }
    public int MidH { get { return d.h / 2; } }
    public int Reach { get { return d.w / 2 + 10; } }
    public bool Grind { get { return false; } }
    public void StickStar(float sx, float sy, bool clone) { }
    public void Mark() { flashT = 0.15f; }

    public void Hit(float hx, float hy, HitOpt o, int dir)
    {
        if (!Active) return;
        var G = Game.I;
        int v = Px.Roll(o.dmgBase * (o.crit ? 1.6f : 1f));
        hp -= v;
        flashT = 0.07f; hpBarT = 4f; aggro = true;
        if (!d.fly || true) { knock = dir * (o.big ? 90 : 45); }
        s = S.Hit; stateT = 0.28f; anim.Play("hit", true);
        G.Hitstop(Mathf.Min(o.stop, 3));
        if (o.big) G.Shake(8, 1);
        G.fxs.Impact(hx, hy, o.big);
        G.parts.Burst(hx, hy, o.big ? 10 : 4, Particles.SPARK, 60, 0.3f, 60, true);
        G.numbers.Show(v, o.crit, o.bigNum, stack, x + 1, y + d.h);
        Sfx.Play(string.IsNullOrEmpty(o.sfx) ? "mobhit" : o.sfx, 0.8f);
        if (hp <= 0) Die();
    }

    void Die()
    {
        var G = Game.I;
        s = S.Die; anim.Play("die", true); hpFrame.enabled = hpFill.enabled = false;
        Sfx.Play("mobdie");
        Stats.GainExp(d.exp);
        Stats.OnKill(d.id);
        G.drops.Spawn("meso", Mathf.RoundToInt(Px.Range(d.mesoMin, d.mesoMax)), x, y + 6);
        if (d.drop != null && Px.Rand() < d.dropChance) G.drops.Spawn(d.drop, 1, x, y + 6);
        if (Px.Rand() < 0.06f) G.drops.Spawn(Px.Rand() < 0.6f ? "red" : "blue", 1, x, y + 6);
    }

    public void Tick()
    {
        var G = Game.I; var P = G.player;
        if (flashT > 0) flashT -= Px.DT;
        if (hpBarT > 0) hpBarT -= Px.DT;
        switch (s)
        {
            case S.Gone:
                respawnT -= Px.DT;
                if (respawnT <= 0) Respawn(true);
                return;
            case S.Die:
                anim.Tick();
                if (anim.Done) { s = S.Gone; sr.enabled = false; respawnT = 7f; return; }
                break;
            case S.Hit:
                stateT -= Px.DT;
                if (stateT <= 0) { s = S.Move; actT = Px.Range(1.5f, 3f); anim.Play("move", true); }
                break;
            default:
                actT -= Px.DT;
                if (actT <= 0)
                {
                    bool chase = aggro && Mathf.Abs(P.y - y) < 40;
                    if (!chase && Px.Rand() < 0.4f) { s = S.Stand; actT = Px.Range(0.8f, 2f); anim.Play("stand", true); }
                    else { s = S.Move; actT = Px.Range(1.2f, 3f); face = chase ? (P.x < x ? -1 : 1) : (Px.Rand() < 0.5f ? -1 : 1); anim.Play("move", true); }
                }
                break;
        }
        // movement
        if (s != S.Die)
        {
            float spd = s == S.Move ? d.speed * (aggro ? 1.3f : 1f) : 0;
            if (d.hop)
            {
                if (!air && s == S.Move) { vy = 95; air = true; }
                if (air) { vy -= 380 * Px.DT; y += vy * Px.DT; if (y <= fh.y) { y = fh.y; air = false; vy = 0; } }
                if (!air) spd = 0;
            }
            x += (face * spd + knock) * Px.DT;
            knock = Mathf.MoveTowards(knock, 0, 260 * Px.DT);
            float lo = fh.x0 + 6, hi = fh.x1 - 6;
            if (x < lo) { x = lo; face = 1; } else if (x > hi) { x = hi; face = -1; }
            if (s == S.Move || s == S.Stand) anim.Tick(); else if (s == S.Hit) anim.Tick();
            // touch damage
            if (Active && P.CanBeHit && Mathf.Abs(P.x - x) < d.w / 2f + 3 && P.y < y + d.h - 2 && P.y + 18 > y)
                P.Hurt(Px.Roll(d.atk), P.x < x ? -1 : 1);
        }
        // render
        sr.sprite = (flashT > 0 ? shW : sh).frames[anim.Frame];
        sr.flipX = ART_FACES_LEFT ? face > 0 : face < 0;
        Px.Place(sr.transform, x, y);
        bool bar = hpBarT > 0 && Active;
        hpFrame.enabled = hpFill.enabled = bar;
        if (bar)
        {
            hpFrame.transform.localScale = new Vector3(18, 3, 1); Px.Place(hpFrame.transform, x - 9, y + d.h + 3);
            int w = Mathf.Max(1, Mathf.RoundToInt(16 * Mathf.Clamp01(hp / d.hp)));
            hpFill.transform.localScale = new Vector3(w, 1, 1); Px.Place(hpFill.transform, x - 8, y + d.h + 4);
        }
    }
}

// Meso and item drops: pop out, fall onto footholds, bob, and get picked up by walking over them.
public class Drops
{
    class Drop { public SpriteRenderer sr; public string id; public int n; public float x, y, vx, vy, t; public bool on, rest; }
    readonly List<Drop> list = new List<Drop>();
    public static string ItemName(string id)
    {
        switch (id) { case "cap": return "CAPLING CAP"; case "root": return "GNARLED ROOT"; case "red": return "RED POTION"; case "blue": return "BLUE POTION"; case "crown": return "MUSHROOM CROWN"; }
        return id.ToUpper();
    }
    static string Icon(string id)
    {
        switch (id) { case "red": return "potion_red"; case "blue": return "potion_blue"; }
        return id;
    }

    public void Spawn(string id, int n, float x, float y)
    {
        var d = list.Find(q => !q.on);
        if (d == null) { d = new Drop { sr = Px.MakeSR("drop", Game.I.world, 22) }; list.Add(d); }
        d.on = true; d.rest = false; d.id = id; d.n = n; d.x = x; d.y = y; d.t = 0;
        d.vx = Px.Range(-35, 35); d.vy = Px.Range(85, 115); d.sr.enabled = true;
    }
    public void Clear() { foreach (var d in list) { d.on = false; d.sr.enabled = false; } }

    public void Tick()
    {
        var G = Game.I; var P = G.player; var M = G.map;
        foreach (var d in list)
        {
            if (!d.on) continue;
            d.t += Px.DT;
            if (!d.rest)
            {
                float oy = d.y;
                d.vy -= 400 * Px.DT; d.y += d.vy * Px.DT; d.x = Mathf.Clamp(d.x + d.vx * Px.DT, M.MinX, M.MaxX);
                var f = d.vy < 0 ? M.Land(d.x, oy, d.y) : null;
                if (f != null) { d.y = f.y; d.rest = true; }
                if (d.y < -20) { d.on = false; d.sr.enabled = false; continue; }
            }
            if (d.t > 60) { d.on = false; d.sr.enabled = false; continue; }
            // sprite
            string key = d.id == "meso" ? (d.n >= 40 ? "mesobag" : "meso" + ((int)(d.t * 10) % 4)) : Icon(d.id);
            d.sr.sprite = Atlas.Named("items", key);
            d.sr.enabled = d.t < 55 || (G.tick & 4) == 0;
            float bob = d.rest ? Mathf.Round(Mathf.Sin(d.t * 3) * 1 + 1) : 0;
            Px.Place(d.sr.transform, d.x, d.y + bob);
            // pickup
            if (d.t > 0.45f && !P.dead && Mathf.Abs(P.x - d.x) < 9 && d.y > P.y - 6 && d.y < P.y + 20)
            {
                d.on = false; d.sr.enabled = false;
                G.parts.Burst(d.x, d.y + 4, 6, Particles.SPARK, 30, 0.3f, 0, true);
                if (d.id == "meso") { Stats.D.meso += d.n; G.hud.Gain("MESO", d.n, "white"); Sfx.Play("meso", 0.7f); }
                else { Stats.AddItem(d.id, d.n); G.hud.Chat("+1 " + ItemName(d.id), "white", 2.2f); Sfx.Play("pickup"); }
            }
        }
    }
}

// Town NPC with idle animation and a quest marker; Up while standing next to it talks.
public class Npc
{
    public NpcDef d;
    public float x, y;
    readonly SpriteRenderer sr, mark;
    readonly Sheet sh;
    public bool talking;
    public Npc(NpcDef def, Transform root)
    {
        d = def; x = def.x; y = Px.GROUND;
        sh = Atlas.Sheets["npc_" + d.id];
        sr = Px.MakeSR("npc", root, 12); Px.Place(sr.transform, x, y);
        mark = Px.MakeSR("mark", root, 28);
    }
    public void Tick()
    {
        var G = Game.I;
        var a = sh.anims[talking && sh.anims.ContainsKey("talk") ? "talk" : "idle"];
        sr.sprite = sh.frames[a.frames[Mathf.FloorToInt(G.time * a.fps) % a.frames.Length]];
        string m = null;
        if (d.id == "elder" && Stats.Cur != null) m = Stats.D.qstate == 0 ? "bang" : Stats.D.qstate == 2 ? "q" : null;
        mark.enabled = m != null && Atlas.Sheets.ContainsKey("marks");
        if (mark.enabled) { mark.sprite = Atlas.Named("marks", m + ((G.tick >> 4) & 1)); Px.Place(mark.transform, x - 3, y + 30 + ((G.tick >> 4) & 1)); }
    }
}
