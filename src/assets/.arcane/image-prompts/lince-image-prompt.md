# Lince — Avatar Image Generation Prompt

**Character:** Lince, the Unmasker
**Namesake:** The lynx-eyed — *ojo de lince*; emblem of Galileo's Accademia dei Lincei (1603) — public domain
**Arcane Role:** QA Lead (qa-lead)
**Ethnicity:** Latino male (Mexican)

**Standing rule:** the name is never anglicized to "Lynx" — Lince, always.

---

## Image Generation Prompt

```
Photorealistic portrait of a sharp-eyed Latino male quality examiner.
Piercing amber eyes with a faint reflective glow — the lynx gaze that reads
through walls. Silver-streaked dark hair, composed skeptical expression.
Dark charcoal technical coat with a high tufted collar suggesting a lynx's
ruff, subtle green data-thread embroidery. Holds a glass vial of luminous
green testing reagent up to the light, examining it. Floating inspection
lenses and test matrices hover around him. Muted green-on-charcoal palette,
dark laboratory background. Cinematic lighting. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a sharp-eyed Latino male with amber eyes,
silver-streaked dark hair, dark charcoal coat with high tufted collar and
green data-thread embroidery, holding a glass vial of glowing green testing
reagent up to the light, floating inspection lenses around him, dark
laboratory background. Square 1:1 avatar.
```

## Character Notes

- **Build:** Lean, still, coiled attention — a watcher, not a bruiser
- **Skin:** Warm medium-brown; photorealistic texture, no smoothing
- **Eyes:** Amber, faintly reflective — the focal signature; nothing gets past them
- **Hair:** Dark with silver streaks, short and precise
- **Wardrobe:** Charcoal technical coat, high tufted ruff collar (feline suggestion, never a costume)
- **Signature element:** The reagent vial — testing as chemistry, defects precipitate
- **Expression:** Permanent mild skepticism; the reviewer four centuries before the pull request
- **Digital layer:** Floating lens rings and pass/fail matrices in muted green

## Palette

| Token      | Hex       | Usage                           |
| ---------- | --------- | ------------------------------- |
| Coat       | `#26292e` | Charcoal technical base         |
| Reagent    | `#3fd68f` | Vial glow, data threads         |
| Eyes       | `#d99a2b` | Amber lynx gaze                 |
| Silver     | `#b9bfc7` | Hair streaks, lens rims         |
| Background | `#0f1412` | Dark laboratory depths          |

## Negative Prompts

```
cat ears, animal face, fur suit, whiskers, wand, potion cauldron, cartoon,
anime, franchise emblems, chest insignia, black robes, greasy hair,
sneering villain, text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting; only the vial's green glow as accent from below-left. **1:1 square format.**

```
Sharp-eyed Latino male quality examiner portrait, chest-up tight crop, piercing amber eyes with faint reflective glow, silver-streaked dark hair, high tufted collar of charcoal technical coat with green data-thread embroidery, glass vial of glowing green reagent held at chest height casting soft green uplight, photorealistic warm medium-brown skin texture, no smoothing, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

In his examination hall — walls that read as translucent to him alone, code panels rendered as glass slabs he sees straight through, test matrices precipitating in vials on racks. The lynx of the Lincei, examining. **2:3 portrait tall — full body head to boots visible.**

```
Full-body character concept render, sharp-eyed Latino male examiner standing in a dark laboratory of translucent glass code panels, amber eyes glowing faintly, silver-streaked dark hair, long charcoal technical coat with tufted ruff collar and green data-thread embroidery, one hand raising a luminous green reagent vial, racks of test vials and floating pass/fail matrices around him, walls rendered semi-transparent as if his gaze passes through them, photorealistic skin texture, entire body visible from head to boots, muted green-on-charcoal palette, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The unmasking — a wide laboratory wall of glass code panels going transparent under his gaze, one panel flaring red where the defect hides. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, Latino male examiner in right third gazing across a vast wall of translucent code panels filling the frame, amber eyes blazing, one distant panel flaring red among green passes, reagent vial glowing in hand, volumetric green light shafts, atmospheric particles, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 180 cm** (Origin: Bottom) — presence by stillness, not size.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, no vial, no holograms, eyes without glow. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Lean Latino male, silver-streaked dark short hair, amber eyes without glow. Long charcoal technical coat with high tufted collar and subtle green thread embroidery, dark trousers, dark boots. No held objects, no effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; coat drape and collar ruff visible from behind.

### A-Pose Turnaround (alternate)

Same rules with arms at ~45° (A-pose), three separate images, if T-pose fails rigging or clips the coat.

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

- Celebration: `Agree_Gesture` (action_id: 25) — approval is the celebration
- Signature: `Idle_02` (action_id: 11) — the long, patient look
- Walk override: `default`

### Selection Rationale

Feline economy of motion; he moves when the evidence does.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
