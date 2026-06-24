# Primus — Avatar Image Generation Prompt

**Character:** Optimus Prime (humanised)
**Universe:** Transformers (G1 / Animated)
**Arcane Role:** Product Operations Manager
**Ethnicity:** White male

---

## Image Generation Prompt

```
Photorealistic portrait of a charismatic White male tech leader with a warm,
approachable smile. Human face with visible cybernetic enhancements — gold
and deep blue segmented mechanical plating covering his shoulders, collar,
and parts of his jawline, seamlessly integrated with human skin. One eye has
a subtle blue-gold cybernetic glow. A glowing warm energy core visible at
his chest through an opening in his armor plating. His expression is friendly,
confident, and inviting — like a natural leader mid-conversation. Highly
detailed metallic textures with realistic surface wear, reflections, and
micro-scratches on the armor plates. Gold, silver, and deep blue color palette.
Cinematic lighting with warm blue-gold energy reflections. Dark background.
Square 1:1 avatar crop.
```

## Safe Version

```
Photorealistic portrait of a friendly White male tech executive with cybernetic
armor enhancements. Warm approachable smile, one eye with subtle gold-blue
glow. Segmented gold and deep blue mechanical plating on shoulders and
jawline, integrated with human skin. Glowing energy core at chest. Detailed
realistic metal textures with wear and reflections. Cinematic lighting,
dark background. Square 1:1 avatar.
```

## Character Notes

- **Build:** Broad-shouldered, commanding presence without being intimidating
- **Complexion:** White male, close-cropped hair, strong jaw
- **Expression:** Warm, friendly, inviting — stoic resolve meets approachability
- **Cybernetics:** Gold and deep blue segmented plating, seamlessly integrated with skin
- **Focal element:** Chest energy core + cybernetic face
- **Scale:** Avatar must read clearly at 32×32 px — bold silhouette, clear energy core glow

## Palette

| Token      | Hex       | Usage                        |
| ---------- | --------- | ---------------------------- |
| Primary    | `#0d1b2a` | Deep navy armor plating      |
| Gold       | `#d4af37` | Armor accents, plating edges |
| Accent     | `#4fc3f7` | Cybernetic glow, energy core |
| Skin       | `#c8a882` | Human skin tone              |
| Background | `#1a2332` | Dark neutral                 |

## Negative Prompts

```
robot, fully mechanical, no human features, truck, vehicle, red and blue truck,
cartoon, anime, Megatron, Bumblebee, child, female, casual clothing,
sad, melancholy, sorrowful, depressed, traumatized, frowning
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders only. Clean dark gradient background — consistent across all characters for portfolio cohesion. Even soft studio lighting, no dramatic shadows. No floating elements or holograms in background. Only subtle blue-gold cybernetic glow from the eye and chest energy core close to the face. Focus purely on expression, face detail, and character identity.

### Full Body — Environmental Character Intro (2:3 portrait tall)

Character standing in his product operations command center — sprint boards, Kanban cards, and product roadmap timeline active around him, all projected from a compact forearm-mounted device on his left arm emitting the data upward, no held screens. Clean dark navy blue segmented cybernetic armor plates with precise geometric panel lines and gold accent trim — structured and clean, not heavily textured or busy. Glowing octagonal amber-gold energy core at his chest. One hand gesturing toward a timeline arc. Warm approachable smile. Think: the scene where Primus is first introduced — you instantly understand he runs the whole operation.

### Hero Shot — Cinematic Frame (16:9 widescreen landscape)

Dramatic low-angle or 3/4 angle composition. Sprint boards and roadmap timelines blazing around him in a vortex of blue-gold light, chest energy core blazing. Volumetric god rays in gold and cyan, dramatic lens flares, particle effects. Shallow depth of field with cinematic bokeh. Color graded like a $200M Marvel Studios production. Movie poster quality composition without text. Ultra-dramatic. **16:9 widescreen landscape format — wide cinematic frame, NOT square, NOT portrait.**

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 210 cm** (Origin: Bottom) — superhuman ops commander, imposing but approachable. Same height as Thor — running joke between them.

Generate as **three separate individual images** in the same session for maximum resolution and hand detail. Plain neutral gray background (#808080) on all three. Flat even studio lighting, no directional shadows on all three. **Arms must be fully extended from shoulder to fingertips — hands and fingertips completely in frame, nothing cropped at the image edge.** Used as Meshy 3D multi-view input.

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. White male tech leader with cybernetic enhancements, early 40s. Broad-shouldered. Gold and deep blue segmented mechanical plating on shoulders, collar, and jaw integrated with human skin. One eye with subtle blue-gold cybernetic glow. Glowing warm energy core at chest. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side:**

```
Full body right-side view, T-pose — arms extended horizontally, legs shoulder-width apart. White male tech leader with cybernetic enhancements, early 40s. Gold and deep blue mechanical plating on shoulders and jaw. Glowing energy core at chest. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Strict 90-degree side profile — camera directly perpendicular to character's right side, character facing directly left of frame, zero diagonal angle, zero perspective twist, absolutely no 3/4 rotation. 3D model reference sheet.
```

**T-Pose Back:**

```
Full body back view, T-pose — arms extended horizontally, legs shoulder-width apart. White male tech leader with cybernetic enhancements, early 40s. Gold and deep blue mechanical plating visible across shoulders and upper back. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly away from camera. 3D model reference sheet.
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

- Celebration: `Motivational_Cheer` (action_id: 49)
- Signature: `Cheer_with_Both_Hands_Up` (action_id: 298)
- Walk override: `default` (use shared `Casual_Walk`, action_id: 30)

### Selection Rationale

Warm leader energy with rally-style celebration. Keep walk style on shared `Casual_Walk` for natural shoulders and stable foot spacing.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
