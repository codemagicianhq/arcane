# Custodio — Avatar Image Generation Prompt

**Character:** Custodio, the Warden
**Namesake:** *Ángel custodio* — the guardian angel; protection, not surveillance — public domain
**Arcane Role:** Security Operations (security-ops)
**Ethnicity:** Latino male (Mexican)

---

## Image Generation Prompt

```
Photorealistic portrait of a tall, imposing Latino male warden-angel of the
perimeter. Calm watchful face, close-cropped dark hair, quiet certainty
rather than menace. Dark angelic armor with folded bronze-feathered wings —
architectural, sculptural feathers, not fantasy-soft. A ring of golden
sigil-keys orbits slowly above his shoulders like a working halo, each key
a granted access. One hand open at his side: a gate ready to open, not a
fist. Bronze, deep umber and candle-gold palette. Dark threshold background
with a single warm doorway of light behind him. Cinematic lighting. Square
1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a tall imposing Latino male in dark sculptural
armor with folded bronze-feathered wings, ring of golden sigil-keys
orbiting above his shoulders, calm watchful expression, warm doorway of
light behind him in the darkness. Square 1:1 avatar.
```

## Character Notes

- **Build:** Tallest of the roster; presence that ends arguments before they start
- **Skin:** Warm brown; photorealistic texture, no smoothing
- **Hair:** Close-cropped, dark
- **Wardrobe:** Dark sculptural angel-armor, bronze feather-plates; no horns, no visor
- **Signature element:** The halo of keys — protection as granted access, logged and orbiting
- **Expression:** Calm, final, kind — he watches over, not just watches
- **Focal element:** The warm doorway he guards; the open hand
- **Digital layer:** Faint golden ward-lines tracing the threshold, not a surveillance grid

## Palette

| Token      | Hex       | Usage                          |
| ---------- | --------- | ------------------------------ |
| Armor      | `#221c18` | Deep umber sculptural base     |
| Bronze     | `#a86f2f` | Feather-plates, key ring       |
| Halo       | `#e8c46a` | Sigil-keys, ward-lines         |
| Doorway    | `#f0d9a8` | The warm guarded threshold     |
| Background | `#0e0b09` | Threshold darkness             |

## Negative Prompts

```
horned helm, glowing visor, orange eyes, surveillance cameras, sword raised
in threat, halo disc literal, white feathered wings, cartoon, anime,
franchise emblems, chest insignia, menacing snarl, text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting; soft gold key-light from the orbiting sigils only. **1:1 square format.**

```
Tall imposing Latino male warden portrait, chest-up tight crop, close-cropped dark hair, calm watchful kind expression, dark sculptural armor collar with bronze feather-plate shoulders, two golden sigil-keys drifting at the frame edge casting warm uplight, photorealistic warm brown skin texture, no smoothing, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

At the threshold he keeps — a great door of warm light in a dark hall, ward-lines across the floor, the halo of keys orbiting; wings folded because nothing has required them yet. **2:3 portrait tall — full body head to boots visible.**

```
Full-body character concept render, tall imposing Latino male warden standing before a great doorway of warm light in a dark stone hall, dark sculptural armor with folded bronze-feathered wings, ring of golden sigil-keys orbiting above his shoulders, faint golden ward-lines tracing the floor threshold, one hand open at his side, calm watchful authority, photorealistic skin texture, entire body visible from head to boots, bronze and candle-gold on umber palette, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The gate held — a vast dark hall panorama, the doorway of light at center, his winged silhouette before it, ward-lines lighting across the full floor as something unseen tests the perimeter. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, vast dark hall with a single doorway of warm light at center, tall winged warden silhouette standing before it, golden ward-lines flaring across the full width of the stone floor, halo of sigil-keys blazing above his shoulders, wings beginning to unfold, volumetric golden light shafts, atmospheric dust, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 210 cm** (Origin: Bottom) — tallest of the roster; the wings add silhouette, not chaos.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, wings folded tight, no keys, no ward-lines, no glow. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Tall imposing Latino male, close-cropped dark hair. Dark sculptural full-body armor with bronze feather-plate detailing, wings folded tightly behind the shoulders and visible only at the silhouette edges, armored boots. No keys, no held objects, no effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; folded wing structure and back-plate detail fully visible from behind.

### A-Pose Turnaround (alternate)

Same rules with arms at ~45° (A-pose), three separate images, if T-pose fails rigging at the shoulders or the wings clip the extended arms.

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

- Celebration: `Agree_Gesture` (action_id: 25) — the gate held
- Signature: `Alert` (action_id: 2) — the warden's stance
- Walk override: `default`

### Selection Rationale

Warden stillness: protection reads as presence at the threshold, never as pursuit.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
