# Circe — Avatar Image Generation Prompt

**Character:** Circe, the Charmweaver
**Namesake:** Circe, Homer's *Odyssey* — the original enchantress; public domain
**Arcane Role:** Marketing Strategist (marketing-strategist)
**Ethnicity:** Greek female (Mediterranean)

**Repaint note (mandatory):** no red hex-swirl energy of any kind — the prior
scarlet chaos-magic motif is retired. Her magic is woven and poured, never
sparked.

---

## Image Generation Prompt

```
Photorealistic portrait of a regal Greek woman, the original enchantress as
brand strategist. Dark hair in long braids threaded with gold, sea-green
eyes, composed knowing half-smile. Deep emerald mantle woven with living
island flora that resolves into flowing campaign threads on a loom beside
her. A golden cup in one hand, its shimmer rising as narrative ribbons of
soft light carrying story imagery — never red, never hexagonal. An island
workshop of herbs and looms behind her. Emerald, gold and sea-glass
palette. Cinematic lighting, dark background. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a regal Greek woman with long dark braids
threaded with gold, sea-green eyes, deep emerald woven mantle, golden cup
in one hand with ribbons of soft light rising from it, glowing loom of
campaign threads beside her, island workshop background. Square 1:1 avatar.
```

## Character Notes

- **Build:** Regal, composed; a sovereign of her own island
- **Skin:** Warm olive; photorealistic texture, no smoothing
- **Hair:** Long dark braids with gold thread
- **Wardrobe:** Emerald woven mantle, botanical patterns alive at the hem
- **Signature elements:** The golden cup and the loom — Homeric props, honestly borrowed
- **Expression:** Knowing half-smile; she can see what the story does to you
- **Focal element:** Narrative light-ribbons rising from the cup
- **Forbidden motif:** red hex-swirl energy, scarlet tendrils — retired permanently

## Palette

| Token      | Hex       | Usage                             |
| ---------- | --------- | --------------------------------- |
| Mantle     | `#1e5c46` | Deep emerald weave                |
| Gold       | `#cfa24a` | Braids thread, cup, loom frame    |
| Ribbon     | `#8fd8c4` | Sea-glass narrative light         |
| Flora      | `#5a8a4a` | Living botanical patterns         |
| Background | `#101713` | Island workshop darkness          |

## Negative Prompts

```
red energy, scarlet tendrils, hex swirl, hexagons, chaos magic, witch hat,
crown of horns, pigs, cartoon, anime, franchise emblems, chest insignia,
villainous sneer, text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting; soft sea-glass shimmer from the cup out of frame. **1:1 square format.**

```
Regal Greek woman enchantress portrait, chest-up tight crop, long dark braids threaded with gold, sea-green eyes, knowing half-smile, deep emerald woven mantle collar with living botanical pattern, soft sea-glass light rising from below, photorealistic warm olive skin texture, no smoothing, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

In her island workshop — the loom weaving campaign threads into a tapestry of story imagery, herb shelves as an apothecary of brand voice, the cup pouring a launch. **2:3 portrait tall — full body head to sandals visible.**

```
Full-body character concept render, regal Greek woman standing at a great loom in an island workshop, deep emerald mantle flowing, long gold-threaded braids, one hand raising a golden cup releasing ribbons of sea-glass light, the loom weaving those ribbons into a glowing tapestry of story imagery, shelves of glowing herb jars behind her, photorealistic skin texture, entire body visible from head to sandals, emerald and gold palette, cinematic lighting, 2:3 portrait tall format, no text, no watermark, no red energy, no hexagonal motifs.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The island at dusk — her tapestry of narrative light unfurling from the loom across the full frame, ships on the horizon turning toward it. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, Greek enchantress in left third at her loom on an island terrace at dusk, vast tapestry of sea-glass narrative light unfurling across the frame, distant ships turning toward the glow on the horizon, volumetric golden-hour light, atmospheric haze, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, 16:9 landscape format, no text, no watermark, no red energy, no hexagonal motifs.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 177 cm** (Origin: Bottom) — sovereign bearing.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, no cup, no ribbons, mantle patterns inactive. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Regal Greek woman, long dark braids threaded with gold. Deep emerald woven mantle over a practical tunic, botanical patterns inactive with no glow, flat sandals. No cup, no held objects, no light effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; mantle drape and braids visible from behind.

### A-Pose Turnaround (alternate)

Same rules with arms at ~45° (A-pose), three separate images, if T-pose fails rigging or clips the mantle.

---

## Animations

### Shared Base Set (all agents)

- `Idle` (action_id: 0)
- `Casual_Walk` (action_id: 30)
- `Run_02` (action_id: 14)
- `Agree_Gesture` (action_id: 25)
- `Idle_02` (action_id: 11)
- `Talk_Passionately` (action_id: 308)
- `Big_Wave_Hello` (action_id: 28)
- `Victory_Cheer` (action_id: 59)
- `Confused_Scratch` (action_id: 36)

### Character-Specific Picks (Meshy)

- Celebration: `Victory_Cheer` (action_id: 59) — the campaign landed
- Signature: `Talk_Passionately` (action_id: 308) — telling the story
- Walk override: `default`

### Selection Rationale

Allure through composure; she persuades a room by owning it quietly.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
