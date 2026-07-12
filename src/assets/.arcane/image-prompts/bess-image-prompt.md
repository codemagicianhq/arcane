# Bess — Avatar Image Generation Prompt

**Character:** Bess, the Herald
**Namesake:** Bess Houdini (1876–1943) — the channel that never closes; the name clears as every Elizabeth since Good Queen Bess
**Arcane Role:** Operations Communications (operations-comms)
**Ethnicity:** White female (American, Brooklyn-born)

---

## Image Generation Prompt

```
Photorealistic portrait of a petite White woman with a dark 1920s bob and
bright, steady eyes. Tailored stage jacket with pearl buttons over a high
collar, vintage-modern: brass telegraph key at her fingertips reimagined as
a glowing message console. A single candle burns steadily beside a rack of
glowing message tubes — the channel kept open, every year, without fail.
Warm candlelight against cool slate tones. Composed, warm, unhurried
reliability. Dark parlor background. Cinematic lighting. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a petite White woman with a dark 1920s bob,
pearl-buttoned stage jacket, fingers on a glowing brass telegraph key
console, single steady candle beside a rack of glowing message tubes, warm
candlelight with cool slate tones, dark parlor background. Square 1:1
avatar.
```

## Character Notes

- **Build:** Petite, precise; presence through steadiness, not size
- **Skin:** Fair; photorealistic texture, no smoothing
- **Hair:** Dark 1920s bob, neat and practical
- **Wardrobe:** Pearl-buttoned tailored stage jacket, high collar — stage-assistant elegance grown into command
- **Signature elements:** The telegraph key and the steady candle — a decade of kept appointments
- **Expression:** Warm, brief, certain; the message always gets through
- **Focal element:** The glowing key under her fingers
- **Digital layer:** Message tubes routing as pneumatic light-lines

## Palette

| Token      | Hex       | Usage                        |
| ---------- | --------- | ---------------------------- |
| Jacket     | `#2e3440` | Slate tailored base          |
| Candle     | `#e8b96a` | Warm keeping-light           |
| Pearl      | `#e6e1d8` | Buttons, collar trim         |
| Message    | `#8fb8de` | Telegraph glow, light-lines  |
| Background | `#151218` | Dark parlor                  |

## Negative Prompts

```
black leather catsuit, sunglasses, digital rain, gothic skeleton, séance
table crowd, cartoon, anime, franchise emblems, chest insignia, flapper
party glamour, sad mourning veil, text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting; single warm candle-glow accent from the left. **1:1 square format.**

```
Petite White woman herald portrait, chest-up tight crop, dark 1920s bob, bright steady eyes, warm brief smile, pearl-buttoned slate stage jacket with high collar, soft warm candlelight from lower left against cool key light, photorealistic skin texture, no smoothing, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

At her communications desk — a wall of labeled message tubes glowing with routed updates, telegraph key under her hand, the one candle that has never gone out keeping the channel's hours. **2:3 portrait tall — full body head to shoes visible.**

```
Full-body character concept render, petite White woman standing at a vintage-modern communications desk, dark 1920s bob, pearl-buttoned slate jacket and practical skirt, one hand on a glowing brass telegraph key, wall of labeled pneumatic message tubes glowing with routed light behind her, single steady candle on the desk, photorealistic skin texture, entire body visible from head to shoes, warm-candle against slate palette, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The open channel — a wide parlor-turned-switchboard at night, light-lines routing messages out into the dark city skyline, her silhouette small and central, the candle bright. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, petite White woman at a glowing switchboard desk in center frame of a dark parlor opening onto a night skyline, message light-lines routing outward across the full width into the city, steady candle flame as the brightest point, volumetric warm light, atmospheric dust, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 165 cm** (Origin: Bottom) — smallest of the roster; the room still orients around her desk.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, no candle, no tubes, no glow. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Petite White woman, dark 1920s bob. Pearl-buttoned slate tailored jacket with high collar, practical knee-length skirt, low-heeled shoes. No held objects, no effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; jacket seam and bob silhouette from behind.

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

- Celebration: `Agree_Gesture` (action_id: 25) — loop closed
- Signature: `Idle` (action_id: 0) — keeping the channel's hours
- Walk override: `default`

### Selection Rationale

Reliability as presence: small motions, kept appointments, nothing wasted.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
