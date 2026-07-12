# Lafayette — Avatar Image Generation Prompt

**Character:** Lafayette, the Conjuror
**Namesake:** The Great Lafayette (Sigmund Neuburger, 1871–1911), master of the quick-change — public domain
**Arcane Role:** Full-Stack Developer (fullstack-dev)
**Ethnicity:** White male (German-born)

---

## Image Generation Prompt

```
Photorealistic portrait of a sharp-featured White male quick-change
performer-engineer. Slicked dark hair, elegant waxed mustache, bright
theatrical confidence. Embroidered scarlet stage coat whose details are
mid-transformation — one lapel is a tailored engineer's collar with circuit
stitching, the other a designer's velvet, caught between costumes. Around
him hover role-masks rendered as holographic UI panels: API schema, database
diagram, frontend component — every part in the show, all his. A single
spotlight follows him. Rich scarlet and gold palette, dark stage background.
Cinematic lighting. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a sharp-featured White male performer with
slicked dark hair and waxed mustache, embroidered scarlet stage coat with
gold trim mid-costume-change, holographic panels of API schemas, database
diagrams and UI components floating around him, spotlight from above, dark
stage background. Square 1:1 avatar.
```

## Character Notes

- **Build:** Lean, athletic, theatrical posture — mid-transformation energy
- **Skin:** Fair; photorealistic texture, no smoothing
- **Hair:** Slicked dark hair, waxed mustache — music-hall headliner grooming
- **Wardrobe:** Scarlet embroidered stage coat, gold trim; costume details visibly shifting between roles
- **Signature element:** The quick-change — one figure, every part in the show
- **Expression:** Bright, confident, a showman's smile with a craftsman's eyes
- **Focal element:** The half-transformed coat
- **Digital layer:** Role-mask holograms — backend, frontend, data — orbiting like waiting costumes

## Palette

| Token      | Hex       | Usage                        |
| ---------- | --------- | ---------------------------- |
| Coat       | `#8f1d22` | Scarlet stage coat           |
| Gold       | `#d9a441` | Embroidery, trim, spotlight  |
| Hologram   | `#66d9e8` | Role-mask UI panels          |
| Hair       | `#231a15` | Slicked dark hair            |
| Background | `#141019` | Dark stage depths            |

## Negative Prompts

```
hammer, lightning, cape, armor, viking, blond, cartoon, anime,
franchise emblems, chest insignia, dog, fire, sad, text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting, subtle gold spotlight rim only. **1:1 square format.**

```
Sharp-featured White male quick-change performer portrait, chest-up tight crop, slicked dark hair, waxed mustache, confident showman smile, embroidered scarlet coat collar with gold trim showing two different costume textures mid-change, photorealistic skin texture, no smoothing, warm gold key light with cool rim, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

On a backstage-that-is-the-stack: wardrobe racks of holographic costumes labeled by layer — API coat, schema vest, UI gloves — as he strides between them mid-change, playing every part in his own show. **2:3 portrait tall — full body head to boots visible.**

```
Full-body character concept render, sharp-featured White male performer mid-stride through a backstage of holographic costume racks, each costume a glowing layer of the software stack — backend coat, database vest, frontend gloves — scarlet embroidered stage coat visibly transforming as he moves, slicked dark hair and waxed mustache, spotlight tracking him, photorealistic skin texture, entire body visible from head to polished boots, scarlet and gold palette with cyan holograms, golden-age music-hall poster energy, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The one-man company at showtime — five roles of the same figure blurring across the wide stage in sequential quick-change, resolving into the central bow. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, White male quick-change performer center stage with motion-blurred echoes of himself in different engineering costumes fanning left and right across the frame, scarlet and gold stage, holographic stack layers rising like scenery, volumetric spotlight shafts, atmospheric dust, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, golden-age lithograph poster energy, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 185 cm** (Origin: Bottom) — lean stage athlete.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, coat in single stable state, no holograms, no motion blur. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Sharp-featured White male, slicked dark hair, waxed mustache. Embroidered scarlet stage coat with gold trim in a single stable costume state, dark trousers, polished boots. No holograms, no motion effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; embroidered back panel visible.

### A-Pose Turnaround (alternate)

Same rules with arms at ~45° (A-pose), three separate images, if T-pose fails rigging at the shoulders.

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

- Celebration: `Victory_Cheer` (action_id: 59) — the full-company bow, solo
- Signature: `Big_Wave_Hello` (action_id: 28) — showman's entrance
- Walk override: `default`

### Selection Rationale

Theatrical energy in every idle; he is always on stage, in whichever costume.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
