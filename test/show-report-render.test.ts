import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildShowReportView,
  escapeHtml,
  inlineMarkupToHtml,
  renderShowReport,
} from "../src/modules/show-report/render.js";
import type { ShowReport } from "../src/modules/show-report/types.js";

const ROOT_DIR = process.cwd();
const TEMPLATE_PATH = join(ROOT_DIR, "src", "assets", "report", "show-report.template.html");

function minimalModel(overrides: Partial<ShowReport> = {}): ShowReport {
  return {
    schemaVersion: 2,
    program: {
      id: "test",
      slug: "test",
      title: "Test Program",
      status: "complete",
      baseline: "abc1234 (main)",
      started: "2026-09-01",
      completed: "2026-09-02",
      versionSpan: { from: "1.0.0", to: "1.1.0" },
    },
    masthead: { eyebrow: "Show Report", title: "Test Program", dek: "complete — 1 of 1 epics shipped" },
    stats: [{ id: "epics", value: "1/1", label: "epics shipped", derived: true }],
    needsYou: [],
    sections: [
      {
        id: "wave-1",
        title: "Wave 1 — Setup",
        rows: [
          {
            id: "TP-01",
            title: "First epic",
            description: "Shipped `code` and a [link](https://example.invalid/x).",
            descriptionState: "authored",
            category: "feature",
            href: "https://github.com/codemagicianhq/arcane/pull/10",
            refs: ["https://github.com/codemagicianhq/arcane/pull/10"],
          },
        ],
      },
    ],
    parked: [],
    cast: [],
    provenance: { sources: ["docs/plans/test/PLAN.md"], compiledAt: "2026-09-02", templateVersion: "v0-test" },
    ...overrides,
  };
}

describe("show-report render: escapeHtml / inlineMarkupToHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });

  it("re-admits only backtick code spans and http(s) markdown links, everything else stays escaped", () => {
    expect(inlineMarkupToHtml("Use `spell report` and see [docs](https://example.invalid/d) <script>")).toBe(
      'Use <code>spell report</code> and see <a href="https://example.invalid/d">docs</a> &lt;script&gt;',
    );
  });

  it("does not turn a non-http scheme into a link", () => {
    expect(inlineMarkupToHtml("[bad](javascript:alert(1))")).toBe("[bad](javascript:alert(1))");
  });

  it("cannot break out of the href attribute with a quote in the URL", () => {
    const out = inlineMarkupToHtml('[x](https://example.invalid/a"onmouseover="y)');
    expect(out).not.toContain('"onmouseover=');
    expect(out).toContain("&quot;onmouseover=&quot;");
  });
});

describe("show-report render: buildShowReportView", () => {
  it("precomputes category labels, description HTML, and the boolean flags mustache needs", () => {
    const view = buildShowReportView(minimalModel()) as {
      sections: { rowCount: number; rows: { categoryLabel: string; descriptionHtml: string; isUnwritten: boolean; hasHref: boolean }[] }[];
      hasCorrections: boolean;
      hasParked: boolean;
      parkedCount: number;
      needsYouCount: number;
      compiledAtDate: string;
      legend: { key: string; label: string }[];
    };
    const row = view.sections[0]!.rows[0]!;
    expect(row.categoryLabel).toBe("New Feature");
    expect(row.descriptionHtml).toBe(
      'Shipped <code>code</code> and a <a href="https://example.invalid/x">link</a>.',
    );
    expect(row.isUnwritten).toBe(false);
    expect(row.hasHref).toBe(true);
    expect(view.hasCorrections).toBe(false);
    expect(view.hasParked).toBe(false);
    expect(view.needsYouCount).toBe(0);
    // Mustache cannot count a list, so counts a template needs are precomputed.
    expect(view.sections[0]!.rowCount).toBe(1);
    expect(view.parkedCount).toBe(0);
    expect(view.compiledAtDate).toBe("2026-09-02");
    expect(view.legend.map((l) => l.key)).toEqual([
      "spell",
      "feature",
      "governance",
      "decision",
      "fix",
      "process",
      "docs",
      "platform",
    ]);
  });
});

