using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class SaveData
{
    public int level = 1, exp, hp = -1, mp = -1, meso = 50;
    public int red = 5, blue = 3, cap, root, crown, starTier;
    public int quest, qstate, qcount;       // quest chain index, 0 not started / 1 active / 2 ready, kill counter
    public string map = "town", cls = "nightlord";
    public bool bossDown, seenIntro;
}

public class QuestDef
{
    public string title, kind, target;      // kind: kill | collect | boss
    public int need, rExp, rMeso, rRed, rBlue;
    public string[] offer, active, done;
}

// Character progression, inventory, quests and saving (MapleStory-style numbers: small and growing).
public static class Stats
{
    public static SaveData D = new SaveData();
    public static string[] SkillName { get { return Classes.Cur.skill; } }
    public static readonly int[] SkillLevel = { 1, 6, 8, 4, 2 };
    public static int[] SkillMp { get { return Classes.Cur.mp; } }
    static readonly int[] StarAtk = { 0, 8, 20 };
    public static readonly string[] StarName = { "NONE", "MIGHT", "GLORY" };   // attack runes (saved as starTier)

    public static int Level { get { return D.level; } }
    public static int MaxHp { get { var c = Classes.Cur; return c.hpBase + c.hpLv * D.level; } }
    public static int MaxMp { get { var c = Classes.Cur; return c.mpBase + c.mpLv * D.level; } }
    public static int Atk { get { return 10 + 4 * D.level + StarAtk[D.starTier]; } }
    public static int ExpNeed(int lvl) { return Mathf.RoundToInt(20 * Mathf.Pow(lvl, 1.7f)); }
    public static bool Unlocked(int skill) { return D.level >= SkillLevel[skill]; }

    public static readonly QuestDef[] Quests =
    {
        new QuestDef { title = "SHELLS IN THE GROVE", kind = "kill", target = "shellback", need = 8, rExp = 60, rMeso = 300, rRed = 10,
            offer = new[] { "AH, AN ADVENTURER. JUST IN TIME.", "SHELLBACKS HAVE CRAWLED OUT OF THE MUSHROOM GROVE EAST OF TOWN. THEY CHEW OUR FENCES TO SPLINTERS.", "DEFEAT 8 OF THEM FOR ME?" },
            active = new[] { "THE GROVE IS THROUGH THE PORTAL TO THE EAST. PRESS UP ON A PORTAL TO USE IT." },
            done = new[] { "WELL DONE! THE FENCES THANK YOU. TAKE THESE POTIONS, YOU WILL NEED THEM." } },
        new QuestDef { title = "CAPLING CAPS", kind = "collect", target = "cap", need = 8, rExp = 220, rMeso = 800, rBlue = 8,
            offer = new[] { "THE CAPLINGS ARE RESTLESS. MUSHROOMS DO NOT HOP ABOUT FOR NO REASON...", "BRING ME 8 CAPLING CAPS. I WILL STUDY THEM BY THE FIRE." },
            active = new[] { "CAPLINGS LIVE ON THE HIGHER PLATFORMS OF THE GROVE. CLIMB THE ROPES WITH UP." },
            done = new[] { "THESE CAPS... THEY BEAR A ROYAL MARK. SOMETHING IS COMMANDING THEM." } },
        new QuestDef { title = "ROOTS OF TROUBLE", kind = "kill", target = "stumpy", need = 12, rExp = 520, rMeso = 1500, rRed = 10, rBlue = 10,
            offer = new[] { "BEYOND THE GROVE LIES THE HOLLOW DEEP. EVEN THE OLD STUMPS HAVE WOKEN UP THERE.", "THIN THEIR NUMBERS - DEFEAT 12 STUMPIES." },
            active = new[] { "THE HOLLOW DEEP IS EAST OF THE MUSHROOM GROVE. WATCH OUT FOR THE WISPS." },
            done = new[] { "YOU HAVE GROWN STRONG. NOW I CAN TELL YOU THE TRUTH..." } },
        new QuestDef { title = "THE CROWNED ONE", kind = "boss", target = "king", need = 1, rExp = 3000, rMeso = 8000,
            offer = new[] { "KING SHROOM HAS AWOKEN IN THE ROYAL GLADE. HE IS THE ONE STIRRING THE FOREST.", "THE GLADE SEAL WILL NOW OPEN FOR YOU. END HIS REIGN, ADVENTURER." },
            active = new[] { "THE ROYAL GLADE LIES AT THE FAR EAST END OF THE HOLLOW DEEP. HE FIGHTS IN THREE STAGES - WATCH THE GROUND FOR HIS MARKS." },
            done = new[] { "THE CROWN OF THE MUSHROOM KING! CROWNHOLLOW IS SAFE THANKS TO YOU.", "YOU ARE A TRUE HERO OF THE WOODS." } },
    };
    public static QuestDef Cur { get { return D.quest < Quests.Length ? Quests[D.quest] : null; } }
    public static int QuestProgress
    {
        get
        {
            var q = Cur; if (q == null) return 0;
            if (q.kind == "collect") return Mathf.Min(q.need, Item(q.target));
            return D.qcount;
        }
    }

