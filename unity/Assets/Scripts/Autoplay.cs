using UnityEngine;

// Scripted / bot input for headless captures (trailers and visual checks).
//   -autoplay                grind bot in the starting map
//   -map <id> -level <n>     start directly in a map at a level
//   -bossdemo                (legacy) same bot; use with -map glade
public static class Autoplay
{
    public static bool BossDemo;
    public static string StartMap;
    public static int StartLevel = 1;
    public static bool ClimbTest;
    public static string StartClass;
    static int lastConfirm;

    public static Inp At(int frame)
    {
        var i = new Inp();
        var G = Game.I; var P = G.player;
        if (G.dialog.Open || G.shop.Open) { if (frame - lastConfirm > 40) { i.confirm = true; lastConfirm = frame; } return i; }
        if (G.state != Game.State.Play || P.dead || frame < 60) return i;
        var D = Stats.D;
        if (ClimbTest)   // walk to the first rope and climb it (visual check)
        {
            float rx = G.map.def.climbs[0].x - P.x;
            if (Mathf.Abs(rx) > 2 && P.grounded) { if (rx > 0) i.right = true; else i.left = true; }
            else i.up = true;
            return i;
        }
        if (D.hp < Stats.MaxHp * 0.35f && D.red > 0 && frame % 30 == 0) i.pot1 = true;
        if (D.mp < Stats.MaxMp * 0.2f && D.blue > 0 && frame % 30 == 15) i.pot2 = true;
        if (Stats.Unlocked(3) && !P.CloneOn && P.cdSp <= 0 && D.mp >= Stats.SkillMp[3] && frame % 20 == 0) { i.partner = true; return i; }

        // in town with a quest to pick up: walk to the elder and talk
        if (G.map.def.id == "town" && D.qstate != 1 && Stats.Cur != null)
        {
            foreach (var n in G.map.npcs)
                if (n.d.id == "elder")
                {
                    float dx0 = n.x - P.x;
                    if (Mathf.Abs(dx0) > 8) { if (dx0 > 0) i.right = true; else i.left = true; }
                    else if (frame % 30 == 0) i.upPress = true;
                    return i;
                }
        }
        // pick the nearest living target, preferring the same height
        ITarget best = null; float bd = 1e9f;
        foreach (var t in G.targets)
        {
            if (!t.Active) continue;
            float dx = t.CentreX(t.BaseY) - P.x, dy = Mathf.Abs(t.BaseY - P.y);
            float score = Mathf.Abs(dx) + dy * 4;
            if (score < bd) { bd = score; best = t; }
        }
        if (best == null) { i.right = (frame / 240) % 2 == 0; i.left = !i.right; return i; }
        float ddx = best.CentreX(best.BaseY) - P.x; int want = ddx >= 0 ? 1 : -1; float ad = Mathf.Abs(ddx);
        float ddy = best.BaseY - P.y;
        if (ddy > 20 && frame % 50 == 0) i.jump = true;                        // target above: hop up
        if (ddy < -20 && P.grounded && frame % 80 == 0) { i.down = true; i.jump = true; }  // below: drop through
        bool wall = P.x < G.map.MinX + 12 || P.x > G.map.MaxX - 12;
        if (ad > 80) { if (want > 0) i.right = true; else i.left = true; }
        else if (ad < 18 && !wall) { if (want > 0) i.left = true; else i.right = true; }
        else if (P.face != want) { if (want > 0) i.right = true; else i.left = true; }
        else
        {
            if (Stats.Unlocked(2) && P.cdAs <= 0 && D.mp >= Stats.SkillMp[2] && frame % 7 == 0) i.assassin = true;
            else if (Stats.Unlocked(1) && P.cdAv <= 0 && D.mp >= Stats.SkillMp[1] && frame % 5 == 0) i.avenger = true;
            else if (P.cdThrow <= 0) i.attack = true;
        }
        if (frame % 131 == 0 && !i.jump) i.jump = true;
        return i;
    }
}
