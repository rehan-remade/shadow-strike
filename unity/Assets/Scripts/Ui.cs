using System;
using System.Collections.Generic;
using UnityEngine;

// Rect-based panel (fill + 1px border) on the UI layer.
public class Panel
{
    readonly SpriteRenderer fill, t, b, l, r;
    public Panel(Transform ui, int order, string fillCol, string borderCol)
    {
        fill = Mk(ui, order, fillCol); t = Mk(ui, order + 1, borderCol); b = Mk(ui, order + 1, borderCol); l = Mk(ui, order + 1, borderCol); r = Mk(ui, order + 1, borderCol);
    }
    static SpriteRenderer Mk(Transform ui, int o, string c) { var s = Px.MakeSR("panel", ui, o, Px.LAYER_UI); s.sprite = Px.White; s.color = Px.P(c); s.enabled = false; return s; }
    public void Set(float x, float y, float w, float h, bool on = true)
    {
        Hud.Box(fill, x, y, w, h, on); Hud.Box(t, x, y + h - 1, w, 1, on); Hud.Box(b, x, y, w, 1, on); Hud.Box(l, x, y, 1, h, on); Hud.Box(r, x + w - 1, y, 1, h, on);
    }
    public void Hide() { fill.enabled = t.enabled = b.enabled = l.enabled = r.enabled = false; }
    public void Border(string c) { t.color = b.color = l.color = r.color = Px.P(c); }
}

// MapleStory HUD: bottom status bar, minimap, chat log, quest tracker, boss HP bar, toasts.
public class Hud
{
    public Sprite UpKey;
    readonly Transform ui;
    readonly Panel bar, mini, bossPanel;
    readonly SpriteRenderer expBg, expFill, hpFrame, hpFill, hpShine, mpFrame, mpFill, mpShine;
    readonly PixelText lvT, lvN, expT, hpT, mpT, hpL, mpL, mesoT, mapName, questH, questT, questP, toastTxt, hintT;
    readonly SpriteRenderer[] potBox = new SpriteRenderer[2], potIcon = new SpriteRenderer[2];
    readonly PixelText[] potN = new PixelText[2], potK = new PixelText[2];
    class Slot { public SpriteRenderer border, icon, cool, lockIcon; public PixelText key, lvl; public bool wasCooling; public float flash; }
    readonly Slot[] slots = new Slot[5];
    readonly Sprite[] coolSprites = new Sprite[15];
    readonly SpriteRenderer mesoIcon, miniMap, miniDot, partnerBar;
    readonly List<SpriteRenderer> miniMarks = new List<SpriteRenderer>();
    // chat
    readonly PixelText[] chatT = new PixelText[4];
    class ChatLine { public string s, style, kind; public float t, life; public int val; }
    readonly List<ChatLine> chat = new List<ChatLine>();
    string toast, toastStyle; float toastTime;
    // boss bar
    readonly SpriteRenderer bIcon, bFrame, bBg, bUnder, bLag, bFill, bShine;
    readonly PixelText bName, bLayers, bStage;
    static readonly Color32[] LAYER = { Px.Hex("#e8304a"), Px.Hex("#ff8c1a"), Px.Hex("#ffd23a"), Px.Hex("#4cc85e"), Px.Hex("#3a8cff") };
    static readonly Color32[] LAYER_HI = { Px.Hex("#ff8a9a"), Px.Hex("#ffc070"), Px.Hex("#fff0a0"), Px.Hex("#a8f0b4"), Px.Hex("#a8ccff") };
    static readonly string[] Keys = { "J", "K", "L", "U", "SP" };
    const int SLX = 176;

    public static SpriteRenderer MkRect(Transform ui, int order, string col) { var r = Px.MakeSR("rect", ui, order, Px.LAYER_UI); r.sprite = Px.White; r.color = Px.P(col); r.enabled = false; return r; }
    public static void Box(SpriteRenderer r, float x, float y, float w, float h, bool on = true)
    {
        r.enabled = on && w >= 1 && h >= 1;
        if (!r.enabled) return;
        r.transform.localScale = new Vector3(Mathf.Round(w), Mathf.Round(h), 1); Px.Place(r.transform, x, y);
    }

