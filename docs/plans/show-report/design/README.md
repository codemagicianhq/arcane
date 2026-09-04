# Show Report — the approved design (SR-05a)

The visual specification SR-05b builds. Committed here because it existed nowhere durable: it was
authored in a session scratchpad and published as a Claude artifact, neither of which survives.
[ARCANE-UI-BRIEF.md](../ARCANE-UI-BRIEF.md) carries the *contract* — component list, accessibility
baseline, static traps, build output, and every measured colour value — but deliberately carries no
composition. These files are the composition.

Related: [[git-conventions]] for how this lands, and `../PLAN.md`'s SR-05a/SR-05b rows for scope.

## What is here

| file | what it is |
|---|---|
| `Main.dc.html` | **Direction A, "Console" — the approved design**, dark scheme. The whole report: masthead, metadata row, stat rail, needs-you, legend, five wave sections with every Lessons Hardening epic, calibration, parked, cast, colophon. |
| `Light.dc.html` | The same design, light scheme. **This is also the print master** — the report must print, and print is light. Derived from `Main.dc.html` by token swap only; the structure is identical by construction. |
| `Briefing.dc.html` | Direction B, not chosen. Document rhythm — hairline rules, larger reading type, category as a small tag before the title. Kept as the record of what was weighed. |
| `Dispatch.dc.html` | Direction C, not chosen. Answer-first — a large verdict, calibration promoted, the ledger demoted to "the record". |
| `canvas.json` | Layout manifest: which artboard sits where, on which page, plus the annotations carrying the design notes. |

## How to read them

Each `.dc.html` is a self-contained HTML fragment with inline styles and no dependencies — open one
in a browser and it renders. They are also Claude Design canvas artboards: the `<x-dc>` and
`<helmet>` wrappers and the `support.js` reference exist so the set can be re-seeded into a canvas.
Both uses are fine; nothing else reads these files, and no build step depends on them.

## What is authoritative here, and what is not

**Authoritative — copy this:**

- **Structure and composition.** Section order, the four-cell stat rail as one bordered grid, the
  section head bar (`W1` · title · count), the three-column row grid, the pill anatomy, the
  two-column parked grid, the cast/colophon footer split.
- **Type and spacing assignments.** Which family, size, weight, tracking and case each element uses.
- **The eight category icons**, drawn once in the sprite at the top of `Main.dc.html` and referenced
  per row by `<use href="#cat-<category>">`.
- **The eight `--cat-*` values per scheme.** Measured against every ground; the table in the brief
  carries the ratios.

**Not authoritative — a snapshot, not a rule:**

- **The content is real Lessons Hardening data frozen at 2026-09-03.** It is real so the design was
  judged against real text lengths rather than lorem, and designing against it is what exposed three
  generator bugs. Do not treat any string, count or date here as current — regenerate from
  `docs/plans/lessons-hardening/show-report.json` instead.
- **The token *values* are inlined literals**, because a `.dc.html` artboard has no access to
  `theme.css`. Every one was lifted from `arcane-ui`'s real theme rather than recalled, and the
  names match its real ramp. In the built components they must come from the tokens, never from
  these literals.

## Provenance of the colour values

Everything here traces to `arcane-ui`'s `src/theme/theme.css`, with two exceptions that were
authored for this design because the product had no answer:

1. **The eight `--cat-*` values in each scheme.** `arcane-ui` ships four signal channels and no
   category palette. These were authored and measured; the brief carries the ratios.
2. **The light `--ink-50` / `--ink-40` values** (`#435b78` / `#496482`). Those replaced values that
   failed WCAG AA across the product; the fix landed in `arcane-ui` and is in its `theme.css` now.

The light role tokens (`--accent`, `--ok`, `--warn`) were *also* authored here at first, before
`arcane-ui` had a light signal/accent retune. It has one now, so `Light.dc.html` uses the shipped
values (`#006181` / `#086736` / `#824d00`) rather than the originals.

## Licensing

These carry rendered markup and literal colour values — no `arcane-ui` source, no component code,
no imports. That is exactly the boundary ARC-042 decision 1 draws for shipping design output from
the private repository inside this MIT one: the rendered output travels, the design system does not.
