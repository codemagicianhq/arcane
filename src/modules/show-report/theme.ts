/**
 * Applies a build-time theme selection to a rendered Show Report page (SR-UP06,
 * closes arcane#271) by moving the `checked` attribute in the vendored
 * template's theme toggle (arcane-ui ARCUI-021, three radios sharing
 * `name="arcane-report-theme"`, ids `arcane-report-theme-<mode>`) onto the
 * requested radio.
 *
 * "auto" is a deliberate no-op: arcane-ui ships the template with
 * `arcane-report-theme-auto` pre-checked and no CSS override tied to it, so
 * the unmodified template already reproduces today's `prefers-color-scheme`
 * behaviour byte-for-byte (OPERATOR-QUEUE.md Q-006's requirement). This
 * never touches the html when `theme` is "auto" -- including the default
 * codepath used by every existing `show-report.html` golden, which must
 * stay unaffected.
 */

export type ReportTheme = "auto" | "light" | "dark";

export const REPORT_THEMES: readonly ReportTheme[] = ["auto", "light", "dark"];

export interface ApplyReportThemeResult {
  html: string;
  /** False when `theme` isn't "auto" but the template has no matching toggle to set (older template). */
  applied: boolean;
}

function radioTagPattern(id: ReportTheme): RegExp {
  return new RegExp(`<input\\b[^>]*\\bid="arcane-report-theme-${id}"[^>]*?/?>`);
}

function withoutChecked(tag: string): string {
  return tag.replace(/\s+checked(?:="[^"]*")?/, "");
}

function withChecked(tag: string): string {
  return /\bchecked\b/.test(tag) ? tag : tag.replace(/(\/?>)$/, " checked$1");
}

export function applyReportTheme(html: string, theme: ReportTheme): ApplyReportThemeResult {
  if (theme === "auto") return { html, applied: true };
  if (!radioTagPattern(theme).test(html)) return { html, applied: false };

  let result = html;
  // Move `checked` onto the target radio: strip it from every other radio in the
  // group first (arcane-ui ships "auto" pre-checked by default), so exactly one
  // radio ends up checked rather than leaving two marked at once.
  for (const id of REPORT_THEMES) {
    const match = radioTagPattern(id).exec(result);
    if (!match) continue;
    const original = match[0];
    const replaced = id === theme ? withChecked(original) : withoutChecked(original);
    if (replaced !== original) {
      result = result.slice(0, match.index) + replaced + result.slice(match.index + original.length);
    }
  }
  return { html: result, applied: true };
}
