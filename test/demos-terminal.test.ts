import { describe, expect, it } from "vitest";
import { ANSI_PALETTE, VirtualTerminal, cellWidth, isZeroWidth, xterm256 } from "../scripts/lib/demos/terminal.js";
import type { StyledRun } from "../scripts/lib/demos/terminal.js";

/**
 * ARC-058: the virtual terminal the README demos are played through. A frame
 * is only as right as this grid, so each control sequence the CLI and
 * @inquirer/prompts emit is pinned here.
 */

/** U+270F U+FE0F: a narrow pencil that VS16 asks to draw as a two-cell emoji. */
const PENCIL = String.fromCodePoint(0x270f, 0xfe0f);

function text(runs: StyledRun[]): string {
  let line = "";
  for (const run of runs) line = line.padEnd(run.col, " ") + run.text;
  return line;
}

function screen(terminal: VirtualTerminal): string[] {
  return terminal.snapshot().rows.map(text);
}

describe("VirtualTerminal text and line handling", () => {
  it("prints text and treats LF as CR LF, as a terminal's line discipline does", () => {
    const terminal = new VirtualTerminal(20, 3);
    terminal.write("one\ntwo\r\nthree");
    expect(screen(terminal)).toEqual(["one", "two", "three"]);
  });

  it("overwrites from the start of the line after a lone CR", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write("loading\rdone");
    expect(screen(terminal)).toEqual(["doneing"]);
  });

  it("wraps at the last column only when the next character arrives", () => {
    const terminal = new VirtualTerminal(4, 3);
    terminal.write("abcd");
    expect(terminal.snapshot().cursor).toEqual({ row: 0, col: 3 });
    terminal.write("e");
    expect(screen(terminal)).toEqual(["abcd", "e", ""]);
  });

  it("does not add a blank line when a full-width line ends with LF", () => {
    const terminal = new VirtualTerminal(4, 3);
    terminal.write("abcd\nef");
    expect(screen(terminal)).toEqual(["abcd", "ef", ""]);
  });

  it("scrolls the top row away when output passes the last row", () => {
    const terminal = new VirtualTerminal(10, 2);
    terminal.write("1\n2\n3");
    expect(screen(terminal)).toEqual(["2", "3"]);
  });

  it("drops trailing blanks from a row and keeps leading spaces as a column offset", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write("  indented   ");
    expect(terminal.snapshot().rows[0]).toEqual([expect.objectContaining({ col: 0, text: "  indented" })]);
  });

  it("moves to the next tab stop on TAB and back one cell on BS", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write("a\tb\bc");
    expect(screen(terminal)).toEqual(["a       c"]);
  });

  it("ignores BEL and other C0 controls", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("a\u0007b\u0000c");
    expect(screen(terminal)).toEqual(["abc"]);
  });

  it("refuses a size it cannot draw", () => {
    expect(() => new VirtualTerminal(1, 1)).toThrow(/at least 2 columns/);
    expect(() => new VirtualTerminal(10, 0)).toThrow(/at least 2 columns and 1 row/);
  });
});

