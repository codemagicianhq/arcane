# Kellar — Avatar Image Generation Prompt

**Character:** Kellar, the Maestro
**Namesake:** Harry Kellar (1849–1922), Dean of American Magicians — public domain
**Arcane Role:** Product Operations Manager (orchestrator)
**Ethnicity:** White male (German-American)

---

## Image Generation Prompt

```
Photorealistic portrait of a distinguished older White male stage director of
magic. Bald crown with neat white hair at the temples, clean-shaven, warm
knowing smile with commanding calm. Formal black evening tailcoat with white
tie in the golden-age stage tradition, modernized with a thin amber circuit
trim along the lapels. Two small holographic imp silhouettes perched at his
shoulders like living poster art. One hand raised as if calling the next cue;
floating amber task cards and timeline arcs orbit at his gesture. Deep crimson
theatre-curtain background with dark navy shadows. Cinematic lighting,
golden-age lithograph poster energy. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a distinguished older White male in formal black
evening tailcoat with white tie, bald crown with white temple hair, warm
commanding smile. Amber holographic task cards and timeline arcs floating at
his raised hand. Small glowing imp silhouettes at his shoulders. Deep crimson
curtain background. Cinematic lighting. Square 1:1 avatar.
```

## Character Notes

- **Build:** Upright, poised — a director's posture, never hurried
- **Skin:** Fair with warm age lines; photorealistic texture, no smoothing
- **Hair:** Bald crown, neat white side hair — the classic Kellar silhouette
- **Wardrobe:** Black evening tailcoat, white tie; thin amber circuit trim
- **Signature element:** The shoulder imps — Kellar's own poster devils, reborn as helpful process daemons
- **Expression:** Warm authority; the dean who runs the whole show from the wings
- **Focal element:** Raised conductor's hand with orbiting task cards
- **Digital layer:** Amber timeline arcs and sprint boards projected mid-air

## Palette

| Token      | Hex       | Usage                          |
| ---------- | --------- | ------------------------------ |
| Tailcoat   | `#101014` | Black formal base              |
| Amber      | `#e8a530` | Imps, circuit trim, task cards |
| Curtain    | `#6d1a2b` | Deep crimson background        |
| Shirt      | `#f2ede4` | White tie and shirt front      |
| Background | `#141b2b` | Dark navy shadow               |

## Negative Prompts

```
young, beard, wand, top hat oversized, cartoon, anime, robot body,
franchise emblems, chest insignia, cape, sad, sinister, sneering,
text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders only. Clean dark gradient background — consistent across all characters for portfolio cohesion. Even soft studio lighting. Only a subtle amber glow from the shoulder imps. **1:1 square format.**

```
Distinguished older White male magic-director portrait, chest-up tight crop, bald crown with white temple hair, warm commanding smile, black evening tailcoat with white tie and thin amber circuit trim on lapels, two tiny glowing imp silhouettes perched at his shoulders casting soft amber uplight, photorealistic skin with natural age texture, no skin smoothing, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

Standing at the center of his command theatre — an operations stage where sprint boards, work queues, and roadmap timelines hang like scenery flats, all summoned by his raised hand. The golden-age lithograph poster tradition, drawn as if he headlines the Wonder Show of software. **2:3 portrait tall — full body head to shoes visible.**

```
Full-body character concept render, distinguished older White male stage director standing center stage in a grand theatre of floating amber operations boards, black evening tailcoat with white tie, bald crown with white temple hair, one hand raised calling the next cue, two small glowing imp silhouettes hovering at his shoulders, sprint boards and timeline arcs hanging like theatre scenery around him, deep crimson curtains and dark navy depths, photorealistic skin with natural age texture, entire body fully visible from head to polished shoes, golden-age magic poster composition, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

Dramatic wide composition in the heroic stone-lithograph tradition — the maestro commanding the full stage, amber light flooding the proscenium. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, distinguished older White male stage director commanding a vast theatre stage, positioned in left third with the operations stage filling the frame, black tailcoat, raised hand conducting cascades of amber task cards and timeline arcs, imp silhouettes wheeling above the proscenium, deep crimson curtains, volumetric golden light rays, atmospheric dust, lens bloom, blockbuster film-grade color grading, golden-age lithograph poster energy, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 195 cm** (Origin: Bottom) — commanding but human; authority carried in posture, not mass.

Generate as **three separate individual images** (front, right side, back) in the same session. Plain neutral gray background (#808080), flat even studio lighting, no directional shadows, no energy effects, no imps. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Distinguished older White male, bald crown with white temple hair, clean-shaven. Black evening tailcoat with white tie, thin amber trim on lapels, black formal trousers and polished shoes. No holograms, no imps, no energy effects. Hands open, fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view respectively; tailcoat drape visible from behind.

### A-Pose Turnaround (alternate)

Same rules as T-pose with arms at ~45° (A-pose), three separate images, if T-pose fails rigging at the shoulders.

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

- Celebration: `Victory_Cheer` (action_id: 59)
- Signature: `Talk_Passionately` (action_id: 308) — calling the show
- Walk override: `default`

### Selection Rationale

A director's presence: everything is a cue, delivered with warmth and finality.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
