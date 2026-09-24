using System.Collections.Generic;
using UnityEngine;

// ---------------------------------------------------------------------------------------------
// Map data (MapleStory-style: flat footholds you can jump up through, ropes/ladders, portals)
// ---------------------------------------------------------------------------------------------
public class Foothold { public int id; public float x0, x1, y; public bool solid; }
public class Climb { public float x, y0, y1; public bool ladder; }
public class PortalDef { public string id, to, toPortal; public float x, y; }
public class SpawnDef { public string mob; public int fh, count; }
public class NpcDef { public string id; public float x; }
public class PropDef { public string sprite; public float x, y; public int order; }
public class PlatDef { public float x, y; public int w; public char kind; }   // G ground, P grass, K plank

public class MapDef
{
    public string id, name, theme, bgm;
    public int w = 320, h = 180;
    public float waterY = -1;          // world y of the water surface (town lake), -1 = none
    public List<PlatDef> plats = new List<PlatDef>();
    public List<Climb> climbs = new List<Climb>();
    public List<PortalDef> portals = new List<PortalDef>();
    public List<SpawnDef> spawns = new List<SpawnDef>();
    public List<NpcDef> npcs = new List<NpcDef>();
    public List<PropDef> props = new List<PropDef>();
    public float spawnX = 60, dummyX = -1, camMinY = 0;
    public bool boss, fire;
    public float fireX;

    public MapDef G(float x, float y, int w) { plats.Add(new PlatDef { x = x, y = y, w = w, kind = 'G' }); return this; }
    public MapDef P(float x, float y, int w) { plats.Add(new PlatDef { x = x, y = y, w = w, kind = 'P' }); return this; }
    public MapDef K(float x, float y, int w) { plats.Add(new PlatDef { x = x, y = y, w = w, kind = 'K' }); return this; }
    public MapDef R(float x, float y0, float y1) { climbs.Add(new Climb { x = x, y0 = y0, y1 = y1 }); return this; }
    public MapDef L(float x, float y0, float y1) { climbs.Add(new Climb { x = x, y0 = y0, y1 = y1, ladder = true }); return this; }
    public MapDef Portal(string id, float x, float y, string to, string toPortal) { portals.Add(new PortalDef { id = id, x = x, y = y, to = to, toPortal = toPortal }); return this; }
    public MapDef Spawn(string mob, int platIndex, int count) { spawns.Add(new SpawnDef { mob = mob, fh = platIndex, count = count }); return this; }
    public MapDef Npc(string id, float x) { npcs.Add(new NpcDef { id = id, x = x }); return this; }
    public MapDef Prop(string s, float x, float y, int order = 3) { props.Add(new PropDef { sprite = s, x = x, y = y, order = order }); return this; }
}

public static class MapDefs
{
    public const float FLOOR = Px.GROUND;
    public static readonly Dictionary<string, MapDef> All = new Dictionary<string, MapDef>();

