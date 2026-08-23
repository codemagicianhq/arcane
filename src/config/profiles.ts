/**
 * Profile configuration — the canonical source of truth for Arcane profiles.
 *
 * A profile bundles a curated set of components for a common use case.
 * Changing which components an EXISTING profile bundles requires only editing
 * this file. Adding a NEW profile id additionally touches the `Profile` union
 * in types.ts, `VALID_PROFILES` and the presentation/gating branches in
 * commands/init.ts, the --profile help string in index.ts, and the retrofit
 * mirror in modules/hub.ts -- the registry itself needs no change.
 *
 * The special value "*" for `components` means "all registered components"
 * and is expanded by the registry at runtime.
 */

import type { Profile } from "../types.js";

export interface ProfileConfig {
  id: Profile;
  displayName: string;
  description: string;
  /**
   * Component names included in this profile.
   * Use the special value "*" to mean "all registered components" (full install).
   */
  components: string[] | "*";
}

export const PROFILE_CONFIGS: ProfileConfig[] = [
  {
    id: "full",
    displayName: "Full Suite",
    description: "All components — spells, governance, agents, templates",
    components: "*",
  },
  {
    id: "lite",
    displayName: "Essentials",
    description: "Spells + core governance — fast start",
    components: [
      "spells-session",
      "spells-capture",
      "spells-delivery",
      "spells-planning",
      "spells-build",
      "spells-venture",
      "spells-meta",
      "agent-output-instructions",
      "git-conventions",
      "testing-standards",
      "framework-decisions",
      "session-continuity",
    ],
  },
  {
    id: "methodology",
    displayName: "Methodology Suite",
    description: "Spells + governance — full methodology without security/infra docs",
    components: [
      "spells-session",
      "spells-capture",
      "spells-delivery",
      "spells-planning",
      "spells-build",
      "spells-venture",
      "spells-meta",
      "agent-output-instructions",
      "git-conventions",
      "testing-standards",
      "framework-decisions",
      "session-continuity",
      "decision-documentation-standard",
      "agent-work-queue-model",
      "development-methodology",
      "spell-authoring-standards",
    ],
  },
  {
    id: "docs",
    displayName: "Docs / Records",
    description: "Documentation and records repositories — no code, test, or deployment workflows",
    components: [
      // Deliberate exclusion: "spells-build" (implementation, tests, stack
      // experts, release, deployment, PRD enchantment) and "spells-venture"
      // (hub-only). Per docs-mode PRD MH-01, every retained spell must
      // complete its core workflow without source code, tests, CI, or an
      // external tracker. Asserted in test/registry.test.ts, exclusions
      // included -- MH-01 requires the exclusions themselves be tested.
      "spells-session",
      "spells-capture",
      "spells-delivery",
      "spells-planning",
      "spells-meta",
      "agent-output-instructions",
      "git-conventions",
      "framework-decisions",
      "session-continuity",
      "decision-documentation-standard",
      "agent-work-queue-model",
      "development-methodology",
      "naming-conventions",
      "universal-agent-rules",
      "spell-authoring-standards",
    ],
  },
  {
    id: "governance-only",
    displayName: "Governance Only",
    description: "Standards docs only — no spells or agents",
    components: [
      "agent-output-instructions",
      "git-conventions",
      "testing-standards",
      "framework-decisions",
      "decision-documentation-standard",
      "agent-work-queue-model",
      "naming-conventions",
      "agent-policies",
      "threat-model",
      "hardening-checklist",
      "authentication-strategy",
      "new-business-setup",
      "agent-approved-paths",
      "portable-bootstrap",
      "development-methodology",
      "cicd-standards",
      "poc-management-pattern",
      "product-excellence-standards",
      "rca-process-standard",
      "universal-agent-rules",
      "spell-authoring-standards",
    ],
  },
];
