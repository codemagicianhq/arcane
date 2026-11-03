/**
 * scripts/lib/demos/render-svg.ts
 *
 * Renders a demo's frames as one animated SVG that GitHub and npm display
 * through <img> (ARC-058). No script: the frames are stacked into a filmstrip
 * and a CSS animation with step timing moves it one frame at a time, the same
 * technique as other terminal-to-SVG renderers. Rows are defined once in
 * <defs> and reused by every frame that shows them, which keeps the file small.
 *
 * The file carries the Arcane version twice: `data-arcane-version` on the root
 * element, which `npm run check:demos` reads, and the window title, which a
 * reader sees. Under prefers-reduced-motion, or wherever CSS animation does
 * not run, the last frame is shown still.
 *
 * Output is a pure function of its input: the same frames and version always
 * give the same bytes, which is what lets the check compare files exactly.
 */

import type { CellStyle, ScreenSnapshot, StyledRun } from "./terminal.js";
import type { DemoFrame } from "./capture.js";

export const FONT_SIZE = 14;
/** The advance of one cell; 0.6em matches common monospace fonts. */
export const CELL_WIDTH = 8.4;
export const LINE_HEIGHT = 18;
const PAD_X = 16;
const PAD_Y = 12;
const TITLE_BAR = 36;
const BASELINE = 13.5;

const BACKGROUND = "#15121d";
const BORDER = "#2d2640";
const TITLE_BAR_FILL = "#221b33";
const TITLE_TEXT = "#8a7fb0";
export const DEFAULT_FOREGROUND = "#e6e1f0";
const FONT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'DejaVu Sans Mono', 'Liberation Mono', monospace";

export interface RenderOptions {
  /** The file's id, written as `data-demo`. */
  id: string;
  /** Shown in the title bar and as <title>. */
  title: string;
  /** Written as <desc>. */
  description: string;
  version: string;
  cols: number;
  rows: number;
}

// Characters XML 1.0 does not allow anywhere in a document: most C0 controls,
// lone surrogates, U+FFFE and U+FFFF.
// eslint-disable-next-line no-control-regex -- these control characters are exactly what must not reach the file.
const XML_INVALID = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