    public Hud()
    {
        ui = Game.I.ui;
        UpKey = MakeKey();
        bar = new Panel(ui, 50, "vio5", "vio3");
        expBg = MkRect(ui, 52, "ink"); expFill = MkRect(ui, 53, "gold");
        hpFrame = MkRect(ui, 52, "ink"); hpFill = MkRect(ui, 53, "crim2"); hpShine = MkRect(ui, 54, "crim1");
        mpFrame = MkRect(ui, 52, "ink"); mpFill = MkRect(ui, 53, "ice3"); mpShine = MkRect(ui, 54, "ice2");
        lvT = new PixelText(ui, 56); lvN = new PixelText(ui, 56); expT = new PixelText(ui, 56);
        hpT = new PixelText(ui, 57); mpT = new PixelText(ui, 57); hpL = new PixelText(ui, 56); mpL = new PixelText(ui, 56);
        mesoT = new PixelText(ui, 56);
        mesoIcon = Px.MakeSR("meso", ui, 56, Px.LAYER_UI);
        for (int i = 0; i < 2; i++)
        {
            potBox[i] = MkRect(ui, 52, "ink"); potIcon[i] = Px.MakeSR("pot", ui, 54, Px.LAYER_UI);
            potN[i] = new PixelText(ui, 56); potK[i] = new PixelText(ui, 56);
        }
        var t = new Texture2D(14, 14, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point };
        var ink = Px.P("ink");
        for (int yy = 0; yy < 14; yy++) for (int xx = 0; xx < 14; xx++) t.SetPixel(xx, yy, ((xx + yy) & 1) == 0 ? (Color)ink : new Color(0, 0, 0, 0));
        t.Apply();
        for (int h = 0; h <= 14; h++) coolSprites[h] = Sprite.Create(t, new Rect(0, 0, 14, Mathf.Max(1, h)), Vector2.zero, 1f, 0, SpriteMeshType.FullRect);
        var icons = Atlas.Sheets["icons"];
        for (int i = 0; i < 5; i++)
        {
            var s = new Slot();
            int x = SLX + i * 18;
            s.border = MkRect(ui, 52, "vio3"); Box(s.border, x, 2, 16, 16);
            s.icon = Px.MakeSR("icon", ui, 53, Px.LAYER_UI);
            Px.Place(s.icon.transform, x + 1, 3);
            s.cool = Px.MakeSR("cool", ui, 54, Px.LAYER_UI);
            s.lockIcon = Px.MakeSR("lock", ui, 55, Px.LAYER_UI); s.lockIcon.sprite = Atlas.Named("icons2", "lock"); Px.Place(s.lockIcon.transform, x + 1, 3);
            s.key = new PixelText(ui, 57); s.lvl = new PixelText(ui, 57);
            slots[i] = s;
        }
        partnerBar = MkRect(ui, 55, "vio1");
        // minimap
        mini = new Panel(ui, 50, "vio5", "vio3");
        miniMap = Px.MakeSR("minimap", ui, 51, Px.LAYER_UI);
        miniDot = MkRect(ui, 53, "crim1");
        mapName = new PixelText(ui, 52);
        questH = new PixelText(ui, 52); questT = new PixelText(ui, 52); questP = new PixelText(ui, 52);
        for (int i = 0; i < chatT.Length; i++) chatT[i] = new PixelText(ui, 58);
        toastTxt = new PixelText(ui, 80); hintT = new PixelText(ui, 58);
        // boss
        bossPanel = new Panel(ui, 50, "vio5", "vio3");
        bIcon = Px.MakeSR("bicon", ui, 52, Px.LAYER_UI); bIcon.sprite = Atlas.Single("boss_icon");
        bFrame = MkRect(ui, 52, "ink"); bBg = MkRect(ui, 53, "crim4"); bUnder = MkRect(ui, 54, "ink"); bLag = MkRect(ui, 55, "critP"); bFill = MkRect(ui, 56, "ink"); bShine = MkRect(ui, 57, "ink");
        bName = new PixelText(ui, 58); bLayers = new PixelText(ui, 58); bStage = new PixelText(ui, 58);
    }

    static Sprite MakeKey()
    {
        // 11x9 "UP" key cap
        var t = new Texture2D(11, 9, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point };
        Color edge = Px.P("steel"), face = Px.P("vio4"), arrow = Px.P("white"), clear = new Color(0, 0, 0, 0);
        for (int y = 0; y < 9; y++) for (int x = 0; x < 11; x++)
        {
            bool border = x == 0 || x == 10 || y == 0 || y == 8, corner = (x == 0 || x == 10) && (y == 0 || y == 8);
            t.SetPixel(x, y, corner ? clear : border ? edge : y == 1 ? Px.P("vio5") : face);
        }
        int[,] ar = { { 5, 7 }, { 4, 6 }, { 5, 6 }, { 6, 6 }, { 3, 5 }, { 5, 5 }, { 7, 5 }, { 5, 4 }, { 5, 3 }, { 5, 2 } };
        for (int i = 0; i < ar.GetLength(0); i++) t.SetPixel(ar[i, 0], ar[i, 1], arrow);
        t.Apply();
        return Sprite.Create(t, new Rect(0, 0, 11, 9), Vector2.zero, 1f, 0, SpriteMeshType.FullRect);
    }

    // short-lived log lines (bottom-left); pickups merge into one counter line so the log stays small
    public void Chat(string s, string style = "white", float life = 4f)
    {
        chat.Insert(0, new ChatLine { s = s, style = style, t = Game.I.time, life = life });
        if (chat.Count > chatT.Length) chat.RemoveAt(chat.Count - 1);
    }
    public void Gain(string kind, int n, string style)
    {
        var G = Game.I;
        foreach (var c in chat)
            if (c.kind == kind && G.time - c.t < 1.5f) { c.val += n; c.s = "+" + c.val + " " + kind; c.t = G.time; return; }
        Chat("+" + n + " " + kind, style, 2.2f);
        chat[0].kind = kind; chat[0].val = n;
    }
    public void Toast(string s, string style = "goldBig") { toast = s; toastStyle = style; toastTime = 2.4f; }

