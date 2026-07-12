# Adelaide — Avatar Image Generation Prompt

**Character:** Adelaide, the Illusionist
**Namesake:** Adelaide Herrmann (1853–1932), Queen of Magic — public domain
**Arcane Role:** Frontend Developer (frontend-dev)
**Ethnicity:** White female (British-born)

---

## Image Generation Prompt

```
Photorealistic portrait of a poised White female grand-stage illusionist.
Silver-streaked auburn hair swept up in a belle-époque style. High-collared
stage gown in deep plum threaded with fine luminous circuitry that reads as
embroidery until it glows. She conjures a floating user interface the way a
magician produces doves from a silk scarf — translucent UI panels blooming
elegantly from a gesture of one gloved hand. Composed, unshakable grace: she
performed the bullet catch and took the bow. Plum, silver and soft gold
palette. Grand theatre background, cinematic lighting. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a poised White female illusionist with
silver-streaked auburn hair swept up, high-collared deep plum stage gown
with fine glowing circuitry embroidery, translucent interface panels
blooming from her gloved hand like doves from a scarf, grand theatre
background, cinematic lighting. Square 1:1 avatar.
```

## Character Notes

- **Build:** Elegant, upright stage bearing; command through composure
- **Skin:** Fair; photorealistic texture with natural age grace, no smoothing
- **Hair:** Auburn with silver streaks, swept up — the Queen of Magic, mid-career and in charge
- **Wardrobe:** Belle-époque high-collared gown, plum with luminous circuit embroidery; silk gloves
- **Signature element:** UI panels produced like stage doves — the grand stage picture is the interface
- **Expression:** Serene certainty; grace under literal fire
- **Focal element:** The blooming interface at her fingertips
- **Digital layer:** Stage-light bokeh that resolves into design-grid guides

## Palette

| Token      | Hex       | Usage                          |
| ---------- | --------- | ------------------------------ |
| Gown       | `#4b2545` | Deep plum base                 |
| Circuit    | `#e3c46b` | Luminous embroidery, soft gold |
| Panels     | `#9fd4e8` | Translucent UI blooms          |
| Hair       | `#7a4a35` | Auburn with silver streaks     |
| Background | `#171020` | Grand theatre darkness         |

## Negative Prompts

```
wings, insect motif, powered armor, spandex costume, young ingenue, cartoon,
anime, franchise emblems, chest insignia, rifle, gun, sad, fragile,
text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting; soft gold glow from the collar circuitry only. **1:1 square format.**

```
Poised White female grand-stage illusionist portrait, chest-up tight crop, silver-streaked auburn hair swept up, serene certain expression, high plum collar with fine glowing gold circuit embroidery, soft gold uplight from collar, photorealistic skin texture, no smoothing, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

Center stage of a grand theatre, the full stage picture hers: translucent interface panels rising like scenery, layout grids as limelight beams — the part of the show the audience actually sees, staged to perfection. **2:3 portrait tall — full body head to shoes visible.**

```
Full-body character concept render, poised White female illusionist center stage in a grand gilded theatre, high-collared deep plum gown with luminous circuit embroidery, gloved hands raised mid-flourish releasing translucent UI panels that flutter upward like doves, design-grid limelight beams crossing the stage, photorealistic skin texture, entire body visible from head to heeled shoes, plum-silver-gold palette, golden-age poster composition, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The bullet catch, restaged for software: she stands unflinching as a breaking change streaks toward her in light, caught in a gloved hand before a gasping holographic audience. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, White female illusionist standing unflinching in right third of a grand theatre stage, one gloved hand catching a streak of red light mid-air, translucent interface scenery towering across the frame, holographic audience silhouettes below, volumetric limelight shafts, atmospheric dust, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, golden-age lithograph poster energy, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 175 cm** (Origin: Bottom) — elegant stage presence.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, no panels, no glow, gown in stable state. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Poised White female, silver-streaked auburn hair swept up. High-collared deep plum stage gown with fine gold embroidery in inactive state, silk gloves, heeled shoes visible under hem. No holograms, no effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; gown train and back embroidery visible.

### A-Pose Turnaround (alternate)

Same rules with arms at ~45° (A-pose), three separate images, if T-pose fails rigging or clips the gown sleeves.

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

- Celebration: `Victory_Cheer` (action_id: 59) — the earned bow
- Signature: `Big_Wave_Hello` (action_id: 28) — the stage flourish
- Walk override: `default`

### Selection Rationale

Every motion is staged; the audience sees exactly what she intends, nothing else.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