    public static int Item(string id)
    {
        switch (id) { case "red": return D.red; case "blue": return D.blue; case "cap": return D.cap; case "root": return D.root; case "crown": return D.crown; }
        return 0;
    }
    public static void AddItem(string id, int n)
    {
        switch (id) { case "red": D.red += n; break; case "blue": D.blue += n; break; case "cap": D.cap += n; break; case "root": D.root += n; break; case "crown": D.crown += n; break; }
        if (Cur != null && D.qstate == 1 && Cur.kind == "collect" && Cur.target == id) QuestTick(false);
    }

    public static void GainExp(int n)
    {
        var G = Game.I;
        D.exp += n;
        G.hud.Gain("EXP", n, "gold");
        while (D.exp >= ExpNeed(D.level) && D.level < 30)
        {
            D.exp -= ExpNeed(D.level);
            D.level++;
            D.hp = MaxHp; D.mp = MaxMp;
            G.OnLevelUp();
        }
    }

    public static void OnKill(string mob)
    {
        var q = Cur;
        if (q == null || D.qstate != 1) return;
        if ((q.kind == "kill" || q.kind == "boss") && q.target == mob) { D.qcount++; QuestTick(true); }
    }
    static void QuestTick(bool announce)
    {
        var q = Cur; var G = Game.I;
        int p = QuestProgress;
        if (announce || q.kind == "collect") G.hud.Chat(q.title + " " + Mathf.Min(p, q.need) + "/" + q.need, "green", 2.5f);
        if (p >= q.need && D.qstate == 1)
        {
            D.qstate = 2;
            G.hud.Chat("QUEST COMPLETE! RETURN TO ELDER ROWAN.", "gold");
            G.hud.Toast("QUEST COMPLETE!", "goldBig");
            Sfx.Play("quest");
        }
    }

    public static void TurnIn()
    {
        var q = Cur; var G = Game.I;
        if (q.kind == "collect") AddItem(q.target, -q.need);
        D.meso += q.rMeso; if (q.rRed > 0) D.red += q.rRed; if (q.rBlue > 0) D.blue += q.rBlue;
        G.hud.Gain("MESO", q.rMeso, "white");
        if (q.rRed > 0) G.hud.Chat("+" + q.rRed + " RED POTION", "white", 3f);
        if (q.rBlue > 0) G.hud.Chat("+" + q.rBlue + " BLUE POTION", "white", 3f);
        D.quest++; D.qstate = 0; D.qcount = 0;
        GainExp(q.rExp);
        Sfx.Play("quest");
        Save();
    }

    // ---------------------------------------------------------------- saving
    const string KEY = "hollowcrown_save_v1";
    public static bool HasSave { get { return PlayerPrefs.HasKey(KEY); } }
    public static void Save()
    {
        if (Game.I != null && Game.I.capture) return;
        PlayerPrefs.SetString(KEY, JsonUtility.ToJson(D)); PlayerPrefs.Save();
    }
    public static void Load()
    {
        D = HasSave ? JsonUtility.FromJson<SaveData>(PlayerPrefs.GetString(KEY)) : new SaveData();
        if (D.hp < 0) D.hp = MaxHp;
        if (D.mp < 0) D.mp = MaxMp;
    }
    public static void NewGame(string cls) { D = new SaveData { cls = cls }; D.hp = MaxHp; D.mp = MaxMp; Save(); }
}
