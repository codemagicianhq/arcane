# Alexander — Avatar Image Generation Prompt

**Character:** Alexander, the Man Who Knows
**Namesake:** Alexander (Claude Alexander Conlin, 1880–1954), headline mentalist — the name itself is ancient and unownable
**Arcane Role:** Research & Backlog Analyst (research-analyst)
**Ethnicity:** White male (American)

---

## Image Generation Prompt

```
Photorealistic portrait of a composed White male mentalist-analyst in the
classic golden-age poster style. Jeweled turban with a single cabochon over
the brow, formal dark suit with a high collar. One hand resting on a glowing
crystal ball that streams charts, trend lines and cited sources instead of
smoke. Sealed envelopes float at the edge of frame, each tagged with a
glowing question mark resolving into an answer. Calm, knowing, faintly
amused certainty. Deep indigo and gold palette. Dark background, cinematic
lighting. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a composed White male in a jeweled turban and
formal dark suit, hand resting on a glowing crystal ball streaming charts
and source citations, floating sealed envelopes resolving into answers,
deep indigo and gold palette, dark background. Square 1:1 avatar.
```

## Character Notes

- **Build:** Composed, still, upright — a headliner's presence without theatrics
- **Skin:** Fair; photorealistic texture, no smoothing
- **Wardrobe:** The classic mentalist poster look — jeweled turban, formal dark suit; played straight, not costume
- **Signature element:** The crystal ball that streams *data* — divination with citations
- **Expression:** The Man Who Knows: calm certainty, one eyebrow of amusement
- **Focal element:** Sealed question envelopes resolving into answers
- **Digital layer:** Trend lines and confidence intervals orbiting the crystal

## Palette

| Token      | Hex       | Usage                          |
| ---------- | --------- | ------------------------------ |
| Suit       | `#1c1b26` | Formal dark base               |
| Indigo     | `#3a3f8c` | Turban, crystal depths         |
| Gold       | `#d4af37` | Jewel, trim, envelope seals    |
| Data       | `#7fd1c9` | Charts, citations, trends      |
| Background | `#0e0d16` | Deep stage darkness            |

## Negative Prompts

```
android, synthetic skin, forehead gem robot, cape, levitating body, cartoon,
anime, franchise emblems, chest insignia, crystal ball with smoke skull,
occult sigils, sinister, text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting; soft indigo uplight from the crystal only. **1:1 square format.**

```
Composed White male mentalist-analyst portrait, chest-up tight crop, jeweled indigo turban with gold cabochon, formal dark suit with high collar, calm knowing expression with faint amusement, soft indigo uplight from below as if from a crystal ball out of frame, photorealistic skin texture, no smoothing, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

In his reading room — walls of sealed question envelopes, a desk bearing the crystal ball streaming research: charts, sources, verdicts. His entire act was answering sealed written questions; the backlog is just the modern envelope. **2:3 portrait tall — full body head to shoes visible.**

```
Full-body character concept render, composed White male mentalist-analyst standing at a desk in a study lined with walls of sealed envelopes, jeweled turban and formal dark suit, one hand on a large crystal ball streaming glowing charts and cited sources upward, envelopes detaching from the walls and resolving into answered cards around him, photorealistic skin texture, entire body visible from head to polished shoes, indigo and gold palette, golden-age mentalist poster composition, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

"The Man Who Knows" — the classic one-man poster staged wide: the gaze, the crystal, and a panorama of questions becoming answers across the frame. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, White male mentalist-analyst in right third gazing directly at the viewer, jeweled turban, hand on crystal ball erupting a panorama of charts, timelines and cited sources across the full width, sealed envelopes streaming toward the crystal and leaving as answered cards, volumetric indigo light, atmospheric particles, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, golden-age lithograph poster energy, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 182 cm** (Origin: Bottom) — headliner posture, nothing exaggerated.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, no crystal, no envelopes, no glow. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Composed White male, jeweled indigo turban with gold cabochon, clean-shaven. Formal dark high-collared suit, polished shoes. No crystal ball, no held objects, no effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; turban wrap visible from behind.

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

- Celebration: `Agree_Gesture` (action_id: 25) — he already knew
- Signature: `Idle_02` (action_id: 11) — the reading pose
- Walk override: `default`

### Selection Rationale

Certainty is still; the answer arrives before the movement does.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
