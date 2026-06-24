# Gandalf — Avatar Image Generation Prompt

**Character:** Gandalf the Grey
**Universe:** Tolkien / Lord of the Rings
**Arcane Role:** CTO / Architecture Lead
**Ethnicity:** White male (elderly)

---

## Image Generation Prompt

```
Photorealistic portrait of a wise elderly White male tech-sorcerer. Silver-white
hair, long flowing beard — slightly imperfect, weathered, authentically aged.
Long dark coat with embedded circuit patterns and faintly glowing runes. One hand
rests on a high-tech staff that doubles as a glowing antenna-conductor. Holographic
architectural blueprints and system diagrams faintly floating around him. Distinguished,
ancient yet futuristic. Warm but commanding gaze — steady authority, not smiling.
Cinematic lighting with soft blue-white hologram glow. Realistic and cinematic,
absolutely NOT cartoonish or anime-styled. Dark background. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a distinguished elder architect-engineer with
silver-white hair and long beard. Circuit-patterned coat with glowing runes.
High-tech staff. Faint holographic blueprints floating nearby. Warm commanding
gaze. Cinematic lighting, dark background. Square 1:1 avatar.
```

## Character Notes

- **Age:** Visibly elderly — wrinkles, weathered face, authoritative gravitas
- **Hair:** Long flowing silver-white beard and hair — iconic silhouette
- **Coat:** Dark (charcoal/black) with embedded circuit-rune engravings — tech twist on robes
- **Staff:** Tall, high-tech, glowing blue-white at the tip — antenna-conductor hybrid
- **Expression:** Warm but commanding — "I have seen ten thousand architectures fall"
- **Focal element:** Glowing staff + holographic blueprints
- **Scale:** Bold silhouette reads at small sizes due to staff + beard outline

## Palette

| Token       | Hex       | Usage                      |
| ----------- | --------- | -------------------------- |
| Primary     | `#2d2d2d` | Dark coat                  |
| Rune glow   | `#60a5fa` | Circuit runes, staff light |
| Hair        | `#d1d5db` | Silver-white               |
| Gold accent | `#d4af37` | Warm hologram highlights   |
| Background  | `#1a1a2e` | Deep dark blue-black       |

## Negative Prompts

```
young, clean-shaven, short hair, colorful robes, white robes, cartoon, anime,
sword, hobbit, ring, casual attire, pointed hat, female, smiling, grinning,
sad, melancholy, sorrowful, frowning, grim, over-rendered CGI, plastic skin
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders only. Clean dark gradient background — consistent across all characters for portfolio cohesion. Even soft studio lighting, no dramatic shadows. No floating elements or holograms in background. Only subtle blue rune glow from circuit-carved coat edges close to the face. Focus purely on expression, face detail, and character identity. **1:1 square format — NOT landscape, NOT portrait tall.**

```
Wise elderly White male tech-sorcerer portrait, chest-up tight crop, silver-white hair, long natural beard, dark rune-engraved tech coat collar visible, staff partially visible at frame edge, photorealistic skin with visible pores, fine wrinkles, age spots, natural subsurface scattering, no skin smoothing, no beauty retouch, cool blue rim light with soft neutral key light, dark gradient background, subtle blue rune glow from coat edges near face, cinematic grounded realism, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

Character standing in a grand architectural hall, holographic system blueprints filling the air around him, staff casting blue light across floating architecture diagrams. Silver-white beard flowing, dark coat with circuit-rune engravings glowing. Wise commanding presence. Think: the scene where Gandalf is first introduced — you instantly understand he has seen systems rise and fall. **2:3 portrait tall format — full body head to boots visible, NOT landscape.**

```
Full-body character concept render, wise elderly White male tech-sorcerer standing in a grand architectural hall, silver-white hair, long natural beard, dark long coat with luminous circuit-rune engravings, high-tech staff held vertically casting blue light, holographic system blueprints floating around him, photorealistic skin with visible pores and natural age texture, no skin smoothing, entire body fully visible from head to boots, staff and hands fully in frame, clean readable silhouette, balanced key fill and rim lighting, medium depth of field, realistic fabric folds and metallic accents, 2:3 portrait tall format, no text, no watermark.
```

