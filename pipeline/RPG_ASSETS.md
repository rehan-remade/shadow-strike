# Shadow Strike RPG: asset contract

The Unity game (`unity/`, C# in `unity/Assets/Scripts`) loads everything baked by
`node pipeline/bake-run.mjs [outDir]` (default outDir = `unity/Assets/Resources`):
`Art/<name>.png`, `atlas.json` (sheet metadata), `Audio/<name>.wav`.

The game renders at **320x180** logical pixels (world units = pixels) with point filtering, so all art is
crisp pixel art in the Kingdom Two Crowns x MapleStory style of the existing assets. Colours come from the engine
palette (`C.*`, see `prototype/src/engine.js` PAL_DEF). You may add colours with `PAL.push('#hex'); C.name = PAL.length - 1;`
at the top of your file. Look at the existing baked art (ninja, King Shroom boss, dummy, bg_far) and match it:
chunky readable silhouettes, 1px dark `ink` outlines on characters (the `Grid().outline()` helper), dithered
gradients (`bay()`), no anti-aliasing.

## Hooks
- `pipeline/rpg-art.js` must define `window.RPG_ART = function (BK) { ... }`. It is called synchronously inside
  `pipeline/bake.js` after the base art. `BK = { Sheet, png, Grid, OUT, clearG, shroom, wav, renderSnd, NANIMS, setLegs, AV, S, P }`.
  - `BK.Sheet(name, w, h, cols, meta)` returns `{ add(srcCanvas, rx, ry), done() }`. Each `add` copies a w x h region
    of `srcCanvas` (default: the engine canvas `off`, 192x108) as one frame. Call `done()` once to emit the PNG and
    the atlas entry. `meta` keys are copied into atlas.json. The special keys are: `px`/`py` = the anchor (pivot) pixel,
    measured from the frame's top-left; `anims: {name: {fps, loop, frames:[indices]}}`; and `names: {key: frameIndex}`.
  - `BK.png(name, canvas)` emits a single image. Single images get their pivot set in C#.
  - `BK.Grid(w, h)` is an index grid with `set/get/outline()/toCanvas(white)`. `toCanvas(true)` renders a
    white-silhouette version, which you need for the `_white` hit-flash sheets.
  - Canvas helpers from the engine are global: `mk(w,h)`, `use(ctx)`, `px()`, `R()`, `line()`, `disc()`,
    `ellipse()`, `bay()`, `hash()`, `vnoise()`, `rng()`, `C`, `PAL`.
  - For frames bigger than 192x108, draw into your own `mk(w,h)` canvas and pass it as `srcCanvas` to `add()`.
- `pipeline/rpg-audio.js` must define `window.RPG_AUDIO = async function (BK) { return { name: base64Wav, ... } }`.
  Use `BK.wav(audioBuffer, loopXfadeSeconds?)` to encode an OfflineAudioContext result as a mono 44.1 kHz WAV
  (pass a crossfade length for seamless music loops). Use `BK.renderSnd(name, dur, a, b)` for engine `SND` entries.

Frame indices in `anims` and `names` count in `add()` order.

## Art (rpg-art.js)

### Tiles: sheet `tiles`, 8x8 frames, meta `names`
Surface rule: the foothold (walkable line) is the **top edge** of a `grass_*` / `plank_*` tile. Grass blades may
use the top 2 rows of the tile; nothing is drawn above the tile.
- `grass_l grass_m grass_m2 grass_r`: grass-topped earth (grass rows 0-2, dirt below). l/r are rounded ends.
- `dirt_l dirt_m dirt_m2 dirt_r`: earth fill for ground masses (stones, roots, darker with depth).
- `under_l under_m under_r`: the rounded underside of a floating grass platform, with hanging roots, and transparent below.
- `plank_l plank_m plank_r`: a wooden plank platform (top 4 rows), with transparent support posts/ropes below.
- `rope rope_top ladder ladder_top`: vertical climbables (rope about 2-3px wide and centred, ladder with 2 rails and a rung).

### Parallax backgrounds, one set per theme T in `town grove deep glade`
- `sky_T`: 320x180, opaque. A dithered dusk/night sky with stars and moon.
  town = the current purple dusk with a pale moon; grove = teal-green dusk; deep = dark blue night with a big moon; glade = a crimson blood-moon sky.
- `mtn_T`: 640x180, transparent, **tiles seamlessly horizontally** (x=0 matches x=640). Distant mountain ridge in the lower half.
- `far_T`: 640x180, transparent, seamless. Far pine treeline plus a fog band, bottom ~70px.
- `mid_T`: 640x180, transparent, seamless. Nearer, darker pines and bushes with gaps, bottom ~90px.
Layers are drawn bottom-aligned to the screen. Parallax factors are sky 0, mtn 0.1, far 0.25, mid 0.45.

### Props (single PNGs, pivot = bottom-left, except where a sheet says otherwise)
- `prop_hut` (~72x60): K2C wooden hut, thatched roof, warm lit window. `prop_hut2` (~64x56): a variant with a chimney.
- `prop_stall` (~56x44): market stall with a striped awning and potion bottles on the counter.
- `prop_fence` (16x10, tileable), `prop_sign` (~14x16), `prop_bush`, `prop_rock`, `prop_stump`, `prop_shrooms` (a decorative cluster of little mushrooms),
  `prop_pine_fg` (~40x120, a dark foreground pine for framing), `prop_crystal` (a glowing violet crystal for the deep woods).
- `prop_lamp`: sheet, 2 frames of 10x28, px/py at bottom centre. A lamp post with a flickering lantern.

### Portal: sheet `portal`
8 frames of 24x40, anims `{loop: fps 12}`, pivot at feet centre (px 12, py 39). A MapleStory-style swirling
blue-violet vortex with sparkles and a ground glow.

### NPCs (pivot at feet centre, bottom row)
- `npc_elder`: an old sage with a long white beard, green robe and a staff with a lantern. About 16x26 in a 24x32 frame.
- `npc_merchant`: a merchant woman with a headscarf and apron, holding a potion.
- anims: `idle` (4 frames, 5 fps, loop), `talk` (2 frames, 6 fps, loop).
- `portrait_elder`, `portrait_merchant`: 34x34 opaque framed busts for the dialog box.

### Monsters: sheet `mob_<id>` plus an identical-layout `mob_<id>_white` silhouette
Pivot at feet centre (bottom row). anims: `stand` (2 frames, 4 fps, loop), `move` (4 frames, 8 fps, loop), `hit`
(1 frame), `die` (4 frames, 10 fps, no loop: squash/burst then dithered fade, the last frame nearly empty).
- `mob_shellback` (~20x16): a snail with a spiral teal shell and a soft body with eye stalks. Lv1 critter.
- `mob_capling` (~18x20): a small orange-red spotted mushroom with a face; `move` is a hop cycle (squash, stretch, air, land). One of King Shroom's subjects.
- `mob_stumpy` (~26x28): an angry walking tree stump with root legs and a leafy tuft.
- `mob_wisp` (~16x20): a floating violet-blue lantern flame with a face; `move` is a bobbing loop.

### Items: sheet `items`, 10x10 frames, pivot bottom centre (px 5, py 9), meta `names`
`meso0 meso1 meso2 meso3` (spinning coin), `mesobag`, `potion_red`, `potion_blue`, `cap` (a capling cap, quest
item), `root` (a gnarled root, quest item), `star_steely`, `star_ilbi` (throwing-star icons), `crown` (boss trophy).

### Effects / UI
- `levelup`: 30 frames of 40x96, fps 30, no loop, pivot bottom centre (px 20, py 95). MapleStory's level-up: a golden light pillar bursting up from the feet, with rings and rising sparkles, then fading out.
- `marks`: 7x11 frames with names `bang0 bang1 q0 q1`. A gold "!" (quest available) and "?" (quest ready to turn in), 2-frame bob each.
- `icons2`: 14x14 frames (same style as the existing `icons` sheet, dark violet bg) with names `flash red blue lock`.
  `lock` is a padlock overlay drawn on a transparent bg.
- `logo`: single image of about 220x48, the "SHADOW STRIKE" title logo (gold/violet chunky pixel lettering plus a shuriken emblem).

## Audio (rpg-audio.js)
Mono 44.1 kHz WAVs. SFX should be short and punchy, in the style of the existing synth SFX (see the `SND` entries in `prototype/src/engine.js` and `prototype/src/skills/05-avenger.js`).
- SFX names: `levelup` (a MapleStory-style bright ascending fanfare arpeggio, about 1.5s), `pickup`, `meso` (coin clink),
  `potion` (bubbly gulp), `portal` (warp whoosh), `click`, `open` (dialog chime), `quest` (quest-complete jingle),
  `mobhit` (soft thwack), `mobdie` (squeaky poof), `hurt`, `unlock` (skill-unlock shimmer), `deny` (error buzz), `jump`, `rope`.
- Music loops (seamless, 20-40s, soft enough to sit under the SFX):
  `bgm_title` (dreamy, slow), `bgm_town` (a cosy major-key town theme with plucked arpeggios, pad and a gentle melody; MapleStory town feel),
  `bgm_field` (upbeat adventurous field theme with a bouncy bass and melody), `bgm_deep` (mysterious minor, sparse),
  `bgm_boss` (tense, driving drums and a bass ostinato).
  Render an exact number of bars at a fixed tempo so the loop point lands on a bar line, then crossfade the tail.