    static MapDefs()
    {
        // ---- Crownhollow: lakeside starting town
        var t = new MapDef { id = "town", name = "CROWNHOLLOW", theme = "town", bgm = "bgm_town", w = 480, h = 180, waterY = FLOOR - 8, spawnX = 110, dummyX = 360, fire = true, fireX = 248, camMinY = -18 };
        t.G(0, FLOOR, 60)
         .Portal("east", 462, FLOOR, "grove", "west")
         .Npc("elder", 262).Npc("merchant", 176)
         .Prop("prop_pine_fg", -12, FLOOR - 6, 40).Prop("prop_hut", 22, FLOOR, 2).Prop("prop_stall", 150, FLOOR, 2).Prop("prop_hut2", 292, FLOOR, 2)
         .Prop("prop_lamp", 120, FLOOR, 3).Prop("prop_lamp", 282, FLOOR, 3).Prop("prop_lamp", 420, FLOOR, 3)
         .Prop("prop_fence", 324, FLOOR, 2).Prop("prop_fence", 340, FLOOR, 2).Prop("prop_fence", 380, FLOOR, 2).Prop("prop_fence", 396, FLOOR, 2)
         .Prop("prop_sign", 440, FLOOR, 3).Prop("prop_bush", 96, FLOOR, 3).Prop("prop_rock", 214, FLOOR, 3).Prop("prop_bush", 410, FLOOR, 3)
         .Prop("prop_pine_fg", 458, FLOOR - 6, 40);
        All[t.id] = t;

        // ---- Mushroom Grove (Lv 1-5)
        var g = new MapDef { id = "grove", name = "MUSHROOM GROVE", theme = "grove", bgm = "bgm_field", w = 960, h = 240, spawnX = 40 };
        g.G(0, FLOOR, 120)                                  // 0 ground
         .P(64, 70, 12).P(200, 104, 10).P(330, 76, 14)      // 1 2 3
         .P(480, 120, 10).P(600, 84, 12).P(740, 118, 12)    // 4 5 6
         .P(120, 150, 10).P(400, 160, 12).P(680, 170, 10)   // 7 8 9
         .K(290, 132, 5).K(860, 80, 8)                      // 10 11
         .R(100, FLOOR, 70).R(150, 70, 150).R(240, FLOOR, 104).R(420, 76, 160).R(520, FLOOR, 120).L(650, FLOOR, 84).R(690, 84, 170).R(790, FLOOR, 118)
         .Spawn("shellback", 0, 7).Spawn("capling", 1, 2).Spawn("capling", 3, 3).Spawn("capling", 5, 3).Spawn("capling", 2, 2)
         .Spawn("capling", 6, 2).Spawn("capling", 7, 2).Spawn("capling", 8, 2).Spawn("capling", 9, 2).Spawn("shellback", 11, 2)
         .Portal("west", 18, FLOOR, "town", "east").Portal("east", 942, FLOOR, "deep", "west")
         .Prop("prop_shrooms", 180, FLOOR, 3).Prop("prop_shrooms", 470, FLOOR, 3).Prop("prop_shrooms", 355, 76, 3).Prop("prop_shrooms", 625, 84, 3)
         .Prop("prop_bush", 60, FLOOR, 3).Prop("prop_stump", 300, FLOOR, 3).Prop("prop_rock", 560, FLOOR, 3).Prop("prop_bush", 720, FLOOR, 3).Prop("prop_rock", 880, FLOOR, 3)
         .Prop("prop_shrooms", 410, 160, 3).Prop("prop_sign", 920, FLOOR, 3)
         .Prop("prop_pine_fg", 250, FLOOR - 6, 40).Prop("prop_pine_fg", 600, FLOOR - 6, 40);
        All[g.id] = g;

        // ---- Hollow Deep (Lv 5-9)
        var d = new MapDef { id = "deep", name = "HOLLOW DEEP", theme = "deep", bgm = "bgm_deep", w = 960, h = 300, spawnX = 40 };
        d.G(0, FLOOR, 120)                                                    // 0
         .P(90, 80, 12).P(260, 60, 10).P(380, 110, 12).P(540, 72, 12).P(700, 100, 14)   // 1-5
         .P(150, 150, 12).P(330, 190, 10).P(480, 160, 12).P(640, 200, 10).P(800, 170, 12) // 6-10
         .K(360, 240, 10).K(700, 250, 8)                                      // 11 12
         .L(130, FLOOR, 80).R(170, 80, 150).R(300, FLOOR, 60).R(400, 110, 190).R(390, 190, 240).R(560, 72, 160)
         .L(720, FLOOR, 100).R(705, 100, 200).R(712, 200, 250).R(805, 100, 170)
         .Spawn("stumpy", 0, 5).Spawn("stumpy", 1, 2).Spawn("stumpy", 3, 2).Spawn("stumpy", 5, 3)
         .Spawn("capling", 2, 2).Spawn("capling", 4, 2)
         .Spawn("wisp", 6, 2).Spawn("wisp", 8, 2).Spawn("wisp", 9, 1).Spawn("wisp", 10, 2).Spawn("wisp", 11, 1).Spawn("wisp", 7, 1)
         .Portal("west", 18, FLOOR, "grove", "east").Portal("east", 942, FLOOR, "glade", "west")
         .Prop("prop_crystal", 230, FLOOR, 3).Prop("prop_crystal", 610, FLOOR, 3).Prop("prop_crystal", 420, 110, 3).Prop("prop_crystal", 860, 170, 3)
         .Prop("prop_stump", 80, FLOOR, 3).Prop("prop_rock", 480, FLOOR, 3).Prop("prop_shrooms", 760, FLOOR, 3).Prop("prop_bush", 900, FLOOR, 3)
         .Prop("prop_pine_fg", 340, FLOOR - 6, 40).Prop("prop_pine_fg", 820, FLOOR - 6, 40);
        All[d.id] = d;

        // ---- Royal Glade (boss arena)
        var b = new MapDef { id = "glade", name = "ROYAL GLADE", theme = "glade", bgm = "bgm_boss", w = 320, h = 180, spawnX = 40, boss = true };
        b.G(0, FLOOR, 40).Portal("west", 14, FLOOR, "deep", "east")
         .Prop("prop_pine_fg", -14, FLOOR - 6, 40).Prop("prop_pine_fg", 296, FLOOR - 6, 40).Prop("prop_shrooms", 60, FLOOR, 3).Prop("prop_shrooms", 250, FLOOR, 3);
        All[b.id] = b;
    }
}