    // Minimap texture of footholds / climbs / portals for the current map
    public void BuildMinimap(MapRuntime m)
    {
        int mw = 80, mh = 30;
        var tex = new Texture2D(mw, mh, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point };
        var clear = new Color(0, 0, 0, 0);
        for (int y = 0; y < mh; y++) for (int x = 0; x < mw; x++) tex.SetPixel(x, y, clear);
        float sx = (mw - 2) / (float)m.def.w, sy = (mh - 3) / (float)m.def.h;
        foreach (var c in m.def.climbs) for (float yy = c.y0; yy <= c.y1; yy += 2) tex.SetPixel(1 + Mathf.RoundToInt(c.x * sx), 1 + Mathf.RoundToInt(yy * sy), Px.P("strawL"));
        foreach (var f in m.fhs) for (int x = Mathf.RoundToInt(f.x0 * sx); x <= Mathf.RoundToInt(f.x1 * sx); x++) tex.SetPixel(1 + x, 1 + Mathf.RoundToInt(f.y * sy), f.solid ? Px.P("grassL") : Px.P("grass"));
        foreach (var p in m.def.portals) { int px = 1 + Mathf.RoundToInt(p.x * sx), py = 2 + Mathf.RoundToInt(p.y * sy); tex.SetPixel(px, py, Px.P("ice1")); tex.SetPixel(px, py + 1, Px.P("ice2")); }
        foreach (var n in m.def.npcs) { int px = 1 + Mathf.RoundToInt(n.x * sx), py = 2 + Mathf.RoundToInt(Px.GROUND * sy); tex.SetPixel(px, py, Px.P("gold")); tex.SetPixel(px, py + 1, Px.P("gold")); }
        tex.Apply();
        miniMap.sprite = Sprite.Create(tex, new Rect(0, 0, mw, mh), Vector2.zero, 1f, 0, SpriteMeshType.FullRect);
        miniScaleX = sx; miniScaleY = sy;
    }
    float miniScaleX, miniScaleY;

    static string Fmt(int v) { return v.ToString(); }

