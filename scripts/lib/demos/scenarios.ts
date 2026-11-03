/**
 * scripts/lib/demos/scenarios.ts
 *
 * The README's "See it in action" demos (ARC-058). Each one is rendered to
 * assets/demo/<id>.svg by `npm run fix:demos` and checked by `npm run check:demos`.
 * Adding a scenario here adds a file; README.md references each by its id.
 */

import { KEY_DOWN, KEY_ENTER, answer } from "./capture.js";
import type { DemoScenario } from "./capture.js";

const COLS = 100;
const ROWS = 34;

/** Hold on a menu long enough to read its choices. */
const READ_MENU_MS = 2_400;
/** Hold between keystrokes when a name is typed into a prompt. */
const TYPE_ANSWER_MS = 110;
/** Hold on a typed name before Enter. */
const BEFORE_ENTER_MS = 700;

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: "spell-init",
    title: "init",
    description: "spell init --profile full installs the spell library, governance docs, agent policies and templates into a fresh repository.",
    cols: COLS,
    rows: ROWS,
    commands: [{ args: ["init", "--profile", "full"], holdMs: 7_000 }],
  },
  {
    id: "spell-agents-arcanos",
    title: "agents init",
    description: "spell agents init picks the full roster and the Arcanos naming strategy, then spell agents list shows the named team.",
    cols: COLS,
    rows: ROWS,
    commands: [
      {
        args: ["agents", "init"],
        keys: [
          { keys: KEY_DOWN, waitFor: "Select an agent profile", holdMs: READ_MENU_MS },
          { keys: KEY_ENTER, waitFor: "\u276f \u{1f9d9}  Full", holdMs: READ_MENU_MS },
          { keys: KEY_ENTER, waitFor: "Choose a naming strategy", holdMs: READ_MENU_MS },
        ],
        holdMs: 2_500,
      },
      { args: ["agents", "list"], holdMs: 6_000 },
    ],
  },
  {
    id: "spell-agents-custom",
    title: "agents init",
    description: "spell agents init with the base profile and custom naming, typing a public-domain mythology name (Athena, Apollo, Thoth, Maat) for each role, then spell agents list.",
    cols: COLS,
    rows: ROWS,
    commands: [
      {
        args: ["agents", "init", "--profile", "base", "--naming", "custom"],
        keys: [
          ...answer("Name for Product Operations Manager:", "Athena", TYPE_ANSWER_MS, BEFORE_ENTER_MS),
          ...answer("Name for CTO / Architecture Lead:", "Apollo", TYPE_ANSWER_MS, BEFORE_ENTER_MS),
          ...answer("Name for Full-Stack Developer:", "Thoth", TYPE_ANSWER_MS, BEFORE_ENTER_MS),
          ...answer("Name for QA Lead:", "Maat", TYPE_ANSWER_MS, BEFORE_ENTER_MS),
        ],
        holdMs: 2_500,
      },
      { args: ["agents", "list"], holdMs: 6_000 },
    ],
  },
];
