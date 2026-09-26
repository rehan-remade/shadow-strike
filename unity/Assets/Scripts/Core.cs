using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using UnityEngine;

// Shared constants for the 192x108 pixel world. World units == pixels, origin bottom-left.
public static class Px
{
    public const int W = 320, H = 180;     // logical screen
    public const int GROUND = 32;          // base floor height of every map (feet stand on y = GROUND)
    public const float DT = 1f / 60f;
    public const int LAYER_FX = 8, LAYER_UI = 9;

    public static Color32[] Pal;
    static System.Random rng = new System.Random(1337);
    public static void Seed(int s) { rng = new System.Random(s); }
    public static float Rand() { return (float)rng.NextDouble(); }
    public static float Range(float a, float b) { return a + (b - a) * Rand(); }
    public static int Roll(float b) { return Mathf.RoundToInt(b * Range(0.86f, 1.14f)); }

    // palette index by name (matches the prototype engine's PAL_DEF order)
    public static readonly Dictionary<string, int> C = new Dictionary<string, int>();
    static readonly string[] Names = {
        "ink","sky1","sky2","sky3","sky4","sky5","sky6","sky7","sky8","sky9","moon","mtn","tree1","tree2","tree3","tree4",
        "grassD","grass","grassL","dirtD","dirt","wood","woodL","straw","strawL","burlapD","burlap","cloakD","cloak","cloakL","skin","skinD",
        "fireR","fireO","fireY","white","red","navy","steel","gold","goldD","redD",
        "ice0","ice1","ice2","ice3","ice4","ice5","vio0","vio1","vio2","vio3","vio4","vio5",
        "crim0","crim1","crim2","crim3","crim4","holy0","holy1",
        "dmgY","dmgO","dmgR","dmgK","critP","critR","critD","critK" };
    static Px() { for (int i = 0; i < Names.Length; i++) C[Names[i]] = i; }
    public static Color32 P(string name) { return Pal[C[name]]; }

    static Sprite white;
    public static Sprite White
    {
        get
        {
            if (white == null)
            {
                var t = new Texture2D(1, 1, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point };
                t.SetPixel(0, 0, Color.white); t.Apply();
                white = Sprite.Create(t, new Rect(0, 0, 1, 1), Vector2.zero, 1f, 0, SpriteMeshType.FullRect);
            }
            return white;
        }
    }

    public static SpriteRenderer MakeSR(string name, Transform parent, int order, int layer = 0)
    {
        var go = new GameObject(name);
        go.layer = layer;
        if (parent) go.transform.SetParent(parent, false);
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sortingOrder = order;
        return sr;
    }
    public static void Place(Transform t, float x, float y) { t.localPosition = new Vector3(Mathf.Round(x), Mathf.Round(y), 0); }
    public static Color32 Hex(string h)
    {
        uint v = uint.Parse(h.Substring(1), NumberStyles.HexNumber);
        return new Color32((byte)(v >> 16), (byte)(v >> 8), (byte)v, 255);
    }
}

// Minimal JSON reader (objects -> Dictionary, arrays -> List, numbers -> double)
public static class Json
{
    public static object Parse(string s) { int i = 0; return Val(s, ref i); }
    static void Ws(string s, ref int i) { while (i < s.Length && char.IsWhiteSpace(s[i])) i++; }
    static object Val(string s, ref int i)
    {
        Ws(s, ref i);
        char c = s[i];
        if (c == '{')
        {
            var d = new Dictionary<string, object>(); i++; Ws(s, ref i);
            if (s[i] == '}') { i++; return d; }
            while (true)
            {
                Ws(s, ref i); string k = Str(s, ref i); Ws(s, ref i); i++;
                d[k] = Val(s, ref i); Ws(s, ref i);
                if (s[i] == ',') { i++; continue; }
                i++; return d;
            }
        }
        if (c == '[')
        {
            var l = new List<object>(); i++; Ws(s, ref i);
            if (s[i] == ']') { i++; return l; }
            while (true)
            {
                l.Add(Val(s, ref i)); Ws(s, ref i);
                if (s[i] == ',') { i++; continue; }
                i++; return l;
            }
        }
        if (c == '"') return Str(s, ref i);
        if (string.CompareOrdinal(s, i, "true", 0, 4) == 0) { i += 4; return true; }
        if (string.CompareOrdinal(s, i, "false", 0, 5) == 0) { i += 5; return false; }
        if (string.CompareOrdinal(s, i, "null", 0, 4) == 0) { i += 4; return null; }
        int st = i;
        while (i < s.Length && "+-0123456789.eE".IndexOf(s[i]) >= 0) i++;
        return double.Parse(s.Substring(st, i - st), CultureInfo.InvariantCulture);
    }
    static string Str(string s, ref int i)
    {
        i++;
        var sb = new StringBuilder();
        while (s[i] != '"')
        {
            if (s[i] == '\\')
            {
                i++; char e = s[i];
                if (e == 'u') { sb.Append((char)Convert.ToInt32(s.Substring(i + 1, 4), 16)); i += 4; }
                else sb.Append(e == 'n' ? '\n' : e == 't' ? '\t' : e);
            }
            else sb.Append(s[i]);
            i++;
        }
        i++;
        return sb.ToString();
    }
    public static float F(object o) { return Convert.ToSingle(o, CultureInfo.InvariantCulture); }
    public static int I(object o) { return Convert.ToInt32(o, CultureInfo.InvariantCulture); }
}

public class AnimDef { public float fps; public bool loop; public int[] frames; }