    public void Tick()
    {
        var G = Game.I; var P = G.player; var D = Stats.D;
        bool play = G.state == Game.State.Play;
        // ---------------- bottom status bar
        bar.Set(0, 0, Px.W, 20, play);
        Box(expBg, 0, 0, Px.W, 2, play);
        float ef = Mathf.Clamp01(D.exp / (float)Stats.ExpNeed(D.level));
        Box(expFill, 0, 0, Px.W * ef, 2, play);
        // "LV" over the EXP %, the big level number beside them (stacking them made the outlines collide)
        lvT.Set("LV", "white", 4, 17, play);
        expT.Set((ef * 100).ToString("0.0") + "%", "white", 4, 8, play);
        lvN.Set(D.level.ToString(), "goldBig", 29, 15, play);
        float hf = Mathf.Clamp01(D.hp / (float)Stats.MaxHp), mf = Mathf.Clamp01(D.mp / (float)Stats.MaxMp);
        hpL.Set("HP", "white", 47, 17, play); mpL.Set("MP", "white", 47, 9, play);
        Box(hpFrame, 57, 11, 77, 7, play); Box(hpFill, 58, 12, 75 * hf, 5, play); Box(hpShine, 58, 16, 75 * hf, 1, play);
        Box(mpFrame, 57, 3, 77, 7, play); Box(mpFill, 58, 4, 75 * mf, 5, play); Box(mpShine, 58, 8, 75 * mf, 1, play);
        hpFill.color = Px.P(P.hurtFlash > 0 ? "white" : hf < 0.25f && ((G.tick >> 3) & 1) == 1 ? "crim1" : "crim2");
        string hs = D.hp + "/" + Stats.MaxHp, ms = D.mp + "/" + Stats.MaxMp;
        hpT.Set(hs, "white", 95 - PixelText.Width(hs) / 2, 17, play); mpT.Set(ms, "white", 95 - PixelText.Width(ms) / 2, 9, play);
        string[] potKeys = { "potion_red", "potion_blue" }; int[] potCount = { D.red, D.blue };
        for (int i = 0; i < 2; i++)
        {
            int x = 138 + i * 18;
            Box(potBox[i], x, 2, 16, 16, play);
            potIcon[i].enabled = play; potIcon[i].sprite = Atlas.Named("items", potKeys[i]); Px.Place(potIcon[i].transform, x + 8, 5);
            potN[i].Set(potCount[i].ToString(), "white", x + 16 - PixelText.Width(potCount[i].ToString()), 7, play);
            potK[i].Set((i + 1).ToString(), "gold", x + 2, 17, play);
        }
        var CC = Classes.Cur.cd;
        float[] cd = { P.cdThrow / CC[0], P.cdAv / CC[1], P.cdAs / CC[2], P.cdSp / CC[3], 0 };
        int[] map = { 0, 1, 2, 3, 4 };
        for (int i = 0; i < 5; i++)
        {
            var s = slots[i]; int x = SLX + i * 18; int sk = map[i];
            bool unlocked = Stats.Unlocked(sk);
            float f = Mathf.Clamp01(cd[i]);
            bool cooling = f > 0.001f;
            if (s.wasCooling && !cooling && i > 0 && i < 4) { s.flash = 0.2f; }
            s.wasCooling = cooling;
            if (s.flash > 0) s.flash -= Px.DT;
            s.border.enabled = s.icon.enabled = play;
            s.icon.sprite = Classes.Cur.Icon(i);
            s.border.color = Px.P(s.flash > 0 ? "white" : i == 3 && P.CloneOn && ((G.tick >> 3) & 1) == 1 ? "vio1" : !unlocked ? "ink" : cooling ? "vio4" : "vio3");
            int h = unlocked ? Mathf.CeilToInt(14 * f) : 14;
            s.cool.enabled = play && h > 0;
            if (s.cool.enabled) { s.cool.sprite = coolSprites[h]; Px.Place(s.cool.transform, x + 1, 3 + 14 - h); }
            s.lockIcon.enabled = play && !unlocked && s.lockIcon.sprite != null;
            s.key.Set(Keys[i], "white", x + 16 - PixelText.Width(Keys[i]), 7, play && unlocked);
            string lv = "LV" + Stats.SkillLevel[sk];
            s.lvl.Set(lv, "white", x + 8 - PixelText.Width(lv) / 2, 7, play && !unlocked);
        }
        Box(partnerBar, SLX + 3 * 18 + 1, 0, Mathf.Max(1, Mathf.Round(14 * P.partnerT / Player.SP_DUR)), 1, play && P.CloneOn);
        mesoIcon.enabled = play; mesoIcon.sprite = Atlas.Named("items", "meso0"); Px.Place(mesoIcon.transform, 274, 8);
        mesoT.Set(D.meso.ToString(), "gold", 282, 13, play);

        // ---------------- minimap
        bool boss = G.boss.Present;
        mini.Set(2, 138, 84, 40, play);
        mapName.Set(G.map != null ? G.map.def.name : "", "gold", 5, 175, play);
        miniMap.enabled = play; Px.Place(miniMap.transform, 4, 140);
        Box(miniDot, 4 + 1 + Mathf.RoundToInt(P.x * miniScaleX), 140 + 1 + Mathf.RoundToInt(P.y * miniScaleY), 2, 2, play && ((G.tick >> 3) & 1) == 0);

        // ---------------- quest tracker
        var q = Stats.Cur;
        bool showQ = play && !boss && q != null && D.qstate > 0;
        if (showQ)
        {
            string qp = D.qstate == 2 ? "COMPLETE! SEE ELDER ROWAN" : (q.kind == "boss" ? "DEFEAT KING SHROOM" : (q.kind == "collect" ? "CAPS " : q.target.ToUpper() + "S ") + Stats.QuestProgress + "/" + q.need);
            questH.Set("QUEST", "gold", Px.W - 3 - PixelText.Width("QUEST"), 176);
            questT.Set(q.title, "white", Px.W - 3 - PixelText.Width(q.title), 168);
            questP.Set(qp, D.qstate == 2 ? "gold" : "green", Px.W - 3 - PixelText.Width(qp), 160);
        }
        else { questH.Hide(); questT.Hide(); questP.Hide(); }

        // ---------------- chat log
        for (int i = 0; i < chatT.Length; i++)
        {
            float age = i < chat.Count ? G.time - chat[i].t : 99;
            bool on = play && i < chat.Count && age < chat[i].life && (age < chat[i].life - 0.4f || ((G.tick >> 1) & 1) == 0);
            if (on) chatT[i].Set(chat[i].s, chat[i].style, 4, 28 + i * 7); else chatT[i].Hide();
        }
        // ---------------- toast
        if (toastTime > 0)
        {
            toastTime -= Px.DT;
            bool vis = toastTime > 0.5f || ((G.tick >> 2) & 1) == 0;
            int sc = toastStyle.EndsWith("Big") ? 2 : 1;
            toastTxt.Set(toast, toastStyle, Mathf.Round((Px.W - PixelText.Width(toast, sc)) / 2f), 118, vis && play);
        }
        else toastTxt.Hide();
        // first-time controls hint
        bool showHint = play && G.time - G.playStart < 14 && !G.fxs.CalloutActive && !boss && !Autoplay.Showcase;
        string ht = "ARROWS MOVE  SPACE JUMP  J ATTACK  UP TALK/PORTAL  ESC HELP";
        hintT.Set(ht, "white", Mathf.Round((Px.W - PixelText.Width(ht)) / 2f), 130, showHint);

        // ---------------- boss HP bar
        var b = G.boss;
        bossPanel.Set(90, 158, 228, 20, play && boss);
        bIcon.enabled = play && boss; Px.Place(bIcon.transform, 93, 161);
        bName.Set("KING SHROOM", "gold", 110, 176, play && boss);
        string stg = "STAGE " + Mathf.Max(1, b.Stage) + "/3";
        bStage.Set(stg, b.Stage >= 3 ? "crit" : "white", 190 - PixelText.Width(stg) / 2, 176, play && boss);
        if (play && boss)
        {
            int BX = 109, BY = 160, BW = 206;
            Box(bFrame, BX, BY, BW, 7); Box(bBg, BX + 1, BY + 1, BW - 2, 5);
            float per = Boss.MAX_HP / Boss.LAYERS, inner = BW - 2;
            float shownHp = Mathf.Min(b.hp, Boss.MAX_HP * b.barFill);
            int layer = Mathf.Clamp(Mathf.CeilToInt(shownHp / per), 1, Boss.LAYERS);
            float frac = Mathf.Clamp01((shownHp - (layer - 1) * per) / per);
            float lagFrac = Mathf.Clamp01((b.lagHp - (layer - 1) * per) / per);
            int ci = Boss.LAYERS - layer;
            if (layer > 1) { Box(bUnder, BX + 1, BY + 1, inner, 5); bUnder.color = LAYER[ci + 1]; } else bUnder.enabled = false;
            Box(bLag, BX + 1 + inner * frac, BY + 1, inner * Mathf.Max(0, lagFrac - frac), 5);
            Box(bFill, BX + 1, BY + 1, inner * frac, 5); bFill.color = LAYER[ci];
            Box(bShine, BX + 1, BY + 5, inner * frac, 1); bShine.color = LAYER_HI[ci];
            string ls = "X" + layer;
            bLayers.Set(ls, "white", BX + BW - PixelText.Width(ls), 176);
        }
        else { bFrame.enabled = bBg.enabled = bUnder.enabled = bLag.enabled = bFill.enabled = bShine.enabled = false; bLayers.Hide(); }
    }
}

