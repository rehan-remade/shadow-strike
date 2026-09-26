// Anything the player's skills can hit: field monsters, the training dummy, the boss.
public struct HitOpt { public float push; public int stop, shakeN, straw; public bool big, crit, bigNum; public float dmgBase; public string sfx; }

// per-target MapleStory damage-number stacking state
public class DamageStack { public float last = -9, jit; public int slot; }

public interface ITarget
{
    bool Active { get; }
    float BaseY { get; }   // feet
    float SurfL(float y);
    float SurfR(float y);
    bool InBand(float y);
    float CentreX(float y);
    int MidH { get; }      // height of the slash / X mark above the feet
    int Reach { get; }     // how far from the centre Assassinate lands
    bool Grind { get; }    // Avenger grinds on it (boss, dummy) instead of piercing through
    void Hit(float x, float y, HitOpt o, int dir);
    void StickStar(float x, float y, bool clone);
    void Mark();           // Assassinate X-mark reaction
    void Drag(float toX);  // carried along by a charge (Hero's Rush); heavy targets ignore it
}
