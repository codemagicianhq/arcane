# Snape — Avatar Image Generation Prompt

**Character:** Severus Snape
**Universe:** Harry Potter / Wizarding World
**Arcane Role:** QA Lead
**Ethnicity:** White male (pale)

---

## Image Generation Prompt

```
Photorealistic portrait of a pale, sharp-featured White male precision inspector
in long black robes with subtle circuit-thread embroidery. Subtle proud smile
of earned satisfaction — his tests all passed, every metric green. One hand
holds a glowing test vial mid-inspection, the other rests with quiet authority.
Floating quality metrics dashboards and test vials surround him — potions
reimagined as software test suites. Dark academic elegance with futuristic lab
equipment. Cool green and purple vial glow against dark robes. Cinematic
lighting, dark moody background. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a pale sharp-featured QA inspector in dark robes
with circuit embroidery. Holds a glowing test vial. Floating quality metrics
and test equipment around him. Subtle proud smile — tests passed, metrics
green. Dark academic elegance. Cool green-purple glow. Cinematic lighting,
dark background. Square 1:1 avatar.
```

## Character Notes

- **Complexion:** Notably pale — stark contrast with dark hair and black robes
- **Hair:** Dark, straight, shoulder-length — slightly lank, framing angular face
- **Expression:** Subtle proud smile — his tests just passed, quiet earned satisfaction showing through
- **Robes:** Entirely black with green circuit-thread embroidery at hem and cuffs
- **Props:** Glowing test vial (green) in one hand — potions = test suites
- **Focal element:** Glowing test vial + floating quality metrics
- **No wand** — the "wand" is the test runner in this digital persona

## Palette

| Token      | Hex       | Usage                               |
| ---------- | --------- | ----------------------------------- |
| Robes      | `#0a0a0a` | Near-black                          |
| Data glow  | `#16a34a` | Green vial, circuit threads         |
| Accent     | `#7c3aed` | Purple vial glow, secondary metrics |
| Skin       | `#e8e0d8` | Pale, cool white                    |
| Background | `#111111` | Deep black                          |

## Negative Prompts

```
colorful robes, casual clothing, young, blonde, short hair, Dumbledore,
wand, wizard hat, cartoon, anime, female, sad, melancholy, sorrowful,
frowning, scowling, disappointed, sullen
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders only. Clean dark gradient background — consistent across all characters for portfolio cohesion. Even soft studio lighting, no dramatic shadows. No floating elements or holograms in background. Only subtle green-purple vial glow close to the face. Focus purely on expression, face detail, and character identity. **1:1 square format — NOT landscape, NOT portrait tall.**

```
Pale sharp-featured White male QA inspector portrait, chest-up tight crop, dark straight shoulder-length hair framing angular face, notably pale skin, subtle proud smile — his tests just passed, quiet earned satisfaction showing through, black robes with green circuit-thread embroidery at collar and cuffs visible, glowing green test vial held at chest height, photorealistic skin with natural texture and no skin smoothing, cool green-purple vial glow illuminating upward, soft neutral key light, dark background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

Character standing in their testing laboratory, mid-action inspecting a glowing test vial. All quality metrics dashboards, floating test vials, and potions-as-test-suites fully active around him. Dynamic pose showing what this character does. Think: the scene where Snape is first introduced — you instantly understand his role as the one who will catch every defect. **2:3 portrait tall format — full body head to boots visible, NOT landscape.**

```
Full-body character concept render, pale sharp-featured White male QA inspector standing in a dark academic testing laboratory, dark straight shoulder-length hair, notably pale skin, subtle proud smile, black robes with green circuit-thread embroidery at hem and cuffs, one hand holding a glowing green test vial mid-inspection, other hand resting with quiet authority, floating quality metrics dashboards and test vials surrounding him — potions reimagined as software test suites, all metrics green, photorealistic skin, entire body fully visible from head to boots, nothing cropped, cool green and purple vial glow against dark robes, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Hero Shot — Cinematic Frame (16:9 widescreen landscape)

Dramatic low-angle or 3/4 angle composition. Volumetric god rays through the dark academic lab, green and purple particle effects, quality metrics blazing around him. Shallow depth of field with cinematic bokeh. Color graded like a $200M Marvel Studios production. Movie poster quality composition without text. Ultra-dramatic — this image should make you want to see the film. **16:9 widescreen landscape format — wide cinematic frame, NOT square, NOT portrait.**

```
Epic horizontal landscape hero shot, 16:9 widescreen cinematic composition, pale sharp-featured White male QA inspector in a grand dark academic laboratory, character positioned in right third with the lab environment filling the full width of the frame, dark straight shoulder-length hair, black robes with glowing green circuit embroidery, glowing test vial blazing in one hand, quality metrics and floating test vials surrounding him in a vortex of green and purple light, volumetric god rays through dark laboratory windows, atmospheric green-purple particles, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, full scene depth from foreground to far background, no portrait crop, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 193 cm** (Origin: Bottom) — tall, gaunt, austere. Presence comes from precision, not bulk.

Generate as **three separate individual images** in the same session for maximum resolution and hand detail. Plain neutral gray background (#808080) on all three. Flat even studio lighting, no directional shadows on all three. **Arms must be fully extended from shoulder to fingertips — hands and fingertips completely in frame, nothing cropped at the image edge.** Used as Meshy 3D multi-view input.

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Pale sharp-featured White male, tall and gaunt build, dark straight shoulder-length hair, notably pale skin. Long black robes with green circuit-thread embroidery at hem and cuffs. No test vial, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side:**

```
Full body right-side view, T-pose — arms extended horizontally, legs shoulder-width apart. Pale sharp-featured White male, tall and gaunt build, dark straight shoulder-length hair. Long black robes with green circuit-thread embroidery, side profile showing robe silhouette. No test vial, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Strict 90-degree side profile — camera directly perpendicular to character's right side, character facing directly left of frame, zero diagonal angle, zero perspective twist, absolutely no 3/4 rotation. 3D model reference sheet.
```

**T-Pose Back:**

```
Full body back view, T-pose — arms extended horizontally, legs shoulder-width apart. Pale sharp-featured White male, dark straight shoulder-length hair visible from behind. Long black robes with green circuit-thread embroidery along back hem and sleeve edges. No test vial, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly away from camera. 3D model reference sheet.
```

### A-Pose Turnaround (Meshy 3D pipeline — alternate)

Same rules as T-Pose but with arms at ~45° from body (A-pose). Use if T-pose consistently fails rigging at shoulders or clips hands. **Three separate images, same session, gray background, flat lighting.**

**A-Pose Front:**

```
Full body front view, A-pose — arms angled 45 degrees from body, legs shoulder-width apart. Pale sharp-featured White male, tall and gaunt build, dark straight shoulder-length hair. Long black robes with green circuit-thread embroidery. No test vial, no held objects, hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms at 45 degrees with hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
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

- Celebration: `Scheming_Hand_Rub` (action_id: 318)
- Signature: `Finger_Wag_No` (action_id: 409)
- Walk override: `default`

### Selection Rationale

Precision QA attitude with assertive reject gesture.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