// NPC dialog box: portrait, name, typed text, and a row of choices.
public class Dialog
{
    readonly Panel panel, portraitFrame;
    readonly SpriteRenderer portrait;
    readonly PixelText name;
    readonly PixelText[] lines = new PixelText[6];
    readonly PixelText[] opts = new PixelText[3];
    public bool Open;
    string[] pages; string[] options; int page, sel; float reveal; string who;
    Action<int> done;
    List<string> wrapped = new List<string>();

    public Dialog()
    {
        var ui = Game.I.ui;
        panel = new Panel(ui, 90, "vio5", "gold");
        portraitFrame = new Panel(ui, 91, "ink", "vio2");
        portrait = Px.MakeSR("portrait", ui, 93, Px.LAYER_UI);
        name = new PixelText(ui, 94);
        for (int i = 0; i < lines.Length; i++) lines[i] = new PixelText(ui, 94);
        for (int i = 0; i < opts.Length; i++) opts[i] = new PixelText(ui, 94);
    }

    public void Show(string npc, string displayName, string[] pg, string[] choices, Action<int> cb)
    {
        who = npc; name.Hide(); pages = pg; options = choices ?? new[] { "OK" }; done = cb; page = 0; sel = 0; reveal = 0; Open = true;
        portrait.sprite = npc != null && Atlas.Has("portrait_" + npc) ? Atlas.Single("portrait_" + npc) : null;
        dispName = displayName;
        Wrap();
        Sfx.Play("open");
    }
    string dispName;

    void Wrap()
    {
        wrapped.Clear();
        int max = portrait.sprite != null ? 50 : 60;
        var words = pages[page].Split(' ');
        string cur = "";
        foreach (var w in words)
        {
            if ((cur + " " + w).Trim().Length > max) { wrapped.Add(cur); cur = w; }
            else cur = (cur + " " + w).Trim();
        }
        if (cur.Length > 0) wrapped.Add(cur);
    }

    bool LastPage { get { return page >= pages.Length - 1; } }

    public void Tick(Inp i)
    {
        if (!Open) { Hide(); return; }
        reveal += Px.DT * 70;
        int total = 0; foreach (var w in wrapped) total += w.Length;
        bool full = reveal >= total;
        if (LastPage && full)
        {
            if (i.navL) { sel = (sel + options.Length - 1) % options.Length; Sfx.Play("click"); }
            if (i.navR) { sel = (sel + 1) % options.Length; Sfx.Play("click"); }
        }
        if (i.confirm)
        {
            if (!full) reveal = total;
            else if (!LastPage) { page++; reveal = 0; Wrap(); Sfx.Play("click"); }
            else { Open = false; Hide(); Sfx.Play("click"); done?.Invoke(sel); return; }
        }
        if (i.cancel) { Open = false; Hide(); done?.Invoke(options.Length - 1); return; }
        Draw();
    }