describe("VirtualTerminal colours and attributes (SGR)", () => {
  it("applies 16-colour, bright, 256-colour and 24-bit foregrounds, then resets", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write("\u001b[31ma\u001b[94mb\u001b[38;5;196mc\u001b[38;2;168;85;247md\u001b[39me");
    const runs = terminal.snapshot().rows[0];
    expect(runs.map((run) => [run.text, run.style.fg])).toEqual([
      ["a", ANSI_PALETTE[1]],
      ["b", ANSI_PALETTE[12]],
      ["c", "#ff0000"],
      ["d", "#a855f7"],
      ["e", null],
    ]);
  });

  it("tracks bold, dim, italic, underline and inverse, and clears each on its own reset", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write("\u001b[1;2;3;4;7mx\u001b[22;23;24;27my\u001b[0m");
    const [first, second] = terminal.snapshot().rows[0];
    expect(first.style).toMatchObject({ bold: true, dim: true, italic: true, underline: true, inverse: true });
    expect(second.style).toMatchObject({ bold: false, dim: false, italic: false, underline: false, inverse: false });
  });

  it("treats an empty SGR as a full reset", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write("\u001b[1;32ma\u001b[mb");
    expect(terminal.snapshot().rows[0][1].style).toMatchObject({ bold: false, fg: null });
  });

  it("keeps a background colour on erased cells, so a coloured bar survives an erase", () => {
    const terminal = new VirtualTerminal(4, 1);
    terminal.write("\u001b[44m\u001b[2K");
    const runs = terminal.snapshot().rows[0];
    expect(runs[0].style.bg).toBe(ANSI_PALETTE[4]);
    expect(text(runs)).toBe("    ");
  });

  it("maps the 256-colour cube and grey ramp the way xterm does", () => {
    expect(xterm256(16)).toBe("#000000");
    expect(xterm256(231)).toBe("#ffffff");
    expect(xterm256(232)).toBe("#080808");
    expect(xterm256(255)).toBe("#eeeeee");
  });
});

describe("VirtualTerminal cursor control, as @inquirer/prompts redraws a menu", () => {
  it("redraws a two-line prompt in place with cursor-up and erase-line", () => {
    const terminal = new VirtualTerminal(30, 4);
    terminal.write("? Pick one:\n❯ Base\n  Full");
    terminal.write("\u001b[2K\u001b[1A\u001b[2K\u001b[1A\u001b[2K\u001b[G? Pick one:\n  Base\n❯ Full");
    expect(screen(terminal)).toEqual(["? Pick one:", "  Base", "❯ Full", ""]);
  });

  it("moves to an absolute column (CHA) and erases to the end of the line", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write("Name: Athena\u001b[7G\u001b[0KA");
    expect(screen(terminal)).toEqual(["Name: A"]);
  });

  it("positions the cursor absolutely (CUP) and erases the display", () => {
    const terminal = new VirtualTerminal(10, 3);
    terminal.write("aaa\nbbb\nccc\u001b[2;2H\u001b[0J");
    expect(screen(terminal)).toEqual(["aaa", "b", ""]);
    terminal.write("\u001b[2J");
    expect(screen(terminal)).toEqual(["", "", ""]);
  });

  it("clamps cursor movement to the screen", () => {
    const terminal = new VirtualTerminal(5, 2);
    terminal.write("\u001b[9A\u001b[9D\u001b[9C\u001b[9B");
    expect(terminal.snapshot().cursor).toEqual({ row: 1, col: 4 });
  });

  it("hides and shows the cursor", () => {
    const terminal = new VirtualTerminal(5, 1);
    terminal.write("\u001b[?25l");
    expect(terminal.snapshot().cursor).toBeNull();
    terminal.write("\u001b[?25h");
    expect(terminal.snapshot().cursor).toEqual({ row: 0, col: 0 });
  });

  it("saves and restores the cursor and style (ESC 7 / ESC 8)", () => {
    const terminal = new VirtualTerminal(10, 2);
    terminal.write("\u001b[31mab\u001b7\ncd\u001b8e");
    expect(screen(terminal)).toEqual(["abe", "cd"]);
    expect(terminal.snapshot().rows[0][0].style.fg).toBe(ANSI_PALETTE[1]);
  });

  it("swallows OSC strings (hyperlinks, titles) whether BEL- or ST-terminated", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write("\u001b]8;;https://example.invalid\u0007link\u001b]8;;\u001b\\ \u001b]0;title\u0007ok");
    expect(screen(terminal)).toEqual(["link ok"]);
  });

  it("completes an escape sequence split across two writes", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("a\u001b[3");
    terminal.write("1mb");
    expect(text(terminal.snapshot().rows[0])).toBe("ab");
    expect(terminal.snapshot().rows[0][1].style.fg).toBe(ANSI_PALETTE[1]);
  });

  it("ignores private modes other than the cursor and unknown CSI finals", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("\u001b[?2004ha\u001b[5nb\u001b[>0qc");
    expect(screen(terminal)).toEqual(["abc"]);
  });
});

