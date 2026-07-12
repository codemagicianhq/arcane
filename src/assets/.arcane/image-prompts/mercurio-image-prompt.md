# Mercurio — Avatar Image Generation Prompt

**Character:** Mercurio, the Swift
**Namesake:** Mercury, god of speed — and the only metal that runs; *azogue*, alchemy's living metal — public domain
**Arcane Role:** Mobile Developer (mobile-dev)
**Ethnicity:** Latino male (Mexican)

---

## Image Generation Prompt

```
Photorealistic portrait of a lithe young Latino male courier of the gods,
reimagined as a mobile engineer. Short dark hair with flowing liquid-silver
highlights as if quicksilver runs through it. Sleek dark courier suit with
subtle winged accents at the collar and ankles — reference to the winged
sandals, never a costume. Beads of liquid mercury orbit him, scattering
into app icons and device screens as they fly. Caught mid-motion, half-turn,
already leaving. Silver, graphite and warm copper palette. Dark background
with motion-light trails. Cinematic lighting. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a lithe young Latino male in a sleek dark courier
suit with subtle winged accents, short dark hair with liquid-silver
highlights, beads of liquid metal orbiting him scattering into app icons and
floating mobile devices, motion-light trails, dark background. Square 1:1
avatar.
```

## Character Notes

- **Build:** Lean runner's build; weight always on the forward foot
- **Skin:** Warm brown; photorealistic texture, no smoothing
- **Hair:** Short dark hair with liquid-silver flow-lines
- **Wardrobe:** Sleek graphite courier suit; small winged details at collar and ankles
- **Signature element:** Orbiting quicksilver beads becoming app icons — the living metal
- **Expression:** Bright, quick, already three thoughts ahead
- **Focal element:** Mid-motion posture, mercury trails
- **Digital layer:** Device screens streaming build output in his slipstream

## Palette

| Token      | Hex       | Usage                         |
| ---------- | --------- | ----------------------------- |
| Suit       | `#2b2e33` | Graphite courier suit         |
| Mercury    | `#c9ced6` | Quicksilver beads, highlights |
| Copper     | `#c47a3d` | Warm accents, wing details    |
| Screens    | `#6fc3e8` | Device glow                   |
| Background | `#101318` | Dark with motion trails       |

## Negative Prompts

```
lightning bolt, red suit, spandex costume, mask, goggles, cartoon, anime,
franchise emblems, chest insignia, thermometer, standing still stiffly,
text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting; faint silver motion-shimmer only. **1:1 square format.**

```
Lithe young Latino male courier portrait, chest-up tight crop, short dark hair with liquid-silver highlights, bright quick expression mid-turn, graphite suit collar with small winged accent, single bead of liquid mercury floating near his shoulder, photorealistic warm brown skin texture, no smoothing, faint silver rim light, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

Sprinting across a bridge of floating device screens — each footfall lands on a phone that lights up with a green build, quicksilver trail streaming behind, delivery already made. **2:3 portrait tall — full body head to feet visible.**

```
Full-body character concept render, lithe young Latino male mid-sprint across a rising bridge of floating mobile device screens, each screen lighting green as his foot leaves it, sleek graphite courier suit with winged ankle accents, liquid mercury trail streaming behind and scattering into app icons, photorealistic skin texture, entire body visible from head to feet in full stride, silver-graphite-copper palette, motion-light trails, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The delivery run — a wide cityscape of app-store towers, his quicksilver trail threading through them, devices lighting green in his wake. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, young Latino male courier streaking left-to-right across a night cityscape of glowing device towers, liquid-silver motion trail threading the full width of the frame, mobile screens lighting green in his wake, volumetric light shafts, particle spray of mercury beads, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 178 cm** (Origin: Bottom) — built like a middle-distance runner.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, no mercury, no trails, no devices. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Lithe young Latino male, short dark hair with silver highlights. Sleek graphite courier suit with small winged accents at collar and ankles, fitted running shoes. No liquid metal, no motion effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; suit seams and ankle wings visible.

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

- Celebration: `Victory_Cheer` (action_id: 59) — crossed the line first, again
- Signature: `Run_02` (action_id: 14) — the delivery run
- Walk override: `Run_02` (action_id: 14) — he does not walk

### Selection Rationale

Perpetual motion; even his idle should read as a runner at the blocks.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
