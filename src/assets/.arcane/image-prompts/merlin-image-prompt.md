# Merlin — Avatar Image Generation Prompt

**Character:** Merlin, the Archmage
**Namesake:** Merlin of Arthurian legend (Geoffrey of Monmouth, 12th c.) — public domain
**Arcane Role:** CTO / Architecture Lead (architecture-lead)
**Ethnicity:** White male (Welsh)

---

## Image Generation Prompt

```
Photorealistic portrait of a wise elderly White male archmage architect.
Long silver hair and full natural beard, deep-set perceptive eyes. Layered
midnight-blue druidic robes engraved with luminous knotwork circuit patterns
— Celtic interlace that resolves into circuit traces on close look. Holds a
gnarled oak staff crowned with a softly glowing blue crystal. Holographic
system blueprints and dependency graphs float around him like prophecy.
Ancient standing stones fused with server monoliths in the background. Cool
blue rim light, dark background. Cinematic grounded realism. Square 1:1
avatar.
```

## Safe Version

```
Photorealistic portrait of a wise elderly White male with long silver hair
and full beard, layered midnight-blue robes with glowing knotwork circuit
engravings, oak staff with glowing blue crystal, holographic blueprints
floating nearby. Cool blue lighting, dark background. Square 1:1 avatar.
```

## Character Notes

- **Build:** Tall, slightly weathered; carries centuries lightly
- **Skin:** Fair, weathered; visible pores, fine wrinkles, no smoothing
- **Hair:** Long silver hair, full natural beard — the archetype, owned outright
- **Wardrobe:** Midnight-blue layered robes; Celtic knotwork that is literally circuitry
- **Signature element:** Oak staff with blue crystal — grown, not manufactured
- **Expression:** Deep-set eyes that have already reviewed your design
- **Focal element:** Knotwork circuit engravings glowing along robe seams
- **Digital layer:** Floating architecture blueprints rendered like illuminated manuscripts

## Palette

| Token      | Hex       | Usage                            |
| ---------- | --------- | -------------------------------- |
| Robes      | `#1b2440` | Midnight-blue base               |
| Rune glow  | `#5aa7e8` | Knotwork circuitry, crystal      |
| Silver     | `#cfd4dc` | Hair, beard, trim                |
| Oak        | `#5c4632` | Staff wood                       |
| Background | `#0d1117` | Dark stone-and-server depths     |

## Negative Prompts

```
pointed hat, grey pilgrim cloak, ring, sword, young, cartoon, anime,
franchise emblems, chest insignia, sad, frail, hunched, text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting, subtle blue glow from robe engravings only. **1:1 square format.**

```
Wise elderly White male archmage portrait, chest-up tight crop, long silver hair and full natural beard, midnight-blue robe collar with glowing knotwork circuit engravings, photorealistic skin with visible pores and fine wrinkles, no skin smoothing, cool blue rim light with soft neutral key light, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

Standing in a hall where standing stones and server monoliths share foundations — the architect reading blueprints that hang in the air like prophecies. He diagnosed the dragons under the tower's foundation once; he will find yours. **2:3 portrait tall — full body head to boots visible.**

```
Full-body character concept render, wise elderly White male archmage standing in a grand hall of ancient standing stones fused with dark server monoliths, long silver hair and beard, layered midnight-blue robes with luminous knotwork circuit engravings, oak staff crowned with glowing blue crystal held vertically, holographic system blueprints and dependency graphs floating around him like illuminated prophecy, photorealistic skin with natural age texture, entire body visible from head to boots, clean readable silhouette, cool blue palette with silver accents, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The returned first architect at full power — golden-age poster drama in blue and silver. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, elderly White male archmage in a vast hall of standing stones and server monoliths, character in left third with environment filling full width, silver hair and beard moving in energy wind, midnight-blue robes with blazing knotwork circuitry, oak staff crystal erupting blue-white light, architecture diagrams projected across the full scene, volumetric god rays, atmospheric particles, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 200 cm** (Origin: Bottom) — the tall counsel at the king's shoulder.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, no staff, no holograms, no glow effects. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Wise elderly White male, long silver hair, full flowing beard. Layered midnight-blue robes with knotwork circuit engravings, silver trim on edges, plain boots visible under robe hem. No staff, no held objects, hands open with fingers relaxed, engravings inactive with no glow. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; knotwork engravings across the back panel.

### A-Pose Turnaround (alternate)

Same rules with arms at ~45° (A-pose), three separate images, if T-pose fails rigging or clips the robe sleeves.

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

- Celebration: `Agree_Gesture` (action_id: 25) — a nod is enough
- Signature: `Idle_02` (action_id: 11) — watching, weighing
- Walk override: `default`

### Selection Rationale

Stillness as authority; the archmage moves last and least.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