describe("VirtualTerminal character widths", () => {
  it("gives emoji and CJK two cells and ASCII, box drawing and arrows one", () => {
    expect(cellWidth("✨".codePointAt(0)!)).toBe(2);
    expect(cellWidth("🤖".codePointAt(0)!)).toBe(2);
    expect(cellWidth("漢".codePointAt(0)!)).toBe(2);
    expect(cellWidth("a".codePointAt(0)!)).toBe(1);
    expect(cellWidth("─".codePointAt(0)!)).toBe(1);
    expect(cellWidth("❯".codePointAt(0)!)).toBe(1);
    expect(cellWidth("✔".codePointAt(0)!)).toBe(1);
  });

  it("treats combining marks, joiners and variation selectors as zero width", () => {
    for (const codePoint of [0x0301, 0x200d, 0xfe0f, 0x1f3fd]) expect(isZeroWidth(codePoint)).toBe(true);
    expect(isZeroWidth("a".codePointAt(0)!)).toBe(false);
  });

  it("places text after a wide character by column, in a run of its own", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write("✨ 43 Spells");
    const runs = terminal.snapshot().rows[0];
    expect(runs.map((run) => [run.col, run.text])).toEqual([
      [0, "✨"],
      [2, " 43 Spells"],
    ]);
  });

  it("widens a narrow character followed by VS16, and keeps the selector with it", () => {
    const terminal = new VirtualTerminal(20, 1);
    terminal.write(`${PENCIL} Custom`);
    const runs = terminal.snapshot().rows[0];
    expect(runs.map((run) => [run.col, run.text])).toEqual([
      [0, PENCIL],
      [2, " Custom"],
    ]);
  });

  it("wraps a wide character that does not fit in the last column", () => {
    const terminal = new VirtualTerminal(3, 2);
    terminal.write("ab✨");
    expect(screen(terminal)).toEqual(["ab", "✨"]);
  });

  it("blanks both halves of a wide character when either half is overwritten or erased", () => {
    const overwritten = new VirtualTerminal(6, 1);
    overwritten.write("✨x\u001b[2Gy");
    expect(screen(overwritten)).toEqual([" yx"]);

    const erased = new VirtualTerminal(6, 1);
    erased.write("a✨b\u001b[3G\u001b[K");
    expect(screen(erased)).toEqual(["a"]);
  });
});

