# Prospero — Avatar Image Generation Prompt

**Character:** Prospero, the Stormcaller
**Namesake:** Prospero, *The Tempest* (Shakespeare, 1611) — public domain
**Arcane Role:** DevOps / CI/CD Engineer (devops)
**Ethnicity:** White male (Mediterranean / Italian — the Duke of Milan)

---

## Image Generation Prompt

```
Photorealistic portrait of a weathered older White Mediterranean male
storm-engineer. Wind-swept grey hair, short sea-salt beard, calm eyes at
the center of turbulence. A weathered sea-cloak layered over modern
technical gear with brass instrument details. Holds a tall staff that was
visibly broken once and rejoined with a band of glowing conduit. Behind
him a controlled storm: swirling clouds threaded with glowing pipeline
diagrams, deployment gates lighting green as the weather passes through
them. Teal, slate and brass palette. Cinematic lighting, dark maritime
background. Square 1:1 avatar.
```

## Safe Version

```
Photorealistic portrait of a weathered older White Mediterranean male with
wind-swept grey hair and short beard, sea-cloak over modern technical gear,
holding a staff rejoined with a glowing band, controlled storm clouds with
glowing pipeline diagrams and green status gates behind him, teal and brass
palette, dark background. Square 1:1 avatar.
```

## Character Notes

- **Build:** Solid, unhurried; a man the weather obeys
- **Skin:** Olive, sea-weathered; photorealistic texture, no smoothing
- **Hair:** Grey, wind-swept; short salt-and-pepper beard
- **Wardrobe:** Weathered sea-cloak over practical engineer's kit; brass gauge details
- **Signature element:** The broken-and-rejoined staff — he abjured rough magic for repeatable magic
- **Expression:** Calm command; every tempest of his ends in a safe harbor
- **Focal element:** Storm-and-pipeline vortex behind him, gates going green
- **Digital layer:** Unseen spirits implied — small luminous wisps executing tasks in the storm (never a named figure)

## Palette

| Token      | Hex       | Usage                             |
| ---------- | --------- | --------------------------------- |
| Cloak      | `#3a4450` | Slate sea-cloak                   |
| Storm      | `#1d7a8c` | Teal storm energy, pipelines      |
| Brass      | `#b08d3f` | Instruments, staff band           |
| Status     | `#43c463` | Deployment gates going green      |
| Background | `#0c1418` | Dark maritime depths              |

## Negative Prompts

```
red uniform, starship, engine room, badge, insignia, kilt, cartoon, anime,
franchise emblems, wizard hat, lightning god, panicked expression,
text, watermark
```

---

## Image Types

### Portrait — Studio Headshot (1:1 square)

Tight crop on face and upper shoulders. Clean dark gradient background, even soft studio lighting; faint teal storm-light rim only. **1:1 square format.**

```
Weathered older White Mediterranean male storm-engineer portrait, chest-up tight crop, wind-swept grey hair, short sea-salt beard, calm commanding eyes, slate sea-cloak collar over technical gear with brass details, faint teal rim light as if lit by distant storm, photorealistic olive weathered skin texture, no smoothing, dark gradient background, square 1:1 format, no text, no watermark.
```

### Full Body — Environmental Character Intro (2:3 portrait tall)

On his island — a headland of rock and antenna masts where the storm is the infrastructure: pipelines as weather fronts, deploy gates as harbor lights, luminous task-wisps riding the wind at his command. **2:3 portrait tall — full body head to boots visible.**

```
Full-body character concept render, weathered older White Mediterranean male standing on a rocky headland fused with antenna masts and conduit, sea-cloak billowing, staff with glowing rejoined band planted firmly, a controlled spiral storm overhead threaded with glowing pipeline diagrams and green deployment gates, small luminous wisps executing tasks in the wind, photorealistic skin texture, entire body visible from head to boots, teal-slate-brass palette, cinematic lighting, 2:3 portrait tall format, no text, no watermark.
```

### Poster Shot — Cinematic Frame (16:9 widescreen landscape)

The scheduled tempest — a wide maritime panorama, storm wall rolling through deployment gates that light green in sequence toward a calm harbor. **16:9 widescreen landscape.**

```
Epic horizontal landscape poster shot, 16:9 widescreen cinematic composition, older Mediterranean male storm-engineer on a headland in left third, staff raised, vast storm front filling the frame threaded with pipeline light, a chain of deployment gates flashing green in sequence toward a calm lit harbor on the right, volumetric storm light, rain particles, lens bloom, dramatic high-contrast lighting, blockbuster film-grade color grading, 16:9 landscape format, no text, no watermark.
```

### T-Pose Turnaround (Meshy 3D pipeline)

**Meshy Export Height: 190 cm** (Origin: Bottom) — broad, grounded, harbor-solid.

Three separate images (front, right side, back), plain neutral gray background (#808080), flat even lighting, no staff, no storm, no wisps. **Arms fully extended — hands and fingertips completely in frame.**

**T-Pose Front:**

```
Full body front view, T-pose — arms extended horizontally, legs shoulder-width apart. Weathered older White Mediterranean male, wind-swept grey hair, short beard. Slate sea-cloak worn open over practical dark technical gear with brass gauge details, sturdy boots. No staff, no held objects, no weather effects. Hands open with fingers relaxed. Plain neutral gray background (#808080). Flat even studio lighting, no directional shadows. Arms fully extended — hands and fingertips completely in frame, not cropped. Facing directly forward toward camera. 3D model reference sheet.
```

**T-Pose Right Side / Back:** same specification, strict 90° right profile (zero 3/4 rotation) and directly-away back view; cloak drape from behind.

### A-Pose Turnaround (alternate)

Same rules with arms at ~45° (A-pose), three separate images, if T-pose fails rigging or clips the cloak.

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

- Celebration: `Agree_Gesture` (action_id: 25) — the storm passed as planned
- Signature: `Talk_Passionately` (action_id: 308) — conducting the weather
- Walk override: `default`

### Selection Rationale

Calm at the eye of the storm; motion belongs to his pipelines, not to him.

### Exclusions

Do not select weapon-carrying animations (Gun, Rifle, Shoot, Reload, Grenade, Bow_Aimed).

### Master Reference

See dark-matter-complex/docs/animation-spec.md for the full cross-character mapping.