describe("show-report render: renderShowReport against the real v0 template", () => {
  it("renders a full standalone document with the stats, the row, its link, and the escaped description", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    const html = renderShowReport(minimalModel(), template);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Test Program</title>");
    expect(html).toContain("<dd>1/1</dd><dt>epics shipped</dt>");
    expect(html).toContain('<a href="https://github.com/codemagicianhq/arcane/pull/10">First epic</a>');
    expect(html).toContain("Shipped <code>code</code> and a <a href=\"https://example.invalid/x\">link</a>.");
    expect(html).toContain('<span class="pill feature">New Feature</span>');
    expect(html).not.toContain("{{"); // every tag resolved, nothing left unrendered
  });

  it("renders the explicit empty state when nothing needs the operator", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    const html = renderShowReport(minimalModel(), template);
    expect(html).toContain("Nothing needs you");
    expect(html).not.toContain("Needs you:");
  });

  it("renders a Needs-you block with the count when queue items are open", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    const html = renderShowReport(
      minimalModel({ needsYou: [{ id: "Q-001", title: "Merge it", reason: "It is the grant." }] }),
      template,
    );
    expect(html).toContain("Needs you: 1");
    expect(html).toContain("<strong>Q-001</strong> — Merge it");
    expect(html).not.toContain("Nothing needs you");
  });

  it("renders an unwritten description visibly as 'unwritten', never as a faked sentence", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    const model = minimalModel();
    model.sections[0]!.rows[0]!.description = null;
    model.sections[0]!.rows[0]!.descriptionState = "unwritten";
    const html = renderShowReport(model, template);
    expect(html).toContain('<div class="item-desc unwritten">unwritten</div>');
  });

  it("HTML-escapes plain fields so a title cannot inject markup", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    const model = minimalModel();
    model.masthead.title = "<img src=x onerror=alert(1)>";
    const html = renderShowReport(model, template);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("counts rows per section and parked items, for templates that label a list with its size", () => {
    const model = minimalModel({
      parked: [
        { title: "Pattern 6", reason: "already codified elsewhere." },
        { title: "FEEDBACK.md", reason: "not created, out of scope." },
      ],
    });
    model.sections[0]!.rows.push({
      id: "TP-02",
      title: "Second epic",
      description: null,
      descriptionState: "unwritten",
      category: "docs",
      refs: [],
    });
    const view = buildShowReportView(model) as {
      sections: { rowCount: number }[];
      parkedCount: number;
      hasParked: boolean;
    };
    expect(view.sections[0]!.rowCount).toBe(2);
    expect(view.parkedCount).toBe(2);
    expect(view.hasParked).toBe(true);
  });

  it("draws each row's mark from its category via the inline sprite, with no emoji anywhere", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    const html = renderShowReport(minimalModel(), template);
    // The row's icon is selected by category alone (ARC-043) ...
    expect(html).toContain('<svg class="cat-icon feature" aria-hidden="true" focusable="false"><use href="#cat-feature">');
    // ... and every category the legend advertises must have a symbol to point at.
    for (const key of ["spell", "feature", "governance", "decision", "fix", "process", "docs", "platform"]) {
      expect(html).toContain(`<symbol id="cat-${key}"`);
    }
    // Decorative only: the pill still carries the category as text.
    expect(html).toContain('<span class="pill feature">New Feature</span>');
    expect(html).not.toContain('class="emoji"');
    // No emoji survived into the rendered document.
    expect(/\p{Extended_Pictographic}/u.test(html)).toBe(false);
  });

  it("is deterministic: rendering the same model twice yields identical bytes", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    expect(renderShowReport(minimalModel(), template)).toBe(renderShowReport(minimalModel(), template));
  });
});