describe("VirtualTerminal edge cases found in review", () => {
  it("keeps the screen on ESC[3J, which clears only scrollback", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("keep\u001b[3J");
    expect(screen(terminal)).toEqual(["keep"]);
  });

  it("reads colon-form colours and keeps the attributes beside them", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("\u001b[1;38:2::1:2:3mx\u001b[38:5:196my");
    const [first, second] = terminal.snapshot().rows[0];
    expect(first.style).toMatchObject({ bold: true, fg: "#010203" });
    expect(second.style).toMatchObject({ bold: true, fg: "#ff0000" });
  });

  it("drops a 256-colour sequence with no index instead of writing NaN", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("\u001b[31m\u001b[38;5mx");
    expect(terminal.snapshot().rows[0][0].style.fg).toBe(ANSI_PALETTE[1]);
  });

  it("ignores every private SGR form, not only the ? prefix", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("\u001b[>4;2mx\u001b[<1mx\u001b[=1mx");
    expect(terminal.snapshot().rows[0][0].style).toMatchObject({ dim: false, bold: false, underline: false });
  });

  it("tracks strikethrough and hidden text, and clears each on its own reset", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("\u001b[8;9mx\u001b[28;29my");
    const [first, second] = terminal.snapshot().rows[0];
    expect(first.style).toMatchObject({ hidden: true, strike: true });
    expect(second.style).toMatchObject({ hidden: false, strike: false });
  });

  it("abandons a sequence at a second ESC and starts the new one", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("\u001b\u001b[31mX");
    expect(screen(terminal)).toEqual(["X"]);
    expect(terminal.snapshot().rows[0][0].style.fg).toBe(ANSI_PALETTE[1]);
  });

  it("executes a control character inside a CSI sequence where it stands", () => {
    const terminal = new VirtualTerminal(10, 2);
    terminal.write("a\u001b[1\nmX");
    expect(screen(terminal)).toEqual(["a", "X"]);
    expect(terminal.snapshot().rows[1][0].style.bold).toBe(true);
  });

  it("resets everything on ESC c", () => {
    const terminal = new VirtualTerminal(10, 2);
    terminal.write("\u001b[31;1mold\u001b[?25l\u001bcnew");
    expect(screen(terminal)).toEqual(["new", ""]);
    expect(terminal.snapshot().rows[0][0].style).toMatchObject({ fg: null, bold: false });
    expect(terminal.snapshot().cursor).toEqual({ row: 0, col: 3 });
  });

  it("keeps trailing spaces that draw something: inverse, underline, background", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("a\u001b[4m  \u001b[0m   ");
    const runs = terminal.snapshot().rows[0];
    expect(runs.map((run) => [run.col, run.text, run.style.underline])).toEqual([
      [0, "a", false],
      [1, "  ", true],
    ]);
  });

  it("keeps the current background when erasing the display, as erase-in-line does", () => {
    const terminal = new VirtualTerminal(3, 2);
    terminal.write("\u001b[44m\u001b[2J");
    for (const row of terminal.snapshot().rows) expect(row[0].style.bg).toBe(ANSI_PALETTE[4]);
  });

  it("draws a text-presentation pictograph in one cell, and in two with VS16", () => {
    const shield = String.fromCodePoint(0x1f6e1);
    expect(cellWidth(0x1f6e1)).toBe(1);
    const bare = new VirtualTerminal(10, 1);
    bare.write(`${shield}x`);
    expect(bare.snapshot().rows[0].map((run) => run.col)).toEqual([0]);
    const emoji = new VirtualTerminal(10, 1);
    emoji.write(`${shield}${String.fromCodePoint(0xfe0f)}x`);
    expect(emoji.snapshot().rows[0].map((run) => run.col)).toEqual([0, 2]);
  });
});

describe("VirtualTerminal fixes from the second review", () => {
  it("runs a control inside a CSI once, even when the sequence is split across writes", () => {
    const split = new VirtualTerminal(10, 3);
    split.write("\u001b[1\n");
    split.write("mX");
    const whole = new VirtualTerminal(10, 3);
    whole.write("\u001b[1\nmX");
    expect(screen(split)).toEqual(screen(whole));
    expect(split.snapshot().cursor).toEqual({ row: 1, col: 1 });
  });

  it("follows East Asian Width above U+FFFF: emoji and CJK wide, cards, enclosed letters and flags narrow", () => {
    for (const wide of [0x16fe0, 0x17000, 0x1b000, 0x1f004, 0x1f0cf, 0x1f916, 0x1f9d9, 0x1fa80, 0x20000]) expect(cellWidth(wide)).toBe(2);
    for (const narrow of [0x1f0a1, 0x1f100, 0x1f1e6, 0x1f6e1, 0x1f800, 0x1fb00, 0xf0000]) expect(cellWidth(narrow)).toBe(1);
    expect(isZeroWidth(0xe0100)).toBe(true);
  });

  it("scrolls in new lines in the current background", () => {
    const terminal = new VirtualTerminal(3, 1);
    terminal.write("\u001b[44m\n");
    expect(terminal.snapshot().rows[0][0].style.bg).toBe(ANSI_PALETTE[4]);
  });

  it("treats an empty 256-colour index as malformed in the semicolon form too", () => {
    const terminal = new VirtualTerminal(10, 1);
    terminal.write("\u001b[31m\u001b[38;5;mx");
    expect(terminal.snapshot().rows[0][0].style.fg).toBe(ANSI_PALETTE[1]);
  });
});
