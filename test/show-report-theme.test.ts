import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { applyReportTheme, REPORT_THEMES } from "../src/modules/show-report/theme.js";

const TEMPLATE_PATH = join(process.cwd(), "src", "assets", "report", "show-report.template.html");

// Matches the real vendored template's shape: "auto" ships pre-checked (arcane-ui's
// own default selection), "light"/"dark" do not.
const SYNTHETIC_HTML =
  '<input type="radio" id="arcane-report-theme-auto" name="t" checked="" value="auto"><label for="arcane-report-theme-auto">Auto</label>' +
  '<input type="radio" id="arcane-report-theme-light" name="t" value="light"><label for="arcane-report-theme-light">Light</label>' +
  '<input type="radio" id="arcane-report-theme-dark" name="t" value="dark"/><label for="arcane-report-theme-dark">Dark</label>';

function checkedRadioIds(html: string): string[] {
  return REPORT_THEMES.filter((id) => new RegExp(`id="arcane-report-theme-${id}"[^>]*\\bchecked\\b`).test(html));
}

describe("show-report theme: applyReportTheme (synthetic markup)", () => {
  it("lists exactly auto, light, dark", () => {
    expect(REPORT_THEMES).toEqual(["auto", "light", "dark"]);
  });

  it("auto is a byte-for-byte no-op, leaving the shipped pre-checked auto radio as-is", () => {
    const result = applyReportTheme(SYNTHETIC_HTML, "auto");
    expect(result).toEqual({ html: SYNTHETIC_HTML, applied: true });
    expect(checkedRadioIds(result.html)).toEqual(["auto"]);
  });

  it("light moves checked off auto and onto light -- exactly one radio ends up checked", () => {
    const result = applyReportTheme(SYNTHETIC_HTML, "light");
    expect(result.applied).toBe(true);
    expect(checkedRadioIds(result.html)).toEqual(["light"]);
    expect(result.html).not.toContain('id="arcane-report-theme-auto" name="t" checked');
  });

  it("dark moves checked off auto and onto dark, across a self-closing tag", () => {
    const result = applyReportTheme(SYNTHETIC_HTML, "dark");
    expect(result.applied).toBe(true);
    expect(checkedRadioIds(result.html)).toEqual(["dark"]);
    expect(result.html).toContain('id="arcane-report-theme-dark" name="t" value="dark" checked/>');
  });

  it("reports applied: false and leaves html untouched when the template has no toggle", () => {
    const noToggle = "<html><body>no toggle here</body></html>";
    const result = applyReportTheme(noToggle, "dark");
    expect(result).toEqual({ html: noToggle, applied: false });
  });
});

describe("show-report theme: applyReportTheme (real vendored template)", () => {
  it("the vendored template ships with auto pre-checked, and only auto", async () => {
    const html = await readFile(TEMPLATE_PATH, "utf8");
    expect(checkedRadioIds(html)).toEqual(["auto"]);
  });

  it("auto reproduces the real template byte-for-byte", async () => {
    const html = await readFile(TEMPLATE_PATH, "utf8");
    expect(applyReportTheme(html, "auto")).toEqual({ html, applied: true });
  });

  it("light and dark each end up as the one checked radio in the real template", async () => {
    const html = await readFile(TEMPLATE_PATH, "utf8");
    for (const theme of ["light", "dark"] as const) {
      const result = applyReportTheme(html, theme);
      expect(result.applied).toBe(true);
      expect(result.html).not.toBe(html);
      expect(checkedRadioIds(result.html)).toEqual([theme]);
    }
  });
});
