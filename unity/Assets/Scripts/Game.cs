using System.Collections.Generic;
using System.IO;
using UnityEngine;

public struct Inp
{
    public bool left, right, up, down, jumpHeld;                                  // held
    public bool jump, attack, avenger, assassin, partner, boss, upPress, pot1, pot2; // pressed this tick
    public bool confirm, cancel, navL, navR, navU, navD, quit;                       // UI presses
}

// Bootstrap, state machine, camera, maps, and the pixel-perfect render pipeline:
//   world camera -> sceneRT, fx camera -> fxRT, composite shader (grade, fx over, water reflection, flash, fade) -> finalRT,
//   ui camera draws on top of finalRT, which is shown integer-scaled with point filtering.
public class Game : MonoBehaviour
{
    public static Game I;
    public enum State { Title, Play }
    public State state = State.Title;
    public Transform world, fx, ui;
    public float time, playStart;
    public int tick, frameNo;
    public int freeze, shake, shakeAmp = 1, flashT;
    public float grade, gradeTarget, bossDark, fade, fadeTarget;
    public int camX, camY;
    float camFX, camFY;

    public Player player;
    public Particles parts;
    public Numbers numbers;
    public Pops pops;
    public Projectiles proj;
    public Hud hud;
    public Fx fxs;
    public Boss boss;
    public Drops drops;
    public Dialog dialog;
    public Shop shop;
    public Screens screens;
    public MapRuntime map;
    public readonly List<ITarget> targets = new List<ITarget>();

    Camera disp, worldCam, fxCam, uiCam;
    RenderTexture sceneRT, fxRT, finalRT;
    Material comp;
    Color gradeCol;
    float acc, saveT, bossSpawnT = -1;
    Inp edges;
    bool qEdge, screens0;   // screens0: -classselect capture mode (cycles the cards)
    string pendingMap, pendingPortal;
    public bool capture, autoplay;
    string capDir;
    int maxFrames = 0;
    Texture2D capTex;
    public readonly List<string> sfxLog = new List<string>();

