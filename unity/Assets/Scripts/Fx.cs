using System.Collections.Generic;
using UnityEngine;

// One-shot sheet animations (puffs, X slash, slash arcs, callouts), impact crosses and blink afterimages.
public class Fx
{
    class OneShot { public SpriteRenderer sr; public Sheet sheet; public int first, count; public float fps, t, loopFor; public bool on; }
    readonly List<OneShot> shots = new List<OneShot>();

    class Cross { public SpriteRenderer[] arms = new SpriteRenderer[5]; public float t; public bool big, on; public int x, y; }
    readonly Cross[] crosses = new Cross[10];

    class GhostImg { public SpriteRenderer sr; public float t, life; public bool on; }
    readonly GhostImg[] ghosts = new GhostImg[16];

    readonly SpriteRenderer callout;
    Sheet callSheet; float callT = -1;

    public Fx()
    {
        for (int i = 0; i < crosses.Length; i++)
        {
            var c = new Cross();
            for (int k = 0; k < 5; k++) { c.arms[k] = Px.MakeSR("cross", Game.I.fx, 60, Px.LAYER_FX); c.arms[k].sprite = Px.White; c.arms[k].enabled = false; }
            crosses[i] = c;
        }
        for (int i = 0; i < ghosts.Length; i++) { ghosts[i] = new GhostImg { sr = Px.MakeSR("ghost", Game.I.world, 15) }; ghosts[i].sr.enabled = false; }
        callout = Px.MakeSR("callout", Game.I.ui, 50, Px.LAYER_UI); callout.enabled = false;
    }

    public bool CalloutActive { get { return callT >= 0; } }

    // Play frames [first, first+count) of a sheet once at (x, y). fx = draw on the bright FX layer.
    public void Play(string sheet, float x, float y, bool fx = true, int first = 0, int count = -1, bool flip = false, int order = 55, float loopFor = 0)
    {
        Sheet s;
        if (!Atlas.Sheets.TryGetValue(sheet, out s)) return;
        OneShot o = null;
        foreach (var q in shots) if (!q.on && q.sr.gameObject.layer == (fx ? Px.LAYER_FX : 0)) { o = q; break; }
        if (o == null) { o = new OneShot { sr = Px.MakeSR(sheet, fx ? Game.I.fx : Game.I.world, order, fx ? Px.LAYER_FX : 0) }; shots.Add(o); }
        o.sheet = s; o.first = first; o.count = count < 0 ? s.count - first : count; o.fps = s.anims.ContainsKey("play") ? s.anims["play"].fps : s.Meta("fps", 24); o.t = 0; o.on = true; o.loopFor = loopFor;
        o.sr.enabled = true; o.sr.flipX = flip; o.sr.sortingOrder = order;
        o.sr.sprite = s.frames[first];
        Px.Place(o.sr.transform, x, y);
    }

    public void Impact(float x, float y, bool big)
    {
        foreach (var c in crosses) if (!c.on) { c.on = true; c.t = 0; c.big = big; c.x = Mathf.RoundToInt(x); c.y = Mathf.RoundToInt(y); return; }
    }

    // blink afterimage: a ghost-coloured copy of the given ninja frame
    public void Ghost(Sprite s, float x, float y, bool flip, float life = 0.26f)
    {
        foreach (var g in ghosts) if (!g.on)
            {
                g.on = true; g.t = 0; g.life = life; g.sr.sprite = s; g.sr.flipX = flip; g.sr.enabled = true;
                Px.Place(g.sr.transform, x, y); return;
            }
    }

    public void Callout(string key)
    {
        if (!Atlas.Sheets.ContainsKey("call_" + key)) return;
        callSheet = Atlas.Sheets["call_" + key]; callT = 0;
        callout.enabled = true;
        // centred, below the minimap / boss bar
        Px.Place(callout.transform, (Px.W - callSheet.w) / 2, Px.H - 44 - callSheet.h);
    }

    public void Tick()
    {
        foreach (var o in shots)
        {
            if (!o.on) continue;
            o.t += Px.DT;
            int f = Mathf.FloorToInt(o.t * o.fps);
            if (o.loopFor > 0) { if (o.t >= o.loopFor) { o.on = false; o.sr.enabled = false; continue; } f %= o.count; }
            else if (f >= o.count) { o.on = false; o.sr.enabled = false; continue; }
            o.sr.sprite = o.sheet.frames[o.first + f];
        }
        foreach (var c in crosses)
        {
            if (!c.on) continue;
            c.t += Px.DT;
            float dur = c.big ? 0.2f : 0.1f;
            if (c.t > dur) { c.on = false; foreach (var a in c.arms) a.enabled = false; continue; }
            int s = c.big ? (c.t < 0.08f ? 6 : 3) : (c.t < 0.05f ? 3 : 2);
            // horizontal + vertical bars through the centre, white
            Bar(c.arms[0], c.x - s, c.y, s * 2 + 1, 1, 35);
            Bar(c.arms[1], c.x, c.y - s, 1, s * 2 + 1, 35);
            // short yellow diagonals
            Bar(c.arms[2], c.x - 1, c.y - 1, 1, 1, 34); Bar(c.arms[3], c.x + 1, c.y + 1, 1, 1, 34); Bar(c.arms[4], c.x + 1, c.y - 1, 1, 1, 34);
        }
        foreach (var g in ghosts)
        {
            if (!g.on) continue;
            g.t += Px.DT;
            if (g.t > g.life) { g.on = false; g.sr.enabled = false; continue; }
            g.sr.enabled = g.t < g.life * 0.5f || (Game.I.tick & 1) == 0;
        }
        if (callT >= 0)
        {
            callT += Px.DT;
            int f = Mathf.FloorToInt(callT * 30);
            if (f >= callSheet.count) { callT = -1; callout.enabled = false; }
            else callout.sprite = callSheet.frames[f];
        }
    }

    static void Bar(SpriteRenderer sr, int x, int y, int w, int h, int c)
    {
        sr.enabled = true; sr.color = Px.Pal[c];
        sr.transform.localScale = new Vector3(w, h, 1);
        sr.transform.localPosition = new Vector3(x, y, 0);
    }
}