    void Draw()
    {
        bool hasP = portrait.sprite != null;
        panel.Set(24, 24, 272, 70);
        portraitFrame.Set(29, 50, 38, 38, hasP);
        portrait.enabled = hasP; Px.Place(portrait.transform, 31, 52);
        int tx = hasP ? 74 : 32;
        name.Set(dispName ?? "", "gold", tx, 88, dispName != null);
        int budget = Mathf.FloorToInt(reveal);
        for (int k = 0; k < lines.Length; k++)
        {
            if (k >= wrapped.Count) { lines[k].Hide(); continue; }
            string s = wrapped[k];
            string shown = budget >= s.Length ? s : budget > 0 ? s.Substring(0, budget) : "";
            budget -= s.Length;
            lines[k].Set(shown, "white", tx, 79 - k * 8);
        }
        int total = 0; foreach (var w in wrapped) total += w.Length;
        bool full = reveal >= total;
        string[] show = LastPage ? options : new[] { "NEXT" };
        int ox = 290;
        for (int k = opts.Length - 1; k >= 0; k--)
        {
            if (k >= show.Length || !full) { opts[k].Hide(); continue; }
            bool on = !LastPage || k == sel;
            string s = on ? "[" + show[k] + "]" : show[k];
            ox -= PixelText.Width(s) + 8;
            opts[k].Set(s, on ? "gold" : "white", ox + 8, 33);
        }
    }

    void Hide()
    {
        panel.Hide(); portraitFrame.Hide(); portrait.enabled = false; name.Hide();
        foreach (var l in lines) l.Hide(); foreach (var o in opts) o.Hide();
    }
}

// Merchant shop window.
public class Shop
{
    class Item { public string key, name, icon; public int price; }
    readonly Item[] items =
    {
        new Item { key = "red", name = "RED POTION  (+60 HP)", icon = "potion_red", price = 25 },
        new Item { key = "blue", name = "BLUE POTION (+40 MP)", icon = "potion_blue", price = 40 },
        new Item { key = "steely", name = "RUNE OF MIGHT (+8 ATK)", icon = "star_steely", price = 1200 },
        new Item { key = "ilbi", name = "RUNE OF GLORY (+20 ATK)", icon = "star_ilbi", price = 5000 },
    };
    readonly Panel panel, hl;
    readonly PixelText title, meso, help;
    readonly PixelText[] names = new PixelText[4], prices = new PixelText[4];
    readonly SpriteRenderer[] icons = new SpriteRenderer[4];
    public bool Open;
    int sel;

    public Shop()
    {
        var ui = Game.I.ui;
        panel = new Panel(ui, 90, "vio5", "gold"); hl = new Panel(ui, 91, "vio4", "vio2");
        title = new PixelText(ui, 94); meso = new PixelText(ui, 94); help = new PixelText(ui, 94);
        for (int i = 0; i < 4; i++) { names[i] = new PixelText(ui, 94); prices[i] = new PixelText(ui, 94); icons[i] = Px.MakeSR("icon", ui, 93, Px.LAYER_UI); }
    }
    public void Show() { Open = true; sel = 0; Sfx.Play("open"); }

    public void Tick(Inp i)
    {
        if (!Open) { Hide(); return; }
        var D = Stats.D; var G = Game.I;
        if (i.navU) { sel = (sel + 3) % 4; Sfx.Play("click"); }
        if (i.navD) { sel = (sel + 1) % 4; Sfx.Play("click"); }
        if (i.cancel) { Open = false; Hide(); Stats.Save(); return; }
        if (i.confirm)
        {
            var it = items[sel];
            bool owned = (it.key == "steely" && D.starTier >= 1) || (it.key == "ilbi" && D.starTier >= 2);
            bool needPrev = it.key == "ilbi" && D.starTier < 1;
            if (owned || needPrev) { Sfx.Play("deny"); G.hud.Chat(owned ? "YOU ALREADY OWN THAT RUNE." : "BUY THE RUNE OF MIGHT FIRST.", "white"); }
            else if (D.meso < it.price) { Sfx.Play("deny"); G.hud.Chat("NOT ENOUGH MESOS.", "white"); }
            else
            {
                D.meso -= it.price; Sfx.Play("meso");
                if (it.key == "red") D.red++; else if (it.key == "blue") D.blue++;
                else { D.starTier = it.key == "steely" ? 1 : 2; G.hud.Chat("BOUND THE RUNE OF " + Stats.StarName[D.starTier] + "! ATTACK +" + (it.key == "steely" ? 8 : 20) + ".", "gold"); Sfx.Play("unlock"); }
            }
        }
        panel.Set(56, 40, 208, 112);
        title.Set("MIRA'S GOODS", "gold", 64, 146);
        for (int k = 0; k < 4; k++)
        {
            var it = items[k]; int y = 132 - k * 20;
            if (k == sel) hl.Set(60, y - 16, 200, 18);
            icons[k].enabled = true; icons[k].sprite = Atlas.Named("items", it.icon); Px.Place(icons[k].transform, 70, y - 13);
            bool owned = (it.key == "steely" && D.starTier >= 1) || (it.key == "ilbi" && D.starTier >= 2);
            names[k].Set(it.name, k == sel ? "gold" : "white", 80, y - 4);
            string p = owned ? "OWNED" : it.price + " MESO";
            prices[k].Set(p, owned ? "green" : "white", 256 - PixelText.Width(p), y - 4);
        }
        meso.Set("MESO " + D.meso, "gold", 64, 52);
        help.Set("SPACE BUY  ESC CLOSE", "white", 256 - PixelText.Width("SPACE BUY  ESC CLOSE"), 52);
    }
    void Hide()
    {
        panel.Hide(); hl.Hide(); title.Hide(); meso.Hide(); help.Hide();
        for (int k = 0; k < 4; k++) { names[k].Hide(); prices[k].Hide(); icons[k].enabled = false; }
    }
}