    void Awake()
    {
        I = this;
        Application.targetFrameRate = 60;
        var args = System.Environment.GetCommandLineArgs();
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "-autoplay") autoplay = true;
            if (args[i] == "-capture" && i + 1 < args.Length) { capture = true; capDir = args[i + 1]; }
            if (args[i] == "-frames" && i + 1 < args.Length) maxFrames = int.Parse(args[i + 1]);
            if (args[i] == "-bossdemo") { autoplay = true; Autoplay.BossDemo = true; }
            if (args[i] == "-bosshp" && i + 1 < args.Length) Boss.MAX_HP = float.Parse(args[i + 1], System.Globalization.CultureInfo.InvariantCulture);
            if (args[i] == "-map" && i + 1 < args.Length) Autoplay.StartMap = args[i + 1];
            if (args[i] == "-level" && i + 1 < args.Length) Autoplay.StartLevel = int.Parse(args[i + 1]);
            if (args[i] == "-climbtest") Autoplay.ClimbTest = true;
            if (args[i] == "-skilltest" && i + 1 < args.Length) Autoplay.SkillTest = args[i + 1];
            if (args[i] == "-class" && i + 1 < args.Length) Autoplay.StartClass = args[i + 1];
            if (args[i] == "-classselect") screens0 = true;
        }
        if (capture) { Time.captureFramerate = 60; Directory.CreateDirectory(capDir); capTex = new Texture2D(Px.W, Px.H, TextureFormat.RGB24, false); }
        Atlas.Load();
        gradeCol = Px.Hex("#0c0520");

        world = Root("World", 0); fx = Root("FX", Px.LAYER_FX); ui = Root("UI", Px.LAYER_UI);
        sceneRT = RT(); fxRT = RT(); finalRT = RT();
        worldCam = Cam("WorldCam", 1 << 0, sceneRT, Color.black);
        fxCam = Cam("FxCam", 1 << Px.LAYER_FX, fxRT, new Color(0, 0, 0, 0));
        uiCam = Cam("UiCam", 1 << Px.LAYER_UI, finalRT, Color.clear);
        uiCam.clearFlags = CameraClearFlags.Nothing;
        disp = new GameObject("Display").AddComponent<Camera>();
        disp.cullingMask = 0; disp.clearFlags = CameraClearFlags.SolidColor; disp.backgroundColor = new Color32(7, 6, 15, 255);
        comp = new Material(Resources.Load<Shader>("PixelComposite"));

        parts = new Particles();
        fxs = new Fx();
        numbers = new Numbers();
        pops = new Pops();
        drops = new Drops();
        boss = new Boss();
        proj = new Projectiles();
        hud = new Hud();
        player = new Player();
        dialog = new Dialog();
        shop = new Shop();
        screens = new Screens();
        Sfx.Init();
        Stats.Load();

        // title screen sits over the town
        LoadMap("town", null);
        player.SetVisible(false);
        Sfx.Music("bgm_title");
        if (screens0) screens.Choosing = true;
        if (autoplay)
        {
            StartGame(true, Autoplay.StartClass);
            if (Autoplay.StartLevel > 1) { Stats.D.level = Autoplay.StartLevel; Stats.D.hp = Stats.MaxHp; Stats.D.mp = Stats.MaxMp; Stats.D.red = 30; Stats.D.blue = 30; Stats.D.quest = 3; }
            if (Autoplay.StartMap != null) pendingMap = Autoplay.StartMap;
        }
    }

    Transform Root(string n, int layer) { var go = new GameObject(n) { layer = layer }; return go.transform; }
    RenderTexture RT()
    {
        var rt = new RenderTexture(Px.W, Px.H, 16, RenderTextureFormat.ARGB32) { filterMode = FilterMode.Point, antiAliasing = 1, useMipMap = false };
        rt.Create(); return rt;
    }
    Camera Cam(string n, int mask, RenderTexture rt, Color bg)
    {
        var c = new GameObject(n).AddComponent<Camera>();
        c.orthographic = true; c.orthographicSize = Px.H / 2f; c.nearClipPlane = 0.1f; c.farClipPlane = 100f;
        c.transform.position = new Vector3(Px.W / 2f, Px.H / 2f, -10);
        c.cullingMask = mask; c.targetTexture = rt; c.clearFlags = CameraClearFlags.SolidColor; c.backgroundColor = bg;
        c.allowMSAA = false; c.allowHDR = false; c.enabled = false;
        return c;
    }

    // ------------------------------------------------------------------ game flow
    public void StartGame(bool fresh, string cls)
    {
        if (fresh) Stats.NewGame(cls ?? "nightlord"); else Stats.Load();
        if (!Classes.Available(Classes.Cur)) Stats.D.cls = "nightlord";
        player.SetClass(Classes.Cur);
        state = State.Play; playStart = time;
        screens.HideTitle();
        Transition(Stats.D.map, null);
        if (fresh)
            hud.Chat("WELCOME TO CROWNHOLLOW. TALK TO ELDER ROWAN BY THE FIRE (UP).", "gold");
    }
    public void ToTitle()
    {
        state = State.Title; dialog.Open = false; shop.Open = false;
        LoadMap("town", null); player.SetVisible(false); Sfx.Music("bgm_title");
    }

    public void Transition(string mapId, string portalId)
    {
        pendingMap = mapId; pendingPortal = portalId; fadeTarget = 1;
        Sfx.Play("portal");
    }

    void LoadMap(string id, string portalId)
    {
        if (map != null) map.Destroy();
        drops.Clear(); proj.Clear(); boss.Despawn(); gradeTarget = 0; bossDark = 0;
        var def = MapDefs.All[id];
        map = new MapRuntime(def);
        float px = def.spawnX;
        if (portalId != null) foreach (var p in def.portals) if (p.id == portalId) px = p.x + (p.x < def.w / 2 ? 18 : -18);
        player.PlaceAt(px, Px.GROUND);
        player.face = px < def.w / 2 ? 1 : -1;
        player.SetVisible(state == State.Play);
        camFX = Mathf.Clamp(player.x - Px.W / 2f, 0, def.w - Px.W); camFY = def.camMinY;
        hud.BuildMinimap(map);
        if (state == State.Play) { Stats.D.map = id; Stats.Save(); Sfx.Music(def.bgm); hud.Toast(def.name, "goldBig"); }
        bossSpawnT = def.boss ? 1.2f : -1;
    }

    // Up key: portal or NPC in reach
    public string InteractHint()
    {
        if (state != State.Play || map == null) return null;
        foreach (var p in map.portals) if (Mathf.Abs(player.x - p.def.x) < 10 && Mathf.Abs(player.y - p.def.y) < 6) return "portal";
        foreach (var n in map.npcs) if (Mathf.Abs(player.x - n.x) < 16 && Mathf.Abs(player.y - n.y) < 6) return "npc";
        return null;
    }
    public bool TryInteract()
    {
        foreach (var p in map.portals)
            if (Mathf.Abs(player.x - p.def.x) < 10 && Mathf.Abs(player.y - p.def.y) < 6)
            {
                if (p.def.to == "glade" && Stats.D.quest < 3 && !Stats.D.bossDown) { hud.Chat("A ROYAL SEAL BLOCKS THE WAY...", "white"); Sfx.Play("deny"); return true; }
                Transition(p.def.to, p.def.toPortal); return true;
            }
        foreach (var n in map.npcs)
            if (Mathf.Abs(player.x - n.x) < 16 && Mathf.Abs(player.y - n.y) < 6) { Talk(n); return true; }
        return false;
    }

    void Talk(Npc n)
    {
        n.talking = true;
        if (n.d.id == "merchant")
        {
            dialog.Show("merchant", "MIRA - MERCHANT", new[] { "WELCOME, TRAVELER! POTIONS, STARS... IF IT HELPS YOU FIGHT MUSHROOMS, I SELL IT." }, new[] { "BUY", "LEAVE" },
                c => { n.talking = false; if (c == 0) shop.Show(); });
            return;
        }
        var q = Stats.Cur; var D = Stats.D;
        const string who = "ELDER ROWAN";
        if (q == null) { dialog.Show("elder", who, new[] { "THE FOREST SLEEPS PEACEFULLY AGAIN. REST BY THE FIRE, HERO." }, null, c => n.talking = false); return; }
        if (D.qstate == 0)
            dialog.Show("elder", who, q.offer, new[] { "ACCEPT", "DECLINE" }, c =>
            {
                n.talking = false;
                if (c != 0) return;
                D.qstate = 1; D.qcount = 0;
                hud.Chat("QUEST STARTED: " + q.title, "green"); Sfx.Play("open");
                if (q.kind == "collect" && Stats.QuestProgress >= q.need) { D.qstate = 2; hud.Chat("QUEST COMPLETE! RETURN TO ELDER ROWAN.", "gold"); }
                Stats.Save();
            });
        else if (D.qstate == 1) dialog.Show("elder", who, q.active, null, c => n.talking = false);
        else dialog.Show("elder", who, q.done, new[] { "COMPLETE" }, c => { n.talking = false; Stats.TurnIn(); hud.Toast("QUEST CLEAR!", "goldBig"); });
    }

    string cheatBuf = "";
    void MaxLevelCheat()
    {
        var D = Stats.D;
        D.level = 30; D.exp = 0; D.hp = Stats.MaxHp; D.mp = Stats.MaxMp; D.red = 99; D.blue = 99;
        player.cdThrow = player.cdAv = player.cdAs = player.cdSp = 0;
        OnLevelUp();
        hud.Chat("CHEAT: LV 30, ALL SKILLS UNLOCKED.", "gold", 4f);
        Stats.Save();
    }

    public void OnLevelUp()
    {
        hud.Toast("LEVEL UP!", "goldBig");
        hud.Chat("LEVEL UP! YOU ARE NOW LV " + Stats.D.level + ".", "gold");
        if (Atlas.Sheets.ContainsKey("levelup")) fxs.Play("levelup", player.x, player.y, true, 0, -1, false, 70);
        parts.Burst(player.x, player.y + 12, 30, Particles.SPARK, 90, 0.9f, -20, true, false, 0, Mathf.PI * 2, 0.3f);
        Sfx.Play("levelup");
        for (int s = 0; s < Stats.SkillLevel.Length; s++)
            if (Stats.SkillLevel[s] == Stats.D.level)
            {
                string[] keys = { "J", "K", "L", "U", "SPACE X2" };
                hud.Chat("NEW SKILL: " + Stats.SkillName[s] + " [" + keys[s] + "]", "green");
                pops.Show("NEW SKILL: " + Stats.SkillName[s], "green", player.x, player.y + 44, 3f);
                Sfx.Play("unlock");
            }
        Stats.Save();
    }

    public void OnPlayerDeath()
    {
        dialog.Show(null, null, new[] { "YOU HAVE BEEN DEFEATED. YOU WILL RETURN TO CROWNHOLLOW AND LOSE 10% OF YOUR EXP." }, new[] { "OK" }, c =>
        {
            Stats.D.exp = Mathf.Max(0, Stats.D.exp - Stats.ExpNeed(Stats.D.level) / 10);
            player.Revive();
            Transition("town", null);
        });
    }

    public void AddDamage(float v) { }
    public void OnBossGone() { hud.Chat("THE ROYAL GLADE FALLS SILENT.", "gold"); }

    // ------------------------------------------------------------------ input
    void Update()
    {
        if (!autoplay)
        {
            edges.jump |= Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.LeftAlt);
            edges.attack |= Input.GetKeyDown(KeyCode.J) || Input.GetKeyDown(KeyCode.Z) || Input.GetKeyDown(KeyCode.LeftControl);
            edges.avenger |= Input.GetKeyDown(KeyCode.K) || Input.GetKeyDown(KeyCode.X);
            edges.assassin |= Input.GetKeyDown(KeyCode.L) || Input.GetKeyDown(KeyCode.C);
            edges.partner |= Input.GetKeyDown(KeyCode.U) || Input.GetKeyDown(KeyCode.V);
            edges.upPress |= Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W);
            edges.pot1 |= Input.GetKeyDown(KeyCode.Alpha1) || Input.GetKeyDown(KeyCode.Delete);
            edges.pot2 |= Input.GetKeyDown(KeyCode.Alpha2) || Input.GetKeyDown(KeyCode.End);
            edges.confirm |= Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.J) || Input.GetKeyDown(KeyCode.Z);
            edges.cancel |= Input.GetKeyDown(KeyCode.Escape);
            edges.navL |= Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A);
            edges.navR |= Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D);
            edges.navU |= Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W);
            edges.navD |= Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S);
            edges.quit |= Input.GetKeyDown(KeyCode.Q);
            // cheat code: type MAPLE during play for max level
            foreach (char ch in Input.inputString)
            {
                cheatBuf = (cheatBuf + char.ToUpperInvariant(ch));
                if (cheatBuf.Length > 8) cheatBuf = cheatBuf.Substring(cheatBuf.Length - 8);
                if (cheatBuf.EndsWith("MAPLE") && state == State.Play) { cheatBuf = ""; MaxLevelCheat(); }
            }
        }
        if (capture) Tick();
        else
        {
            acc += Mathf.Min(Time.deltaTime, 0.1f);
            while (acc >= Px.DT) { Tick(); acc -= Px.DT; }
        }
    }

    Inp Sample()
    {
        Inp i;
        if (autoplay) i = Autoplay.At(frameNo);
        else
        {
            i = edges;
            i.left = Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A);
            i.right = Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D);
            i.up = Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W);
            i.down = Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S);
            i.jumpHeld = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.LeftAlt);
            edges = default(Inp);
        }
        return i;
    }

    // ------------------------------------------------------------------ fixed tick
    void Tick()
    {
        var inp = Sample();
        frameNo++;
        if (shake > 0) shake--;
        if (flashT > 0) flashT--;

        // fade transitions between maps
        fade = Mathf.MoveTowards(fade, fadeTarget, Px.DT * 5);
        if (pendingMap != null && fade >= 1) { LoadMap(pendingMap, pendingPortal); pendingMap = null; fadeTarget = 0; }

        bool uiOpen = dialog.Open || shop.Open || screens.Paused;
        if (screens0 && frameNo % 90 == 45) inp.navR = true;
        if (state == State.Title) { if (screens.Choosing) screens.ClassTick(inp); else screens.TitleTick(inp); inp = default(Inp); }
        else if (dialog.Open) { dialog.Tick(inp); inp = default(Inp); }
        else if (shop.Open) { shop.Tick(inp); inp = default(Inp); }
        else if (screens.Paused) { screens.PauseTick(inp, inp.quit); inp = default(Inp); }
        else if (inp.cancel && state == State.Play) { screens.Paused = true; Sfx.Play("open"); }
        if (!dialog.Open) dialog.Tick(inp);
        if (!shop.Open) shop.Tick(inp);

        if (freeze > 0 && !uiOpen) { freeze--; UpdateCamera(); hud.Tick(); return; }
        if (uiOpen || pendingMap != null) { UpdateCamera(); hud.Tick(); numbers.Tick(); return; }

        tick++;
        time += Px.DT;
        targets.Clear();
        foreach (var m in map.mobs) if (m.Active) targets.Add(m);
        if (map.dummy != null) targets.Add(map.dummy);
        if (boss.Present) targets.Add(boss);

        if (state == State.Play) player.Tick(inp);
        map.Tick();
        if (bossSpawnT > 0) { bossSpawnT -= Px.DT; if (bossSpawnT <= 0) boss.Spawn(); }
        boss.Tick();
        proj.Tick();
        drops.Tick();
        fxs.Tick();
        parts.Tick();
        UpdateCamera();
        numbers.Tick();
        pops.Tick();
        hud.Tick();
        grade = Mathf.MoveTowards(grade, bossDark, Px.DT * 3.5f);   // skills no longer darken the screen; only the boss entrance does
        saveT += Px.DT;
        if (saveT > 30 && state == State.Play) { saveT = 0; Stats.Save(); }
    }

    void UpdateCamera()
    {
        if (map == null) return;
        float tx, ty;
        if (state == State.Title) { tx = 120 + Mathf.Sin(time * 0.15f) * 100; ty = 0; }
        else { tx = player.x - Px.W / 2f; ty = player.y - 64; }
        tx = Mathf.Clamp(tx, 0, map.def.w - Px.W); ty = Mathf.Clamp(ty, map.def.camMinY, map.def.h - Px.H);
        camFX += (tx - camFX) * 0.12f; camFY += (ty - camFY) * 0.1f;
        camX = Mathf.RoundToInt(camFX); camY = Mathf.RoundToInt(camFY);
        map.Parallax(camX, camY);
    }

    public void Hitstop(int n) { freeze = Mathf.Max(freeze, n); }
    public void Shake(int n, int amp) { if (shake <= 0) shakeAmp = 1; shake = Mathf.Max(shake, n); shakeAmp = Mathf.Max(shakeAmp, amp); }
    public void Flash(int frames) { flashT = Mathf.Max(flashT, frames); }

    void OnApplicationQuit() { if (state == State.Play) Stats.Save(); }

    // ------------------------------------------------------------------ render
    void LateUpdate()
    {
        int sx = 0, sy = 0;
        if (shake > 0) { int a = shake > 8 ? shakeAmp : 1; sx = ((shake >> 1) & 1) == 1 ? a : -a; sy = (shake & 1) == 1 ? a : 0; }
        var p = new Vector3(camX + Px.W / 2f - sx, camY + Px.H / 2f - sy, -10);
        worldCam.transform.position = p; fxCam.transform.position = p;
        worldCam.Render();
        fxCam.Render();
        float g = Mathf.Floor(grade * 3.99f) / 3f * 0.6f;
        comp.SetTexture("_FxTex", fxRT);
        comp.SetColor("_Grade", new Color(gradeCol.r, gradeCol.g, gradeCol.b, g));
        comp.SetFloat("_Flash", flashT > 0 ? (flashT > 1 ? 0.3f : 0.15f) : 0f);
        comp.SetFloat("_Fade", Mathf.Floor(fade * 4) / 4f);
        comp.SetFloat("_T", time);
        float wr = map != null && map.def.waterY > 0 ? Px.H - (map.def.waterY - camY) : 9999;
        comp.SetFloat("_WaterRow", wr);
        Graphics.Blit(sceneRT, finalRT, comp);
        uiCam.Render();
        if (capture)
        {
            var prev = RenderTexture.active;
            RenderTexture.active = finalRT;
            capTex.ReadPixels(new Rect(0, 0, Px.W, Px.H), 0, 0, false); capTex.Apply(false);
            RenderTexture.active = prev;
            File.WriteAllBytes(Path.Combine(capDir, frameNo.ToString("00000") + ".png"), capTex.EncodeToPNG());
            if (maxFrames > 0 && frameNo >= maxFrames)
            {
                File.WriteAllText(Path.Combine(capDir, "sfx.txt"), string.Join("\n", sfxLog));
                Application.Quit();
            }
        }
    }

    void OnGUI()
    {
        if (Event.current.type != EventType.Repaint) return;
        int s = Mathf.Max(1, Mathf.Min(Screen.width / Px.W, Screen.height / Px.H));
        int w = Px.W * s, h = Px.H * s;
        GUI.DrawTexture(new Rect((Screen.width - w) / 2, (Screen.height - h) / 2, w, h), finalRT, ScaleMode.StretchToFill, false);
    }
}