// ---------------------------------------------------------------------------------------------
// Runtime map: builds tiles / parallax / props, answers collision queries
// ---------------------------------------------------------------------------------------------
public class MapRuntime
{
    public MapDef def;
    public Transform root;
    public readonly List<Foothold> fhs = new List<Foothold>();
    public readonly List<Mob> mobs = new List<Mob>();
    public readonly List<Npc> npcs = new List<Npc>();
    public readonly List<PortalObj> portals = new List<PortalObj>();
    public Dummy dummy;

    class Layer { public SpriteRenderer[] sr; public float f; public int w; }
    readonly List<Layer> layers = new List<Layer>();
    readonly List<(SpriteRenderer sr, Sheet sh, float fps)> animProps = new List<(SpriteRenderer, Sheet, float)>();

    public MapRuntime(MapDef d)
    {
        def = d;
        var G = Game.I;
        root = new GameObject("Map_" + d.id).transform;
        root.SetParent(G.world, false);

        // parallax
        AddLayer("sky_" + d.theme, 0, -100, false);
        AddLayer("mtn_" + d.theme, 0.1f, -99, true);
        AddLayer("far_" + d.theme, 0.25f, -98, true);
        AddLayer("mid_" + d.theme, 0.45f, -97, true);

        // platforms -> footholds + tiles
        for (int i = 0; i < d.plats.Count; i++)
        {
            var p = d.plats[i];
            fhs.Add(new Foothold { id = i, x0 = p.x, x1 = p.x + p.w * 8, y = p.y, solid = p.kind == 'G' });
            BuildPlat(p);
        }
        foreach (var c in d.climbs) BuildClimb(c);
        foreach (var pr in d.props) BuildProp(pr);
        if (d.fire)
        {
            var fs = Atlas.Sheets["fire"];
            var sr = Px.MakeSR("fire", root, 6); Px.Place(sr.transform, d.fireX - 24, Px.GROUND - 2);
            animProps.Add((sr, fs, 12));
            var bs = Atlas.Sheets["banner"];
            var br = Px.MakeSR("banner", root, 5); Px.Place(br.transform, d.fireX - 18, Px.GROUND - 1);
            animProps.Add((br, bs, 5));
        }
        foreach (var pd in d.portals) portals.Add(new PortalObj(pd, root));
        foreach (var n in d.npcs) npcs.Add(new Npc(n, root));
        foreach (var s in d.spawns)
        {
            var fh = fhs[s.fh];
            for (int k = 0; k < s.count; k++) mobs.Add(new Mob(MobDefs.Get(s.mob), fh, root));
        }
        if (d.dummyX > 0) dummy = new Dummy(d.dummyX, Px.GROUND, root);
    }

    void AddLayer(string name, float f, int order, bool tile)
    {
        if (!Atlas.Has(name)) return;
        var spr = Atlas.Single(name);
        int w = (int)spr.rect.width;
        var L = new Layer { f = f, w = w, sr = new SpriteRenderer[tile ? 2 : 1] };
        for (int i = 0; i < L.sr.Length; i++) { L.sr[i] = Px.MakeSR(name, root, order); L.sr[i].sprite = spr; }
        layers.Add(L);
    }

    Sprite Tile(string n) { return Atlas.Named("tiles", n); }
    void Put(string tile, float x, float y, int order)
    {
        var s = Tile(tile); if (s == null) return;
        var sr = Px.MakeSR(tile, root, order); sr.sprite = s; Px.Place(sr.transform, x, y);
    }

    void BuildPlat(PlatDef p)
    {
        for (int i = 0; i < p.w; i++)
        {
            float x = p.x + i * 8;
            string e = i == 0 ? "_l" : i == p.w - 1 ? "_r" : ((int)(x / 8) % 3 == 0 ? "_m2" : "_m");
            string e2 = e == "_m2" ? "_m" : e;
            if (p.kind == 'K') { Put("plank" + (e == "_m2" ? "_m" : e), x, p.y - 8, 8); continue; }
            Put("grass" + e, x, p.y - 8, 8);
            if (p.kind == 'P') { Put("under" + e2, x, p.y - 16, 8); continue; }
            // ground: earth down to the water line or the bottom of the map
            float bottom = def.waterY > 0 ? def.waterY : -8;
            int k = 0;
            for (float y = p.y - 16; y >= bottom - 7; y -= 8, k++) Put("dirt" + ((((int)(x / 8) + k) % 4 == 0) && e == "_m" ? "_m2" : e2), x, y, 7);
        }
    }