// Title screen over the town, and the pause/help overlay.
public class Screens
{
    readonly SpriteRenderer logo;
    readonly PixelText[] menu = new PixelText[2];
    readonly PixelText sub, press, ver;
    readonly Panel pause;
    readonly PixelText[] help = new PixelText[12];
    int sel;
    public bool Paused;
    // class select
    public bool Choosing;
    int csel = 0;
    float cT;
    readonly Panel info;
    readonly Panel[] cards = new Panel[5];
    readonly SpriteRenderer[] portraits = new SpriteRenderer[5];
    readonly SpriteRenderer preview, arrow;
    readonly PixelText cTitle, cName, cRole, cHelp;
    readonly PixelText[] cDesc = new PixelText[3], cSkills = new PixelText[5];
    Anim prevAnim;

    public Screens()
    {
        var ui = Game.I.ui;
        logo = Px.MakeSR("logo", ui, 95, Px.LAYER_UI);
        if (Atlas.Has("logo")) logo.sprite = Atlas.Single("logo");
        for (int i = 0; i < 2; i++) menu[i] = new PixelText(ui, 96);
        sub = new PixelText(ui, 96); press = new PixelText(ui, 96); ver = new PixelText(ui, 96);
        pause = new Panel(ui, 97, "vio5", "gold");
        info = new Panel(ui, 90, "vio5", "vio3");
        for (int i = 0; i < 5; i++) { cards[i] = new Panel(ui, 91, "ink", "vio3"); portraits[i] = Px.MakeSR("portrait", ui, 93, Px.LAYER_UI); }
        preview = Px.MakeSR("preview", ui, 94, Px.LAYER_UI); arrow = Px.MakeSR("arrow", ui, 94, Px.LAYER_UI); arrow.sprite = Px.White; arrow.color = Px.P("gold");
        cTitle = new PixelText(ui, 96); cName = new PixelText(ui, 96); cRole = new PixelText(ui, 96); cHelp = new PixelText(ui, 96);
        for (int i = 0; i < 3; i++) cDesc[i] = new PixelText(ui, 96);
        for (int i = 0; i < 5; i++) cSkills[i] = new PixelText(ui, 96);
        for (int i = 0; i < help.Length; i++) help[i] = new PixelText(ui, 98);
    }

    public void TitleTick(Inp i)
    {
        var G = Game.I;
        bool has = Stats.HasSave;
        string[] opts = has ? new[] { "CONTINUE", "NEW GAME" } : new[] { "NEW GAME" };
        if (i.navU || i.navD) { sel = (sel + 1) % opts.Length; Sfx.Play("click"); }
        sel = Mathf.Clamp(sel, 0, opts.Length - 1);
        logo.enabled = logo.sprite != null;
        if (logo.enabled) Px.Place(logo.transform, Mathf.Round((Px.W - logo.sprite.rect.width) / 2), 104);
        sub.Set(logo.enabled ? "A TALE OF FIVE HEROES" : "HOLLOW CROWN", logo.enabled ? "white" : "goldBig", Mathf.Round((Px.W - PixelText.Width(logo.enabled ? "A TALE OF FIVE HEROES" : "HOLLOW CROWN", logo.enabled ? 1 : 2)) / 2f), logo.enabled ? 100 : 130);
        for (int k = 0; k < 2; k++)
        {
            if (k >= opts.Length) { menu[k].Hide(); continue; }
            string s = k == sel ? "- " + opts[k] + " -" : opts[k];
            menu[k].Set(s, k == sel ? "gold" : "white", Mathf.Round((Px.W - PixelText.Width(s)) / 2f), 76 - k * 10);
        }
        press.Set("SPACE TO SELECT", "white", Mathf.Round((Px.W - PixelText.Width("SPACE TO SELECT")) / 2f), 48, ((G.tick >> 5) & 1) == 0);
        ver.Set("V0.2", "dark", 4, 8);
        if (i.confirm)
        {
            Sfx.Play("quest"); HideTitle();
            if (opts[sel] == "NEW GAME") { Choosing = true; cT = 0; prevAnim = null; }
            else G.StartGame(false, null);
        }
    }
    public void HideTitle() { logo.enabled = false; foreach (var m in menu) m.Hide(); sub.Hide(); press.Hide(); ver.Hide(); }

