using System.Collections.Generic;
using UnityEngine;

// Pixel text built from baked glyph sprites (3x5 font with outline, one sheet per colour style).
public class PixelText
{
    readonly List<SpriteRenderer> glyphs = new List<SpriteRenderer>();
    readonly Transform root;
    readonly int order;
    public PixelText(Transform parent, int order)
    {
        root = new GameObject("text") { layer = parent.gameObject.layer }.transform;
        root.SetParent(parent, false);
        this.order = order;
    }
    public static int Width(string s, int scale = 1) { return s.Length == 0 ? 0 : (s.Length * 4 - 1) * scale; }

    // (x, topY): x of the first glyph's fill column, topY = top edge of the fill rows
    public void Set(string s, string style, float x, float topY, bool visible = true)
    {
        var sh = Atlas.Sheets["font_" + style];
        int adv = (int)sh.Meta("adv", 4);
        while (glyphs.Count < s.Length) glyphs.Add(Px.MakeSR("g", root, order, root.gameObject.layer));
        for (int i = 0; i < glyphs.Count; i++)
        {
            var g = glyphs[i];
            if (i >= s.Length || !visible) { g.enabled = false; continue; }
            int gi = Atlas.Glyphs.IndexOf(s[i]);
            if (gi < 0 || s[i] == ' ') { g.enabled = false; continue; }
            g.enabled = true; g.sprite = sh.frames[gi];
            Px.Place(g.transform, x + i * adv - 1, topY + 1 - sh.h);
        }
    }
    public void Hide() { foreach (var g in glyphs) g.enabled = false; }
}

// MapleStory-style stacked damage numbers, anchored in the world above each target and drawn on the UI layer.
public class Numbers
{
    class Num { public PixelText txt; public SpriteRenderer star; public int val, slot; public bool crit, big, on; public float t, wx, wTop; }
    readonly Num[] nums = new Num[40];
    int head;
    const int LINE = 6;

    public Numbers()
    {
        var cs = Atlas.Single("critstar");
        for (int i = 0; i < nums.Length; i++)
        {
            nums[i] = new Num { txt = new PixelText(Game.I.ui, 40 + i % 16), star = Px.MakeSR("critstar", Game.I.ui, 40 + i % 16, Px.LAYER_UI) };
            nums[i].star.sprite = cs; nums[i].star.enabled = false;
        }
    }

    // wx: centre x in the world; wTop: world y of the target's head
    public void Show(int val, bool crit, bool big, DamageStack st, float wx, float wTop, int slots = 4)
    {
        var G = Game.I;
        if (G.time - st.last > 0.75f) { st.slot = 0; st.jit = Mathf.Round(Px.Range(-3, 3)); }
        st.last = G.time;
        var n = nums[head]; head = (head + 1) % nums.Length;
        n.on = true; n.val = val; n.crit = crit; n.big = big; n.t = 0; n.wx = wx + st.jit; n.wTop = wTop;
        if (big) { n.slot = 0; st.slot = 2; } else { n.slot = st.slot % slots; st.slot++; }
        // a new line replaces older lines of the same target in the same slot so stacks stay readable
        foreach (var o in nums) if (o != n && o.on && Mathf.Abs(o.wTop - wTop) < 0.5f && Mathf.Abs(o.wx - n.wx) < 8 && (big || o.slot == n.slot || (o.big && o.slot <= n.slot + 1))) Kill(o);
    }
    void Kill(Num o) { o.on = false; o.txt.Hide(); o.star.enabled = false; }

    public void Tick()
    {
        var G = Game.I;
        foreach (var n in nums)
        {
            if (!n.on) continue;
            n.t += Px.DT;
            if (n.t > 1.25f) { Kill(n); continue; }
            bool vis = !(n.t > 0.95f && ((G.tick >> 1) & 1) == 1);
            int s = n.big ? 2 : 1;
            string str = n.val.ToString();
            int w = PixelText.Width(str, s);
            float pop = n.t < 0.07f ? (1 - n.t / 0.07f) * 4 : 0;
            float top = Mathf.Round(n.wTop + 8 + 5 * s + n.slot * LINE + (s - 1) * 6 - pop + n.t * 3) - G.camY;
            float x = Mathf.Clamp(Mathf.Round(n.wx - w / 2f) - G.camX, 7 * s, Px.W - w - 2);
            n.txt.Set(str, n.crit ? (n.big ? "critBig" : "crit") : "dmg", x, top, vis);
            n.star.enabled = n.crit && vis;
            if (n.crit) Px.Place(n.star.transform, x - 4 - (s - 1) * 2 - 2, top - 2 * s + 2 - 5);
        }
    }
}

// Small rising text pops anchored in the world (player damage in violet, EXP / meso messages).
public class Pops
{
    class Pop { public PixelText txt; public string s, style; public float wx, wy, t, life; public bool on; }
    readonly Pop[] pops = new Pop[10];
    public Pops() { for (int i = 0; i < pops.Length; i++) pops[i] = new Pop { txt = new PixelText(Game.I.ui, 70 + i) }; }
    public void Show(string s, string style, float wcx, float wTop, float life = 0.9f)
    {
        foreach (var p in pops) if (!p.on) { p.on = true; p.s = s; p.style = style; p.wx = Mathf.Round(wcx - PixelText.Width(s) / 2f); p.wy = wTop; p.t = 0; p.life = life; return; }
    }
    public void Tick()
    {
        var G = Game.I;
        foreach (var p in pops)
        {
            if (!p.on) continue;
            p.t += Px.DT;
            if (p.t > p.life) { p.on = false; p.txt.Hide(); continue; }
            bool vis = p.t < p.life * 0.75f || ((G.tick >> 1) & 1) == 0;
            p.txt.Set(p.s, p.style, p.wx - G.camX, Mathf.Round(p.wy + Mathf.Min(p.t, 0.3f) * 20) - G.camY, vis);
        }
    }
}
