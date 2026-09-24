using UnityEngine;

// Pooled pixel particles: 1px (or 2px) SpriteRenderers tinted from palette ramps, snapped to the grid.
public class Particles
{
    public static readonly int[] STRAW = { 24, 23, 23, 25, 25 };
    public static readonly int[] EMBER = { 34, 33, 32, 7, 6 };
    public static readonly int[] DUST = { 26, 25, 20, 19 };
    public static readonly int[] FLUFF = { 26, 26, 25 };
    public static readonly int[] SMOKE = { 49, 50, 51, 51, 52, 53 };     // violet smoke
    public static readonly int[] VSPARK = { 35, 48, 49, 50, 51 };
    public static readonly int[] SPARK = { 35, 34, 39, 40 };
    public static readonly int[] WHITE = { 35, 35, 38 };

    const int N = 640;
    readonly SpriteRenderer[] sr = new SpriteRenderer[N];
    readonly float[] x = new float[N], y = new float[N], vx = new float[N], vy = new float[N], life = new float[N], max = new float[N], grav = new float[N], drag = new float[N];
    readonly int[][] ramp = new int[N][];
    readonly bool[] land = new bool[N], onFx = new bool[N];
    readonly int[] size = new int[N];
    int head;

    public Particles()
    {
        for (int i = 0; i < N; i++)
        {
            bool isFx = i >= N * 2 / 3;       // last third of the pool renders on the (ungraded) FX layer
            onFx[i] = isFx;
            sr[i] = Px.MakeSR("p", isFx ? Game.I.fx : Game.I.world, 40, isFx ? Px.LAYER_FX : 0);
            sr[i].sprite = Px.White; sr[i].enabled = false;
        }
    }

    public void Spawn(float px, float py, float pvx, float pvy, float l, int[] r, float g = 0, bool ld = false, bool fx = false, int sz = 1, float dr = 0)
    {
        // pick the next slot in the requested half of the pool
        int lo = fx ? N * 2 / 3 : 0, hi = fx ? N : N * 2 / 3;
        head = (head + 1) % N;
        int i = lo + head % (hi - lo);
        x[i] = px; y[i] = py; vx[i] = pvx; vy[i] = pvy; life[i] = l; max[i] = l; ramp[i] = r; grav[i] = g; land[i] = ld; size[i] = sz; drag[i] = dr;
        sr[i].enabled = true;
        sr[i].transform.localScale = new Vector3(sz, sz, 1);
    }

    public void Burst(float px, float py, int n, int[] r, float spd, float l, float g, bool fx = false, bool ld = false, float a0 = 0, float a1 = Mathf.PI * 2, float sz2 = 0)
    {
        for (int k = 0; k < n; k++)
        {
            float a = Px.Range(a0, a1), v = Px.Range(spd * 0.3f, spd);
            Spawn(px, py, Mathf.Cos(a) * v, Mathf.Sin(a) * v, Px.Range(l * 0.5f, l), r, g, ld, fx, Px.Rand() < sz2 ? 2 : 1);
        }
    }

    public void Tick()
    {
        for (int i = 0; i < N; i++)
        {
            if (life[i] <= 0) continue;
            life[i] -= Px.DT;
            if (life[i] <= 0) { sr[i].enabled = false; continue; }
            vy[i] -= grav[i] * Px.DT;
            if (drag[i] > 0) { float k = 1 - drag[i] * Px.DT; vx[i] *= k; vy[i] *= k; }
            x[i] += vx[i] * Px.DT; y[i] += vy[i] * Px.DT;
            if (land[i] && y[i] <= Px.GROUND && vy[i] < 0) { y[i] = Px.GROUND + (i & 1); vx[i] = vy[i] = grav[i] = 0; }
            var r = ramp[i];
            float f = 1 - life[i] / max[i];
            sr[i].color = Px.Pal[r[Mathf.Min(r.Length - 1, (int)(f * r.Length))]];
            float o = size[i] > 1 ? -1 : 0;
            Px.Place(sr[i].transform, x[i] + o, y[i] + o);
        }
    }
}