    // ---------------------------------------------------------------- class select
    public void ClassTick(Inp i)
    {
        var G = Game.I;
        HideTitle();
        var list = Classes.All;
        if (i.navL) { csel = (csel + list.Count - 1) % list.Count; prevAnim = null; Sfx.Play("click"); }
        if (i.navR) { csel = (csel + 1) % list.Count; prevAnim = null; Sfx.Play("click"); }
        if (i.cancel) { Choosing = false; HideClass(); Sfx.Play("click"); return; }
        var c = list[csel];
        bool ok = Classes.Available(c);
        if (i.confirm && ok) { Choosing = false; HideClass(); Sfx.Play("quest"); G.StartGame(true, c.id); return; }
        cT += Px.DT;
        string tt = "CHOOSE YOUR CLASS";
        cTitle.Set(tt, "goldBig", Mathf.Round((Px.W - PixelText.Width(tt, 2)) / 2f), 172);
        int step = 46, x0 = (Px.W - (4 * step + 38)) / 2;
        for (int k = 0; k < list.Count; k++)
        {
            bool on = k == csel;
            int cx = x0 + k * step, cy = on ? 116 : 112;
            cards[k].Set(cx, cy, 38, 38); cards[k].Border(on ? "gold" : "vio3");
            string pn = list[k].Portrait;
            portraits[k].enabled = Atlas.Has(pn);
            if (portraits[k].enabled) { portraits[k].sprite = Atlas.Single(pn); Px.Place(portraits[k].transform, cx + 2, cy + 2); }
            if (on) { arrow.enabled = ((G.tick >> 4) & 1) == 0; arrow.transform.localScale = new Vector3(5, 2, 1); Px.Place(arrow.transform, cx + 16, cy + 41); }
        }
        info.Set(16, 20, 288, 88);
        // animated preview at 2x (integer scale keeps it pixel-perfect)
        if (ok)
        {
            var sh = Atlas.Sheets[c.sheet];
            if (prevAnim == null || prevAnim.sheet != sh) prevAnim = new Anim(sh, "idle");
            float ph = cT % 3.2f;
            string want = ph < 1.6f ? "idle" : ph < 2.3f ? "run" : "attack";
            prevAnim.Play(want); prevAnim.Tick();
            preview.enabled = true; preview.sprite = sh.frames[prevAnim.Frame];
            preview.transform.localScale = new Vector3(2, 2, 1); Px.Place(preview.transform, 66, 34);
        }
        else preview.enabled = false;
        cName.Set(c.name, "goldBig", 118, 100);
        cRole.Set(c.role, "white", 118, 86);
        for (int k = 0; k < 3; k++) cDesc[k].Set(c.desc[k], "white", 118, 76 - k * 8);
        string[] keys = { "J", "K", "L", "U", "SP" };
        for (int k = 0; k < 5; k++) cSkills[k].Set(keys[k] + " " + c.skill[k], k == 4 ? "blue" : "green", k < 3 ? 118 + k * 62 : 118 + (k - 3) * 92, k < 3 ? 46 : 36);
        if (!ok) cSkills[4].Set("COMING SOON", "white", 118, 36);
        cHelp.Set("ARROWS CHOOSE   SPACE START   ESC BACK", "white", Mathf.Round((Px.W - PixelText.Width("ARROWS CHOOSE   SPACE START   ESC BACK")) / 2f), 12);
    }
    public void HideClass()
    {
        info.Hide(); foreach (var c in cards) c.Hide(); foreach (var p in portraits) p.enabled = false;
        preview.enabled = false; arrow.enabled = false; cTitle.Hide(); cName.Hide(); cRole.Hide(); cHelp.Hide();
        foreach (var d in cDesc) d.Hide(); foreach (var s in cSkills) s.Hide();
    }

    static readonly string[] Help =
    {
        "CONTROLS", "", "ARROWS       MOVE / CLIMB (UP, DOWN)", "SPACE        JUMP  (AGAIN IN AIR: MOBILITY, ARROWS AIM TELEPORT)", "DOWN+SPACE   DROP THROUGH A PLATFORM",
        "UP           TALK TO NPC / ENTER PORTAL", "J  K  L  U   TRIPLE THROW, AVENGER, ASSASSINATE, SHADOW PARTNER", "1  2         RED / BLUE POTION", "",
        "ESC  RESUME        Q  SAVE AND QUIT TO TITLE", "", "PROGRESS IS SAVED AUTOMATICALLY",
    };
    public void PauseTick(Inp i, bool qPressed)
    {
        var G = Game.I;
        pause.Set(20, 36, 280, 112);
        var sk = Classes.Cur.skill;
        for (int k = 0; k < help.Length; k++)
            help[k].Set(k == 6 ? "J  K  L  U   " + sk[0] + ", " + sk[1] + ", " + sk[2] + ", " + sk[3] : Help[k], k == 0 ? "gold" : "white", 30, 140 - k * 8);
        if (i.cancel) { Paused = false; HidePause(); }
        if (qPressed) { Paused = false; HidePause(); Stats.Save(); G.ToTitle(); }
    }
    public void HidePause() { pause.Hide(); foreach (var h in help) h.Hide(); }
}