public class Sheet
{
    public string name;
    public int w, h, cols, count;
    public Sprite[] frames;
    public Vector2Int[] hands;
    public Dictionary<string, AnimDef> anims = new Dictionary<string, AnimDef>();
    public Dictionary<string, object> meta;
    public float Meta(string k, float def = 0) { return meta.ContainsKey(k) ? Json.F(meta[k]) : def; }
}

// Loads the baked sprite sheets (Resources/Art/*.png + Resources/atlas.json) into Sprites.
public static class Atlas
{
    public static Dictionary<string, Sheet> Sheets = new Dictionary<string, Sheet>();
    public static Dictionary<string, object> Root;
    public static string Glyphs;

    public static void Load()
    {
        Root = (Dictionary<string, object>)Json.Parse(Resources.Load<TextAsset>("atlas").text);
        var pal = (List<object>)Root["pal"];
        Px.Pal = new Color32[pal.Count];
        for (int i = 0; i < pal.Count; i++) Px.Pal[i] = Px.Hex((string)pal[i]);
        Glyphs = (string)Root["glyphs"];
        foreach (var kv in (Dictionary<string, object>)Root["sheets"])
        {
            var m = (Dictionary<string, object>)kv.Value;
            var s = new Sheet { name = kv.Key, meta = m, w = Json.I(m["w"]), h = Json.I(m["h"]), cols = Json.I(m["cols"]), count = Json.I(m["count"]) };
            var tex = Resources.Load<Texture2D>("Art/" + kv.Key);
            // pivot = anchor pixel (px, py measured from the frame's top-left) -> its bottom-left corner
            float pvx = m.ContainsKey("px") ? Json.F(m["px"]) : 0, pvy = m.ContainsKey("py") ? s.h - 1 - Json.F(m["py"]) : 0;
            s.frames = new Sprite[s.count];
            for (int i = 0; i < s.count; i++)
            {
                int c = i % s.cols, r = i / s.cols;
                var rect = new Rect(c * s.w, tex.height - (r + 1) * s.h, s.w, s.h);
                s.frames[i] = Sprite.Create(tex, rect, new Vector2(pvx / s.w, pvy / s.h), 1f, 0, SpriteMeshType.FullRect);
            }
            if (m.ContainsKey("hands"))
            {
                var hl = (List<object>)m["hands"];
                s.hands = new Vector2Int[hl.Count];
                for (int i = 0; i < hl.Count; i++) { var p = (List<object>)hl[i]; s.hands[i] = new Vector2Int(Json.I(p[0]), Json.I(p[1])); }
            }
            if (m.ContainsKey("anims"))
                foreach (var a in (Dictionary<string, object>)m["anims"])
                {
                    var ad = (Dictionary<string, object>)a.Value;
                    var fl = (List<object>)ad["frames"];
                    var def = new AnimDef { fps = Json.F(ad["fps"]), loop = (bool)ad["loop"], frames = new int[fl.Count] };
                    for (int i = 0; i < fl.Count; i++) def.frames[i] = Json.I(fl[i]);
                    s.anims[a.Key] = def;
                }
            Sheets[kv.Key] = s;
        }
    }

    public static bool Has(string name) { return Resources.Load<Texture2D>("Art/" + name) != null; }
    static readonly Dictionary<string, Sprite> singles = new Dictionary<string, Sprite>();
    // frame of a sheet by its baked `names` key (tiles, items, marks, icons2)
    public static Sprite Named(string sheet, string key)
    {
        Sheet s;
        if (!Sheets.TryGetValue(sheet, out s) || !s.meta.ContainsKey("names")) return null;
        var n = (Dictionary<string, object>)s.meta["names"];
        return n.ContainsKey(key) ? s.frames[Json.I(n[key])] : null;
    }

    public static Sprite Single(string name, bool centre = false)
    {
        Sprite sp;
        if (!centre && singles.TryGetValue(name, out sp)) return sp;
        var tex = Resources.Load<Texture2D>("Art/" + name);
        sp = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), centre ? new Vector2(0.5f, 0.5f) : Vector2.zero, 1f, 0, SpriteMeshType.FullRect);
        if (!centre) singles[name] = sp;
        return sp;
    }
    public static Sprite Slice(string name, Rect r)
    {
        var tex = Resources.Load<Texture2D>("Art/" + name);
        return Sprite.Create(tex, r, Vector2.zero, 1f, 0, SpriteMeshType.FullRect);
    }
}

// Frame-based sprite animation driven by the fixed game tick.
public class Anim
{
    public Sheet sheet;
    public AnimDef def;
    public string name;
    public float t;
    public int Frame
    {
        get
        {
            int n = def.frames.Length, f = Mathf.FloorToInt(t * def.fps);
            return def.frames[def.loop ? f % n : Mathf.Min(f, n - 1)];
        }
    }
    public bool Done { get { return !def.loop && t * def.fps >= def.frames.Length; } }
    public Anim(Sheet s, string a) { sheet = s; Play(a, true); }
    // generic <-> Night Lord animation names, so every class plays through the same code
    static readonly Dictionary<string, string> Alias = new Dictionary<string, string>
    {
        { "throw", "attack" }, { "charge", "cast" }, { "seal", "cast" }, { "slash", "skill" }, { "flash", "jump2" },
        { "attack", "throw" }, { "cast", "charge" }, { "skill", "slash" }, { "jump2", "flash" }, { "hurt", "crouch" },
    };
    public void Play(string a, bool restart = false)
    {
        string alt;
        if (!sheet.anims.ContainsKey(a) && Alias.TryGetValue(a, out alt) && sheet.anims.ContainsKey(alt)) a = alt;
        if (!sheet.anims.ContainsKey(a)) a = "idle";
        if (!restart && a == name) return;
        name = a; def = sheet.anims[a]; t = 0;
    }
    public void Tick() { t += Px.DT; }
}
