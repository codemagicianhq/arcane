/**
 * Validates the vendored Show Report template (SR-06).
 *
 * `check:report` proves the committed reports match a regeneration from their
 * sources. It cannot tell you the TEMPLATE is sound, because a template whose
 * tags name fields that do not exist still regenerates byte-identically -- it
 * is consistently wrong. That is not hypothetical: arcane-ui's 2.1.0 template
 * shipped with fourteen tags resolving to empty strings, an empty <h1>, and a
 * calibration sentence hardcoded to one program, and every gate it faced was
 * green. Mustache renders an unknown tag as an empty string, silently, so
 * nothing downstream can notice.
 *
 * This check renders the template against real payloads and fails on the
 * specific ways a compiled template goes wrong.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { buildShowReportView, renderShowReport } from "../src/modules/show-report/render.js";
import type { ShowReport } from "../src/modules/show-report/types.js";

const ROOT = process.cwd();
const TEMPLATE_RELPATH = "src/assets/report/show-report.template.html";
/** ARC-042 decision 1: the compiled artifact ships inside MIT arcane-cli, so it stays small. */
const MAX_BYTES = 100 * 1024;

interface Failure {
  rule: string;
  detail: string;
}

/** Every tag the template asks for, section/inverted/variable/triple alike. */
function templateTags(template: string): string[] {
  return [...new Set([...template.matchAll(/\{\{\{?[#^]?([a-zA-Z][\w.]*)\}?\}\}/g)].map((m) => m[1]!))];
}

/**
 * A model with EVERY optional field populated, used only to decide whether a
 * tag names something the schema can produce.
 *
 * Checking that against real committed reports does not work, and getting this
 * wrong once is what motivates the comment: `note` is an optional section field
 * that neither committed program uses, so sampling real data reported the
 * correctly-guarded `{{#hasNote}}{{note}}{{/hasNote}}` as a dead tag. A tag is
 * dead when the schema cannot produce it, not when today's data happens not to.
 */
function maximalModel(): ShowReport {
  const row = {
    id: "XX-01",
    title: "Row",
    description: "Description.",
    descriptionState: "authored" as const,
    category: "feature" as const,
    href: "https://example.invalid/pr/1",
    refs: ["https://example.invalid/pr/1"],
    by: ["someone"],
    date: "2026-01-01",
  };
  return {
    schemaVersion: 2,
    program: {
      id: "p", slug: "p", title: "P", status: "complete", baseline: "abc1234 (main)",
      started: "2026-01-01", completed: "2026-01-02", versionSpan: { from: "1.0.0", to: "1.1.0" },
    },
    masthead: { eyebrow: "Show Report", title: "P", dek: "complete" },
    stats: [{ id: "epics", value: "1/1", label: "epics shipped", derived: true }],
    outcome: "1 of 1 items dispositioned.",
    needsYou: [{ id: "Q-001", title: "Do the thing", reason: "because", href: "https://example.invalid/q/1" }],
    sections: [{ id: "wave-1", title: "Wave 1", note: "A section note.", rows: [row] }],
    corrections: { checked: 1, corrected: 1, unverifiable: 0, scopeNote: "scope", highlights: [row] },
    parked: [{ title: "Parked", reason: "reason" }],
    close: { dodVerdict: "GO", driftVerdict: "clean", deviations: ["one"] },
    cast: [{ name: "claude", commits: 1, source: "commit-trailer" }],
    provenance: { sources: ["docs/plans/p/PLAN.md"], compiledAt: "2026-01-02", templateVersion: "v-test" },
  };
}

/**
 * Mustache resolves a name against the whole context stack, so a tag inside
 * `{{#rows}}` may name a row field OR anything above it. Flattening a sample of
 * every list scope mirrors that lookup closely enough to catch a name that
 * exists nowhere at all -- which is the failure this check exists for.
 */
function buildLookupScope(view: Record<string, unknown>): Record<string, unknown> {
  const first = (value: unknown): Record<string, unknown> =>
    Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null
      ? (value[0] as Record<string, unknown>)
      : {};
  const sections = first(view.sections);
  const corrections = (view.corrections ?? {}) as Record<string, unknown>;
  return {
    ...view,
    ...sections,
    ...first(sections.rows),
    ...corrections,
    ...first(corrections.highlights),
    ...first(view.stats),
    ...first(view.parked),
    ...first(view.cast),
    ...first(view.legend),
    ...first(view.needsYou),
  };
}

function resolves(scope: Record<string, unknown>, tag: string): boolean {
  const [head, ...rest] = tag.split(".");
  let current: unknown = scope[head!];
  if (current === undefined) return false;
  for (const key of rest) {
    if (current === null || typeof current !== "object") return false;
    current = (current as Record<string, unknown>)[key];
    if (current === undefined) return false;
  }
  return true;
}

async function committedModels(): Promise<{ slug: string; model: ShowReport }[]> {
  const plansDir = join(ROOT, "docs", "plans");
  const out: { slug: string; model: ShowReport }[] = [];
  let entries: string[];
  try {
    entries = await readdir(plansDir);
  } catch {
    return out;
  }
  for (const slug of entries.sort()) {
    try {
      const raw = await readFile(join(plansDir, slug, "show-report.json"), "utf8");
      out.push({ slug, model: JSON.parse(raw) as ShowReport });
    } catch {
      // No committed report for this program; check:report owns that concern.
    }
  }
  return out;
}

async function main(): Promise<void> {
  const failures: Failure[] = [];
  const templatePath = join(ROOT, TEMPLATE_RELPATH);
  let template: string;
  try {
    template = await readFile(templatePath, "utf8");
  } catch {
    console.error(`Report template check: cannot read ${TEMPLATE_RELPATH}.`);
    process.exit(1);
  }

  const fail = (rule: string, detail: string): void => void failures.push({ rule, detail });

  // --- the artifact itself -------------------------------------------------
  // The template must say where it came from, in a comment near the top. A
  // compiled artifact names the arcane-ui build; the hand-authored interim one
  // says so instead. Either is a declared origin; silence is not.
  const head = template.slice(0, 600);
  if (!/<!--[^]*?(arcane-ui v\d+\.\d+\.\d+|\(interim\))/.test(head)) {
    fail(
      "declared origin",
      "no opening HTML comment naming either the arcane-ui build (`arcane-ui vX.Y.Z`) or the interim template",
    );
  }
  if (Buffer.byteLength(template) > MAX_BYTES) {
    fail("size budget", `${Buffer.byteLength(template)} bytes exceeds ${MAX_BYTES}`);
  }
  if (/<script/i.test(template)) {
    fail("zero runtime JS", "the report is a static document; it must contain no <script>");
  }
  // A generated document is opened directly from disk, so the head has to stand alone.
  if (!/<title[\s>]/i.test(template)) {
    fail("page title", "no <title> element -- WCAG 2.1 SC 2.4.2 (Page Titled, Level A) fails on every generated report");
  }
  if (!/<html[^>]+lang=/i.test(template)) {
    fail("document language", "no lang attribute on <html> -- WCAG 2.1 SC 3.1.1 (Level A)");
  }
  if (!/name=["']viewport["']/i.test(template)) {
    fail("viewport", "no viewport meta -- the report does not scale on a phone");
  }

  // --- does every tag name something that exists? --------------------------
  const models = await committedModels();
  if (models.length === 0) {
    console.log("Report template check: no committed show-report.json to render against; skipped the binding checks.");
  }

  const tags = templateTags(template);

  // Dead-tag detection runs ONCE, against the maximal model -- see its comment
  // for why real data is the wrong yardstick here.
  const maximalScope = buildLookupScope(buildShowReportView(maximalModel()));
  const dead = tags.filter((tag) => !resolves(maximalScope, tag)).sort();
  if (dead.length > 0) {
    fail(
      "dead tags",
      `${dead.join(", ")} name nothing the schema can produce (mustache renders these as empty strings, silently)`,
    );
  }

  for (const { slug, model } of models) {
    const html = renderShowReport(model, template);
    if (html.includes("{{")) fail("unrendered tags", `${slug}: an unrendered {{ }} survived into the output`);
    if (!/<h1[^>]*>\s*\S/.test(html)) fail("empty h1", `${slug}: the <h1> renders empty`);
    if (renderShowReport(model, template) !== html) {
      fail("determinism", `${slug}: two renders of the same model differ -- check:report cannot be a gate`);
    }

    // An epic with no **Report:** line must be visibly unwritten, never blank (SR-04).
    const probe = JSON.parse(JSON.stringify(model)) as ShowReport;
    const firstRow = probe.sections[0]?.rows[0];
    if (firstRow) {
      firstRow.description = null;
      firstRow.descriptionState = "unwritten";
      if (!/unwritten/i.test(renderShowReport(probe, template))) {
        fail("unwritten state", `${slug}: a row with no description renders blank instead of visibly unwritten`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`Report template check FAILED (${failures.length}):\n`);
    for (const { rule, detail } of failures) console.error(`  [${rule}] ${detail}`);
    console.error(`\nThe template is built in arcane-ui and vendored here; fix it there and re-vendor.`);
    process.exit(1);
  }

  console.log(
    `Report template check passed: ${TEMPLATE_RELPATH} (${Buffer.byteLength(template)} bytes, ${tags.length} tags) ` +
      `renders ${models.length} committed program(s) with no dead tags.`,
  );
}

void main();