    void BuildClimb(Climb c)
    {
        string n = c.ladder ? "ladder" : "rope";
        for (float y = c.y0; y < c.y1 - 8; y += 8) Put(n, c.x - 4, y, 9);
        Put(n + "_top", c.x - 4, c.y1 - 8, 9);
    }

    void BuildProp(PropDef pd)
    {
        if (Atlas.Sheets.ContainsKey(pd.sprite))
        {
            var sh = Atlas.Sheets[pd.sprite];
            var sr = Px.MakeSR(pd.sprite, root, pd.order); sr.sprite = sh.frames[0]; Px.Place(sr.transform, pd.x, pd.y);
            if (sh.count > 1) animProps.Add((sr, sh, sh.Meta("fps", 4)));
            return;
        }
        if (!Atlas.Has(pd.sprite)) return;
        var s2 = Px.MakeSR(pd.sprite, root, pd.order); s2.sprite = Atlas.Single(pd.sprite); Px.Place(s2.transform, pd.x, pd.y);
    }

    // ---------------------------------------------------------------- collision queries
    // Foothold crossed while falling from yOld to yNew at x (one-way platforms). ignore = platform being dropped through.
    public Foothold Land(float x, float yOld, float yNew, int ignore = -1)
    {
        Foothold best = null;
        foreach (var f in fhs)
        {
            if (f.id == ignore || x < f.x0 || x > f.x1) continue;
            if (yOld >= f.y - 0.01f && yNew <= f.y && (best == null || f.y > best.y)) best = f;
        }
        return best;
    }
    public Foothold At(float x, float y)
    {
        foreach (var f in fhs) if (x >= f.x0 && x <= f.x1 && Mathf.Abs(f.y - y) < 0.05f) return f;
        return null;
    }
    public Climb ClimbAt(float x, float y, bool fromTop)
    {
        foreach (var c in def.climbs)
        {
            if (Mathf.Abs(x - c.x) > 5) continue;
            if (fromTop) { if (Mathf.Abs(y - c.y1) < 2) return c; }
            else if (y >= c.y0 - 1 && y < c.y1 - 2) return c;
        }
        return null;
    }
    public float MinX { get { return 8; } }
    public float MaxX { get { return def.w - 8; } }

    // ---------------------------------------------------------------- per-frame
    public void Tick()
    {
        foreach (var m in mobs) m.Tick();
        foreach (var n in npcs) n.Tick();
        foreach (var p in portals) p.Tick();
        if (dummy != null) dummy.Tick();
        float t = Game.I.time;
        foreach (var a in animProps) a.sr.sprite = a.sh.frames[Mathf.FloorToInt(t * a.fps) % a.sh.count];
    }

    // parallax follows the camera (called after the camera moves)
    public void Parallax(int camX, int camY)
    {
        foreach (var L in layers)
        {
            int yOff = Mathf.RoundToInt(camY * (1 - L.f * 0.6f));
            if (L.sr.Length == 1) { Px.Place(L.sr[0].transform, camX, camY); continue; }
            int s = Mathf.RoundToInt(camX * L.f) % L.w;
            for (int i = 0; i < L.sr.Length; i++) Px.Place(L.sr[i].transform, camX - s + i * L.w, yOff);
        }
    }

    public void Destroy() { Object.Destroy(root.gameObject); }
}

// Portal: swirling sprite; Up while standing in it warps.
public class PortalObj
{
    public PortalDef def;
    readonly SpriteRenderer sr;
    readonly Sheet sh;
    public PortalObj(PortalDef d, Transform root)
    {
        def = d;
        sh = Atlas.Sheets.ContainsKey("portal") ? Atlas.Sheets["portal"] : null;
        sr = Px.MakeSR("portal", root, 11);
        Px.Place(sr.transform, d.x, d.y);
    }
    public void Tick()
    {
        if (sh != null) sr.sprite = sh.frames[Mathf.FloorToInt(Game.I.time * 12) % sh.count];
        if (Game.I.tick % 9 == 0) Game.I.parts.Spawn(def.x + Px.Range(-6, 6), def.y + Px.Range(0, 20), 0, Px.Range(8, 20), 0.7f, Particles.VSPARK, 0, false, true);
    }
}
