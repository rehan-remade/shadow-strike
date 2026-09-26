# Shadow Strike: playable class asset contract

This extends `pipeline/RPG_ASSETS.md`: same pipeline, palette, style and helpers. Read that first. The game renders
at 320x180 and one pixel is one world unit. Everything is crisp pixel art with a 1px `ink` outline on characters,
matching the existing Night Lord (`ninja` sheet), mobs and King Shroom.

Each class is baked by its own file, `pipeline/rpg-class-<id>.js`, which defines
`window.RPG_CLASS_<ID> = function (BK) { ... }` (ID upper-case). `bake.js` calls every `window.RPG_CLASS_*` it finds,
right after `RPG_ART`, with the same `BK` helper object (`Sheet`, `png`, `Grid`, `OUT`, ...). Everything must be
self-contained in your file. The page only loads `prototype/src/engine.js` and `prototype/src/skills/05-avenger.js`, so any drawing code
you want from another prototype skill (`prototype/src/skills/0N-*.js`) must be **ported into your file**, not referenced.

Classes: `hero` (warrior, from `06-dragon.js`), `archmage` (magician, the blue robed mage from `02-blizzard.js`, which
also casts the fire meteor from `03-meteor.js`), `bishop` (from `04-genesis.js`), `bowmaster` (archer, from
`01-archer.html`; port the look: hooded green archer with a longbow).

## 1. Character sheet: `pc_<id>` plus `pc_<id>_ghost`
- Frame **48x40**. Anchor px **24**, py **37** (the feet row, measured from the top-left). Characters face **right**.
  The body is about 14–18 px wide and 20–26 px tall, the same scale as the Night Lord. There is headroom for hats,
  raised staffs and swords.
- `pc_<id>_ghost`: identical layout, recoloured to a pale violet silhouette (like the existing `ninja_ghost`). It is
  used for afterimages.
- Every frame also needs a **hand anchor**: pass `extra = [hx, hy]` to `sheet.add(src, rx, ry, extra)`, the hand pixel
  offset from the anchor in Unity coordinates (x right, y **up** from the feet row). This is the tip of the staff,
  bow or sword where projectiles spawn. After `done()`, move `extra` to `hands`, as `bake.js` does for the ninja:
  `A.hands = A.extra; delete A.extra;`.
- Required anims (`meta.anims = {name: {fps, loop, frames}}`):

  | anim | frames | notes |
  |---|---|---|
  | `idle` | 2–4, loop, ~6 fps | breathing |
  | `run` | 4, loop, ~12 fps | robes: bob and hem sway; hero/bowmaster: real leg cycle |
  | `jump` | 1 | |
  | `fall` | 1–2 | |
  | `jump2` | 2, no loop | double-jump / teleport / leap pose |
  | `attack` | 3–4, no loop, ~16 fps | basic attack (sword swing, staff thrust, bow shot) |
  | `cast` | 2, loop, ~8 fps | charging / channelling (staff raised, bow drawn, sword raised) |
  | `skill` | 2–3, no loop, ~12 fps | the big release pose |
  | `climb` | 4, loop, 8 fps | **back view** on a rope: hands alternate up, knees alternate (see `drawClimb` in `bake.js`) |
  | `crouch` | 1 | landing |
  | `hurt` | 1 | knocked back |

- `portrait_pc_<id>`: 34x34 opaque framed bust, same style as `portrait_elder`.
- `icons_<id>`: 14x14 frames, dark violet background like the existing `icons` sheet, meta `names` with
  `j k l u sp` (the basic attack, the three skills in key order J/K/L/U, and the mobility skill).

