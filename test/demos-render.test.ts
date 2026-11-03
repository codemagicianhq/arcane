import { describe, expect, it } from "vitest";
import { framesFromEvents } from "../scripts/lib/demos/capture.js";
import type { DemoFrame } from "../scripts/lib/demos/capture.js";
import { LINE_HEIGHT, escapeXml, renderDemoSvg, stampedVersion } from "../scripts/lib/demos/render-svg.js";
import type { RenderOptions } from "../scripts/lib/demos/render-svg.js";

/**
 * ARC-058: the animated SVG renderer. GitHub and npm show the file through
 * <img>, which runs no script and loads nothing external, and the staleness
 * check compares files byte for byte, so the output must be self-contained
 * and a pure function of its input.
 */

const OPTIONS: RenderOptions = {
  id: "sample",
  title: "init",
  description: "A sample <demo> & more.",
  version: "9.8.7",
  cols: 20,
  rows: 3,
};

function frames(...outputs: Array<[string, number]>): DemoFrame[] {
  return framesFromEvents(
    outputs.map(([output, holdMs]) => ({ output, holdMs })),
    OPTIONS.cols,
    OPTIONS.rows,
  );
}

describe("renderDemoSvg", () => {
  it("is deterministic: the same frames render to the same bytes", () => {
    const input = frames(["$ ", 500], ["spell", 100], ["\nok\n", 900]);
    expect(renderDemoSvg(input, OPTIONS)).toBe(renderDemoSvg(input, OPTIONS));
  });

  it("stamps the version on the root element and in the visible title", () => {
    const svg = renderDemoSvg(frames(["x", 100]), OPTIONS);
    expect(svg).toMatch(/^<svg [^>]*data-arcane-version="9\.8\.7"/);
    expect(svg).toContain("<title id=\"title\">spell init — arcane-cli 9.8.7</title>");
    expect(svg).toMatch(/<text [^>]*text-anchor="middle"[^>]*>spell init — arcane-cli 9\.8\.7<\/text>/);
    expect(stampedVersion(svg)).toBe("9.8.7");
  });

  it("reads no version from a file without a stamp, or from a stamp outside the root element", () => {
    expect(stampedVersion('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBeNull();
    expect(stampedVersion('<svg><g data-arcane-version="1.0.0"/></svg>')).toBeNull();
  });

  it("escapes markup in terminal text, the title and the description", () => {
    const svg = renderDemoSvg(frames(["<b>&\"x\"</b>", 100]), OPTIONS);
    expect(svg).toContain("&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;");
    expect(svg).toContain("<desc id=\"desc\">A sample &lt;demo&gt; &amp; more.</desc>");
    expect(escapeXml('a<&>"')).toBe("a&lt;&amp;&gt;&quot;");
  });

  it("contains no script, no event handler and no reference outside the file", () => {
    const svg = renderDemoSvg(frames(["javascript:alert(1) <script>", 100]), OPTIONS);
    expect(svg).not.toMatch(/<script/i);
    expect(svg).not.toMatch(/\son[a-z]+=/i);
    for (const match of svg.matchAll(/href="([^"]*)"/g)) expect(match[1]).toMatch(/^#r\d+$/);
    expect(svg).not.toMatch(/url\(|@import/);
  });

  it("defines each distinct row once and reuses it across frames", () => {
    const svg = renderDemoSvg(frames(["same\n", 100], ["a", 100], ["b", 100]), OPTIONS);
    expect(svg.match(/<g id="r\d+">/g)).toHaveLength(3); // "same", "a", "ab"
    expect(svg.match(/<use href="#r0"/g)).toHaveLength(3);
  });

  it("places rows by line height and skips blank ones", () => {
    const svg = renderDemoSvg(frames(["\n\nthird", 100]), OPTIONS);
    expect(svg).toContain(`<use href="#r0" y="${2 * LINE_HEIGHT}"/>`);
    expect(svg.match(/<use /g)).toHaveLength(1);
  });

  it("steps through one keyframe per frame, timed by each frame's duration, and holds the last", () => {
    const svg = renderDemoSvg(frames(["a", 250], ["b", 250], ["c", 500]), OPTIONS);
    const frameHeight = OPTIONS.rows * LINE_HEIGHT;
    expect(svg).toContain("animation:film 1000ms steps(1,end) infinite");
    expect(svg).toContain(
      `@keyframes film{0.000%{transform:translateY(-0px)}25.000%{transform:translateY(-${frameHeight}px)}` +
        `50.000%{transform:translateY(-${2 * frameHeight}px)}100%{transform:translateY(-${2 * frameHeight}px)}}`,
    );
  });

  it("shows the last frame still when motion is reduced, and wherever the animation does not run", () => {
    const svg = renderDemoSvg(frames(["a", 100], ["b", 100]), OPTIONS);
    const lastOffset = OPTIONS.rows * LINE_HEIGHT;
    expect(svg).toContain(`.film{transform:translateY(-${lastOffset}px);animation:`);
    expect(svg).toContain("@media (prefers-reduced-motion:reduce){.film{animation:none}}");
  });

  it("draws the cursor only while it is visible", () => {
    expect(renderDemoSvg(frames(["a", 100]), OPTIONS)).toContain('fill-opacity=".55"');
    expect(renderDemoSvg(frames(["\u001b[?25la", 100]), OPTIONS)).not.toContain('fill-opacity=".55"');
  });

  it("gives each distinct style one class: colour, bold, dim, italic, underline", () => {
    const svg = renderDemoSvg(frames(["\u001b[1;38;2;1;2;3ma\u001b[0;2;3;4mb\u001b[0m", 100]), OPTIONS);
    expect(svg).toContain("{fill:#010203;font-weight:700}");
    expect(svg).toMatch(/\{fill:#[0-9a-f]{6};fill-opacity:\.6;font-style:italic;text-decoration:underline\}/);
  });

  it("paints backgrounds, and swaps colours for inverse text", () => {
    const svg = renderDemoSvg(frames(["\u001b[48;2;9;9;9mbg\u001b[0m \u001b[7;38;2;1;1;1minv", 100]), OPTIONS);
    expect(svg).toContain('fill="#090909"');
    expect(svg).toContain('fill="#010101"');
    expect(svg).toMatch(/\{fill:#15121d\}/);
  });

  it("refuses to render no frames", () => {
    expect(() => renderDemoSvg([], OPTIONS)).toThrow(/no frames/);
  });
});

describe("renderDemoSvg edge cases found in review", () => {
  it("draws hidden text invisibly and strikethrough as a line", () => {
    const svg = renderDemoSvg(frames(["\u001b[8ma\u001b[0;9mb\u001b[4mc", 100]), OPTIONS);
    expect(svg).toMatch(/\{fill:#[0-9a-f]{6};fill-opacity:0\}/);
    expect(svg).toMatch(/\{fill:#[0-9a-f]{6};text-decoration:line-through\}/);
    expect(svg).toMatch(/\{fill:#[0-9a-f]{6};text-decoration:underline line-through\}/);
  });

  it("draws an underlined gap, which is only spaces", () => {
    const svg = renderDemoSvg(frames(["a\u001b[4m   \u001b[0mb", 100]), OPTIONS);
    expect(svg).toMatch(/<tspan x="8\.4" class="s\d+"> {3}<\/tspan>/);
  });

  it("refuses frames that add up to no time", () => {
    expect(() => renderDemoSvg(frames(["a", 0]), OPTIONS)).toThrow(/no duration to animate/);
  });

  it("replaces characters XML forbids, so the file always parses", () => {
    const forbidden = String.fromCharCode(0xfffe) + String.fromCharCode(0xffff) + String.fromCharCode(0xd800) + "\u000b";
    const replacement = String.fromCodePoint(0xfffd);
    expect(escapeXml(`a${forbidden}b`)).toBe(`a${replacement.repeat(4)}b`);
    const pair = String.fromCodePoint(0x1f600);
    expect(escapeXml(pair)).toBe(pair);
  });

  it("sizes a trailing background by cells, not by code points", () => {
    const pencil = String.fromCodePoint(0x270f) + String.fromCodePoint(0xfe0f);
    const svg = renderDemoSvg(frames([`\u001b[44mab${pencil}`, 100]), OPTIONS);
    // "ab" and the emoji VS16 widens to two cells: four cells in all.
    expect(svg).toContain('<rect x="0" width="33.6"');
  });
});