### Hero Shot — Cinematic Frame (16:9 widescreen landscape)

Dramatic low-angle or 3/4 angle composition. Staff blazing with blue-white light, holographic blueprints swirling in an architectural vortex around him. Volumetric god rays, lens flares, particle effects. Shallow depth of field with cinematic bokeh. Color graded like a $200M epic production. Movie poster quality composition without text. Ultra-dramatic. **16:9 widescreen landscape format — wide cinematic frame, NOT square, NOT portrait.**

```
Epic horizontal landscape hero shot, 16:9 widescreen cinematic composition, wise elder tech-sorcerer in a grand futuristic arcane architecture hall, character positioned in left third with environment filling full width, silver-white hair and long beard moving in energy wind, dark coat with glowing blue circuit-rune engravings, staff blazing intense blue-white arcane light, large holographic blueprints and system diagrams projected across the scene, volumetric god rays, atmospheric particles, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, full scene depth from foreground to far background, no portrait crop, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 190 cm** (Origin: Bottom) — tall elder, distinguished and upright. Authority without bulk.

Generate as **three separate individual images** in the same session for maximum resolution and hand detail. Plain neutral gray background (#808080) on all three. Flat even studio lighting, no directional shadows on all three. **Arms must be fully extended from shoulder to fingertips — hands and fingertips completely in frame, nothing cropped at the image edge.** Used as Meshy 3D multi-view input.

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Wise elderly White male tech-sorcerer. Silver-white hair, long flowing beard. Dark coat with circuit-pattern rune engravings, gold accent trim on edges. No staff, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side:**

```
Full body right-side view, T-pose — arms extended horizontally, legs shoulder-width apart. Wise elderly White male tech-sorcerer. Silver-white hair, long flowing beard. Dark coat with circuit-pattern rune engravings, gold accent trim on edges. No staff, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Strict 90-degree side profile — camera directly perpendicular to character's right side, character facing directly left of frame, zero diagonal angle, zero perspective twist, absolutely no 3/4 rotation. 3D model reference sheet.
```

**T-Pose Back:**

```
Full body back view, T-pose — arms extended horizontally, legs shoulder-width apart. Wise elderly White male tech-sorcerer. Silver-white hair, long flowing beard visible from behind. Dark coat with circuit-pattern rune engravings across back, gold accent trim on edges. No staff, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly away from camera. 3D model reference sheet.
```

### A-Pose Turnaround (Meshy 3D pipeline — alternate)

Same rules as T-Pose but with arms at ~45° from body (A-pose). Use if T-pose consistently fails rigging at shoulders or clips hands. **Three separate images, same session, gray background, flat lighting.**

**A-Pose Front:**

```
Full body front view, A-pose — arms angled 45 degrees from body, legs shoulder-width apart. Wise elderly White male tech-sorcerer. Silver-white hair, long flowing beard. Dark coat with circuit-pattern rune engravings, gold accent trim on edges. No staff, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms at 45 degrees with hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**A-Pose Right Side:**

```
Full body right-side view, A-pose — arms angled 45 degrees from body, legs shoulder-width apart. Wise elderly White male tech-sorcerer. Silver-white hair, long flowing beard. Dark coat with circuit-pattern rune engravings, gold accent trim on edges. No staff, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms at 45 degrees with hands and fingertips completely in frame, not cropped. Strict 90-degree side profile — camera directly perpendicular to character's right side, character facing directly left of frame, zero diagonal angle, zero perspective twist, absolutely no 3/4 rotation. 3D model reference sheet.
```

**A-Pose Back:**

```
Full body back view, A-pose — arms angled 45 degrees from body, legs shoulder-width apart. Wise elderly White male tech-sorcerer. Silver-white hair, long flowing beard visible from behind. Dark coat with circuit-pattern rune engravings across back, gold accent trim on edges. No staff, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms at 45 degrees with hands and fingertips completely in frame, not cropped. Facing directly away from camera. 3D model reference sheet.
```

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

- Celebration: `Formal_Bow` (action_id: 41)
- Signature: `Charged_Spell_Cast` (action_id: 125)
- Walk override: `Thoughtful_Walk` (action_id: 121)

### Selection Rationale

Architect sage cadence and ritual casting presence.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