## 2. Skill effect sheets
All frames face **right** (the game flips them). The pivot is given as px/py (anchor pixel from the frame's top-left).
Use `meta.fps` and a single anim named `play` (`loop` as stated). Sizes are guidance: stay close, and report the exact
values.

**hero**
- `fx_hero_slash`: 48x40, pivot at the swing centre (24,20). Crescent sword arc, crimson with a white edge, 6 frames, 24 fps, no loop.
- `fx_hero_brandish`: 72x56, pivot (36,28). A much bigger double crescent (upper and lower sweep), 8 frames, 24 fps, no loop.
- `fx_hero_dragon`: 72x36, pivot at the head's centre-front (60,18). The spectral crimson dragon from `06-dragon.js`, flying right with a jaw that opens and closes and a waving body behind. 4 frames, 12 fps, loop.
- `fx_hero_rush`: 40x32, pivot (8,31). Bow-wave + speed streaks riding in front of the charging knight (Rush). 4 frames, 16 fps, loop.
- `fx_hero_slam`: 96x56, pivot at bottom centre (48,55). Worldreaver impact: flash, crimson dome, cracks, flying rocks. 10 frames, 24 fps, no loop.
- `fx_hero_quake`: 24x56, pivot at bottom centre (12,55). One erupting fissure spike; the game spawns a row of them outward. 10 frames, 24 fps, no loop.
- `pc_hero` extra anims: `rush` (2 frames, loop) and `slam` (overhead raise, then sword planted).

**archmage**
- `fx_mage_bolt`: 14x8, pivot (7,4). An ice shard projectile flying right with a sparkle trail. 2 frames, 12 fps, loop.
- `fx_mage_icestrike`: 64x48, pivot at bottom centre (32,47). Ice crystals erupting from the ground in a ring. 8 frames, 20 fps, no loop.
- `fx_mage_spear`: 10x22, pivot at the tip (5,21). A falling ice spear pointing down. 2 frames, 12 fps, loop.
- `fx_mage_circle`: 48x14, pivot (24,7). A flat ice magic circle, rotating. 4 frames, 10 fps, loop.
- `fx_mage_meteor`: 48x48, pivot at the rock's centre (32,32). A molten rock with a flaming tail streaming up and right (it falls down and left). 4 frames, 12 fps, loop.
- `fx_mage_boom`: 80x64, pivot at bottom centre (40,63). A big fire explosion dome with rings and debris. 10 frames, 20 fps, no loop.

**bishop**
- `fx_bishop_arrow`: 14x7, pivot (7,3). A holy light bolt flying right. 2 frames, 12 fps, loop.
- `fx_bishop_heal`: 56x56, pivot at bottom centre (28,55). A golden healing burst: rising sparkles and a cross flash around the caster. 10 frames, 20 fps, no loop.
- `fx_bishop_ray`: 40x16, pivot (20,8). The Angel Ray: a big radiant bolt with a trailing glow. 2 frames, 12 fps, loop.
- `fx_bishop_pillar`: 32x140, pivot at bottom centre (16,139). A holy light pillar slamming down, with angel wings at its top. It grows in, holds and collapses. 12 frames, 20 fps, no loop.

**bowmaster**
- `fx_bow_arrow`: 14x5, pivot (13,2) at the arrow tip. A normal arrow.
- `fx_bow_power`: 20x9, pivot (18,4). The charged gold power-shot arrow with a glow. 2 frames, 12 fps, loop.
- `fx_bow_bomb`: 48x40, pivot at bottom centre (24,39). An arrow-bomb explosion. 8 frames, 20 fps, no loop.
- `fx_bow_bombarrow`: 14x7, pivot (13,3). The bomb-tipped arrow in flight.

## 3. Rules
- ONLY create/edit your own `pipeline/rpg-class-<id>.js`. Other agents are writing the other classes in parallel.
- Preview by baking to your own scratch dir, and never to the Unity project:
  `node pipeline/bake-run.mjs /tmp/cls_<id>`.
  Then upscale and Read the PNGs.
- Deterministic: use `rng()`/`hash()`, never `Math.random`.
- If you add palette colours, push them to `PAL` (and `C.name`) at the top of your file, before the bake runs.
- Quality bar: the existing Night Lord animation sheets and prototype skills. The characters must read clearly at
  1x and match the prototype heroes the players have already seen.