/** Escape text for XML content or a quoted attribute; characters XML forbids become U+FFFD. */
export function escapeXml(value: string): string {
  return value
    .replace(XML_INVALID, "\ufffd")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A number as SVG wants it: at most two decimals, no trailing zeros. */
function num(value: number): string {
  return String(Number(value.toFixed(2)));
}

function styleKey(style: CellStyle): string {
  return JSON.stringify(style);
}

/** The CSS for one cell style; inverse swaps foreground and background. */
function styleCss(style: CellStyle): string {
  let fg = style.fg ?? DEFAULT_FOREGROUND;
  if (style.inverse) fg = style.bg ?? BACKGROUND;
  const parts = [`fill:${fg}`];
  if (style.bold) parts.push("font-weight:700");
  if (style.hidden) parts.push("fill-opacity:0");
  else if (style.dim) parts.push("fill-opacity:.6");
  if (style.italic) parts.push("font-style:italic");
  const lines = [style.underline ? "underline" : "", style.strike ? "line-through" : ""].filter(Boolean);
  if (lines.length > 0) parts.push(`text-decoration:${lines.join(" ")}`);
  return parts.join(";");
}

function runBackground(style: CellStyle): string | null {
  if (style.inverse) return style.fg ?? DEFAULT_FOREGROUND;
  return style.bg;
}

class StyleTable {
  private readonly classes = new Map<string, string>();
  private readonly css: string[] = [];

  classFor(style: CellStyle): string {
    const key = styleKey(style);
    let name = this.classes.get(key);
    if (name === undefined) {
      name = `s${this.classes.size}`;
      this.classes.set(key, name);
      this.css.push(`.${name}{${styleCss(style)}}`);
    }
    return name;
  }

  rules(): string[] {
    return this.css;
  }
}

function renderRow(runs: StyledRun[], styles: StyleTable): string {
  const backgrounds: string[] = [];
  const spans: string[] = [];
  runs.forEach((run) => {
    const x = num(run.col * CELL_WIDTH);
    const background = runBackground(run.style);
    if (background !== null) {
      const width = run.cells * CELL_WIDTH;
      backgrounds.push(`<rect x="${x}" width="${num(width)}" height="${LINE_HEIGHT}" fill="${background}"/>`);
    }
    // Blank text draws nothing, unless it carries a line (an underlined gap).
    if (run.text.trim() === "" && !run.style.underline && !run.style.strike) return;
    spans.push(`<tspan x="${x}" class="${styles.classFor(run.style)}">${escapeXml(run.text)}</tspan>`);
  });
  const text = spans.length > 0 ? `<text y="${BASELINE}">${spans.join("")}</text>` : "";
  return backgrounds.join("") + text;
}

function rowKey(runs: StyledRun[]): string {
  return JSON.stringify(runs);
}

/** Render frames as an animated SVG document. */
export function renderDemoSvg(frames: DemoFrame[], options: RenderOptions): string {
  if (frames.length === 0) throw new Error(`Demo "${options.id}" has no frames to render.`);
  const styles = new StyleTable();
  const rowIds = new Map<string, string>();
  const rowDefs: string[] = [];
  const screenWidth = options.cols * CELL_WIDTH;
  const frameHeight = options.rows * LINE_HEIGHT;
  const width = num(PAD_X * 2 + screenWidth);
  const height = num(TITLE_BAR + PAD_Y * 2 + frameHeight);

  const rowRef = (runs: StyledRun[]): string | null => {
    if (runs.length === 0) return null;
    const key = rowKey(runs);
    let id = rowIds.get(key);
    if (id === undefined) {
      id = `r${rowIds.size}`;
      rowIds.set(key, id);
      rowDefs.push(`<g id="${id}">${renderRow(runs, styles)}</g>`);
    }
    return id;
  };

  const frameGroups = frames.map((frame, index) => {
    const parts: string[] = [];
    frame.screen.rows.forEach((runs, row) => {
      const id = rowRef(runs);
      if (id !== null) parts.push(`<use href="#${id}" y="${row * LINE_HEIGHT}"/>`);
    });
    const cursor = cursorRect(frame.screen);
    if (cursor !== null) parts.push(cursor);
    return `<g transform="translate(0 ${index * frameHeight})">${parts.join("")}</g>`;
  });

  const total = frames.reduce((sum, frame) => sum + frame.durationMs, 0);
  if (!(total > 0)) throw new Error(`Demo "${options.id}" has no duration to animate (${total} ms).`);
  const lastOffset = (frames.length - 1) * frameHeight;
  const keyframes: string[] = [];
  let elapsed = 0;
  frames.forEach((frame, index) => {
    keyframes.push(`${(elapsed / total * 100).toFixed(3)}%{transform:translateY(-${index * frameHeight}px)}`);
    elapsed += frame.durationMs;
  });
  keyframes.push(`100%{transform:translateY(-${lastOffset}px)}`);

  const title = `spell ${options.title} — arcane-cli ${options.version}`;
  const css = [
    `text{font-family:${FONT_FAMILY};font-size:${FONT_SIZE}px;white-space:pre}`,
    ...styles.rules(),
    `.film{transform:translateY(-${lastOffset}px);animation:film ${total}ms steps(1,end) infinite}`,
    `@keyframes film{${keyframes.join("")}}`,
    "@media (prefers-reduced-motion:reduce){.film{animation:none}}",
  ].join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-demo="${escapeXml(options.id)}" data-arcane-version="${escapeXml(options.version)}">`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="desc">${escapeXml(options.description)}</desc>`,
    `<style>\n${css}\n</style>`,
    `<defs>\n${rowDefs.join("\n")}\n</defs>`,
    `<rect x="1" y="1" width="${num(PAD_X * 2 + screenWidth - 2)}" height="${num(TITLE_BAR + PAD_Y * 2 + frameHeight - 2)}" rx="10" fill="${BACKGROUND}" stroke="${BORDER}" stroke-width="1.5"/>`,
    `<path d="M1 11a10 10 0 0 1 10-10h${num(PAD_X * 2 + screenWidth - 22)}a10 10 0 0 1 10 10v${TITLE_BAR - 11}h-${num(PAD_X * 2 + screenWidth - 2)}z" fill="${TITLE_BAR_FILL}"/>`,
    `<circle cx="22" cy="18" r="5.5" fill="#ff5f56"/><circle cx="42" cy="18" r="5.5" fill="#ffbd2e"/><circle cx="62" cy="18" r="5.5" fill="#27c93f"/>`,
    `<text x="${num((PAD_X * 2 + screenWidth) / 2)}" y="22.5" text-anchor="middle" style="font-size:12.5px;fill:${TITLE_TEXT}">${escapeXml(title)}</text>`,
    `<svg x="${PAD_X}" y="${TITLE_BAR + PAD_Y}" width="${num(screenWidth)}" height="${frameHeight}" viewBox="0 0 ${num(screenWidth)} ${frameHeight}">`,
    `<g class="film">`,
    frameGroups.join("\n"),
    `</g>`,
    `</svg>`,
    `</svg>`,
    "",
  ].join("\n");
}

function cursorRect(screen: ScreenSnapshot): string | null {
  if (screen.cursor === null) return null;
  const { row, col } = screen.cursor;
  return `<rect x="${num(col * CELL_WIDTH)}" y="${row * LINE_HEIGHT + 2}" width="${CELL_WIDTH}" height="${LINE_HEIGHT - 3}" fill="${DEFAULT_FOREGROUND}" fill-opacity=".55"/>`;
}

/** The version a rendered demo was stamped with, or null when it carries none. */
export function stampedVersion(svg: string): string | null {
  const match = /^<svg\b[^>]*\sdata-arcane-version="([^"]*)"/.exec(svg);
  return match ? match[1] : null;
}
