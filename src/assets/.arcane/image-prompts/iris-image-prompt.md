# Iris — Avatar Image Generation Prompt

**Character:** Iris, the Emissary
**Namesake:** Iris, Greek goddess of the rainbow, messenger between gods and mortals — public domain
**Arcane Role:** External Collaboration Lead (collaborator)
**Ethnicity:** Greek female (Mediterranean); luminous, faintly otherworldly

---

## Image Generation Prompt

```
Photorealistic portrait of a radiant Mediterranean woman, the rainbow
messenger as external liaison. Dark hair in fine braids with subtle
iridescent sheen, calm diplomatic warmth. Flowing prismatic mantle that
refracts light into a soft spectrum trail — a rainbow as a data-stream
bridging two glowing team emblems of abstract geometry at either edge of
frame. A sealed scroll in one hand, wax seal glowing. Small winged accents
at the sandal straps. Soft spectrum accents over slate. Cinematic lighting,
dark background. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a radiant Mediterranean woman with fine dark
braids with iridescent sheen, flowing prismatic mantle refracting a soft
rainbow data-stream between two abstract glowing emblems, sealed scroll in
hand, winged sandal accents, dark background. Square 1:1 avatar.
```

## Character Notes

- **Build:** Light, swift, graceful — built for the road between
- **Skin:** Warm olive with a faint luminous quality; photorealistic texture
- **Hair:** Fine dark braids, iridescent sheen — the rainbow carried personally
- **Wardrobe:** Prismatic flowing mantle over practical travel wear; winged sandal accents
- **Signature element:** The sealed scroll — every message arrives intact and receipted
- **Expression:** Diplomatic warmth with precision; nothing lost in translation
- **Focal element:** The rainbow data-stream bridging two parties
- **Digital layer:** Abstract team emblems (pure geometry, never real logos) linked by her arc

## Palette

| Token      | Hex       | Usage                            |
| ---------- | --------- | -------------------------------- |
| Mantle     | `#454a5c` | Slate travel base                |
| Spectrum   | `#c9a7e8` | Prismatic refraction (soft)      |
| Bridge     | `#7fd1e8` | Data-stream arc                  |
| Seal       | `#d4af37` | Scroll wax, sandal wings         |
| Background | `#12141c` | Dark sky depths                  |

## Negative Prompts

```
neon rainbow saturation, pride flag literal, harsh color bands, angel wings
on back, halo, cartoon, anime, franchise emblems, real company logos,
chest insignia, text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting; faint prismatic edge-light only. **1:1 square format.**

```
Radiant Mediterranean woman emissary portrait, chest-up tight crop, fine dark braids with subtle iridescent sheen, calm diplomatic warm expression, prismatic mantle collar refracting a faint soft spectrum at the edges, photorealistic warm olive skin with faint luminosity, no smoothing, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

Mid-stride on an arc of light spanning two floating team spaces — one styled as a workshop, one as a boardroom — her rainbow bridge carrying documents both ways, the sealed scroll in hand. **2:3 portrait tall — full body head to sandals visible.**

```
Full-body character concept render, radiant Mediterranean woman walking a glowing arc of soft spectrum light spanning two floating platforms — an engineering workshop on one side, a boardroom on the other — prismatic mantle streaming, sealed scroll in hand, winged sandals catching the light, document glyphs traveling the arc in both directions, photorealistic skin texture, entire body visible from head to sandals, soft spectrum over slate palette, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The rainbow at full span — a wide sky panorama, her arc of light bridging distant cities of collaboration, the messenger a bright point at its crest. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, vast night-sky panorama with a soft spectrum arc of light spanning the full frame between two distant glowing skylines, Mediterranean woman emissary at the crest of the arc in flowing prismatic mantle, document glyphs streaming along the bridge, volumetric light, atmospheric clouds, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 172 cm** (Origin: Bottom) — light traveler's frame.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, no arc, no glyphs, mantle in stable drape. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Radiant Mediterranean woman, fine dark braids. Slate travel wear with prismatic mantle in stable inactive drape, winged sandal accents without glow. No scroll, no held objects, no light effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; mantle drape from behind.

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

- Celebration: `Big_Wave_Hello` (action_id: 28) — greeting both shores
- Signature: `Casual_Walk` (action_id: 30) — always between
- Walk override: `default`

### Selection Rationale

The liaison is defined by graceful transit; she is most herself en route.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
