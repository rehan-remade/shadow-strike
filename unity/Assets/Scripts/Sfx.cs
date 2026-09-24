using System.Collections.Generic;
using UnityEngine;

// One-shot SFX + ambient pad, all synthesised in the prototype and baked to WAV.
// In capture mode events are logged (frame, name) so the trailer audio can be mixed offline.
public static class Sfx
{
    static readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
    static AudioSource[] pool;
    static int head;

    public static void Init()
    {
        foreach (var c in Resources.LoadAll<AudioClip>("Audio")) clips[c.name] = c;
        var go = new GameObject("Audio");
        go.AddComponent<AudioListener>();
        pool = new AudioSource[12];
        for (int i = 0; i < pool.Length; i++) { pool[i] = go.AddComponent<AudioSource>(); pool[i].playOnAwake = false; }
        music = go.AddComponent<AudioSource>();
    }

    static AudioSource music;
    static string musicName;
    public static void Music(string name)
    {
        var G = Game.I;
        if (G.capture) { G.sfxLog.Add(G.frameNo + " music:" + name + " 1"); return; }
        if (name == musicName) return;
        AudioClip c;
        if (!clips.TryGetValue(name, out c)) { if (!clips.TryGetValue("bgm", out c)) return; }
        musicName = name;
        music.clip = c; music.loop = true; music.volume = 0.55f; music.Play();
    }

    public static void Play(string name, float vol = 1f)
    {
        var G = Game.I;
        if (G.capture) { G.sfxLog.Add(G.frameNo + " " + name + " " + vol.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)); return; }
        AudioClip c;
        if (!clips.TryGetValue(name, out c)) return;
        var s = pool[head]; head = (head + 1) % pool.Length;
        s.PlayOneShot(c, vol);
    }
}
