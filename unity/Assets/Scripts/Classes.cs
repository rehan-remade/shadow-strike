using System.Collections.Generic;
using UnityEngine;

public enum Mobility { Flash, Teleport, Leap, DoubleJump }

// A playable class: art, skill names, MP costs, cooldowns and stat growth.
// Skill slots everywhere: 0 = J (basic), 1 = K, 2 = L, 3 = U, 4 = double-jump mobility.
public class ClassDef
{
    public string id, name, role, sheet, ghost, icons;
    public string[] desc;
    public string[] skill;
    public int[] mp;
    public float[] cd;          // J, K, L, U
    public Mobility mob;
    public int hpBase, hpLv, mpBase, mpLv;
    public Sprite Icon(int slot)
    {
        if (icons == null)   // night lord: the original icon sheets
            return slot < 4 ? Atlas.Sheets["icons"].frames[new[] { 0, 1, 2, 3 }[slot]] : Atlas.Named("icons2", "flash");
        return Atlas.Named(icons, new[] { "j", "k", "l", "u", "sp" }[slot]);
    }
    public string Portrait { get { return "portrait_pc_" + id; } }
}

public static class Classes
{
    public static readonly List<ClassDef> All = new List<ClassDef>
    {
        new ClassDef { id = "hero", name = "HERO", role = "WARRIOR", sheet = "pc_hero", ghost = "pc_hero_ghost", icons = "icons_hero",
            desc = new[] { "HEAVY ARMOUR, HUGE SWORD.", "CHARGES THROUGH CROWDS AND", "SPLITS THE EARTH IN TWO." },
            skill = new[] { "SLASH", "RUSH", "DRAGON FURY", "WORLDREAVER", "LEAP" }, mp = new[] { 0, 12, 20, 22, 2 }, cd = new[] { 0.42f, 2.5f, 6f, 7f },
            mob = Mobility.Leap, hpBase = 60, hpLv = 28, mpBase = 16, mpLv = 8 },
        new ClassDef { id = "archmage", name = "ARCH MAGE", role = "MAGICIAN", sheet = "pc_archmage", ghost = "pc_archmage_ghost", icons = "icons_archmage",
            desc = new[] { "ICE AND FIRE FROM AFAR.", "BLIZZARDS, METEORS AND", "A TELEPORT." },
            skill = new[] { "ICE BOLT", "BLIZZARD", "METEOR", "ICE STRIKE", "TELEPORT" }, mp = new[] { 0, 14, 24, 10, 3 }, cd = new[] { 0.45f, 4f, 7f, 3f },
            mob = Mobility.Teleport, hpBase = 45, hpLv = 14, mpBase = 30, mpLv = 22 },
        new ClassDef { id = "bishop", name = "BISHOP", role = "PRIEST", sheet = "pc_bishop", ghost = "pc_bishop_ghost", icons = "icons_bishop",
            desc = new[] { "HOLY LIGHT THAT SMITES", "AND HEALS. CALLS DOWN", "THE GENESIS PILLARS." },
            skill = new[] { "HOLY ARROW", "ANGEL RAY", "GENESIS", "HEAL", "TELEPORT" }, mp = new[] { 0, 10, 22, 12, 3 }, cd = new[] { 0.45f, 2.5f, 7f, 6f },
            mob = Mobility.Teleport, hpBase = 48, hpLv = 16, mpBase = 30, mpLv = 20 },
        new ClassDef { id = "bowmaster", name = "BOWMASTER", role = "ARCHER", sheet = "pc_bowmaster", ghost = "pc_bowmaster_ghost", icons = "icons_bowmaster",
            desc = new[] { "LONGBOW MARKSMAN.", "POWER SHOTS, EXPLODING", "ARROWS AND A HURRICANE." },
            skill = new[] { "ARROW", "POWER SHOT", "HURRICANE", "ARROW BOMB", "DOUBLE JUMP" }, mp = new[] { 0, 12, 18, 8, 2 }, cd = new[] { 0.38f, 3f, 7f, 1.5f },
            mob = Mobility.DoubleJump, hpBase = 50, hpLv = 20, mpBase = 20, mpLv = 12 },
        new ClassDef { id = "nightlord", name = "NIGHT LORD", role = "THIEF", sheet = "ninja", ghost = "ninja_ghost", icons = null,
            desc = new[] { "SHURIKENS, SHADOWS AND", "BLINK ASSASSINATIONS.", "FIGHTS WITH A CLONE." },
            skill = new[] { "TRIPLE THROW", "AVENGER", "ASSASSINATE", "SHADOW PARTNER", "FLASH JUMP" }, mp = new[] { 0, 10, 16, 20, 2 }, cd = new[] { 0.36f, 4f, 6f, 30f },
            mob = Mobility.Flash, hpBase = 50, hpLv = 22, mpBase = 20, mpLv = 14 },
    };
    public static ClassDef Get(string id) { foreach (var c in All) if (c.id == id) return c; return All[4]; }
    public static ClassDef Cur { get { return Get(Stats.D.cls); } }
    public static bool Available(ClassDef c) { return Atlas.Sheets.ContainsKey(c.sheet); }
}
