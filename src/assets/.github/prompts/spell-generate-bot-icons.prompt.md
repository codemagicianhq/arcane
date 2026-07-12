---
name: Spell — Generate Bot Icons
description: Generate a bot avatar concept with an image-capable agent, then normalize it into Teams-ready color and outline icons.
argument-hint: Bot concept (e.g., "{AGENT_NAME} for ecommerce ops, powerful + modern, flat vector")
agent: agent
---

## Executive Summary

- This spell standardizes bot icon creation for Teams deployments.
- It separates creative generation (image-capable agent) from deterministic packaging (local script).
- Output is always Teams-ready: `color.png` (192x192) + `outline.png` (32x32 transparent, white glyph).
- Use this **after** agent setup (the agent's identity/role is defined) and **before** packaging `manifest.json` in the Teams setup flow.

---

Create a high-quality avatar concept for the bot, then prepare Teams-compliant icon files.

## Inputs

- Bot role and personality (from user argument)
- Brand direction (if none provided): clean, modern, readable at small sizes

## Rules

- **Validate before processing.** After the source image is saved, confirm it exists and is **square** (equal width and height) before running the build script. If the file is missing, regenerate it; if it is non-square, regenerate or crop to a 1:1 ratio. Do **not** run the build step on a missing or non-square source — fail with a clear message (e.g. `source.png is 1024x768; Teams icons require a square source`).
- Quick check: `python3 -c "from PIL import Image; w,h=Image.open('{TEMP_DIR}/source.png').size; print(w,h); assert w==h, 'source must be square'"` (or `file {TEMP_DIR}/source.png` to read the dimensions).
- The image must contain no copyrighted logos, mascots, or trademarked characters.

> **Placeholders.** `{TEMP_DIR}` resolves to a writable working directory — your OS temp dir (`os.tmpdir()` / `$TMPDIR` / `%TEMP%`) plus a `teams-app` subfolder, or a repo-local `.tmp/teams-app/`. `{REPO_ROOT}` is the consuming repository's root. Resolve from `.arcane.json` / your shell; ask if unset.

## Image Generation Requirements

Generate one **source image** with these constraints:

- Square PNG
- Transparent background preferred
- High resolution (1024x1024 recommended)
- Single strong subject, centered
- Minimal detail that survives downscaling
- No copyrighted logos, mascots, or trademarked characters

Save as:

- `{TEMP_DIR}/source.png`

## Post-Process (Required)

Run (the script path resolves relative to the repo root):

```bash
python3 {REPO_ROOT}/playbooks/scripts/build-teams-icons.py \
  --input {TEMP_DIR}/source.png \
  --output {TEMP_DIR}
```

If `playbooks/scripts/build-teams-icons.py` is **missing** under the repo root, do not improvise silently — tell the user the script is expected at `{REPO_ROOT}/playbooks/scripts/build-teams-icons.py` and either restore it or fall back to producing the two sizes manually (e.g. an equivalent PIL/ImageMagick resize: 192x192 `color.png`, and a 32x32 transparent `outline.png` with a white glyph).

This creates:

- `{TEMP_DIR}/color.png` (192x192)
- `{TEMP_DIR}/outline.png` (32x32, transparent background, white glyph)

## Validation

Run:

```bash
file {TEMP_DIR}/color.png
file {TEMP_DIR}/outline.png
```

Expected:

- `color.png`: PNG image data, 192 x 192
- `outline.png`: PNG image data, 32 x 32

## Final Output

Report:

- Visual style chosen
- Paths to generated files
- Any readability concerns at 32x32 size
