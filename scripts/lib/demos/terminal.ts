/**
 * scripts/lib/demos/terminal.ts
 *
 * A small virtual terminal for the README demos (ARC-058): it reads what the
 * CLI writes, escape sequences included, and keeps the grid of styled cells a
 * real terminal of the same size would show. A demo frame is a snapshot of
 * that grid.
 *
 * It implements what the CLI and @inquirer/prompts emit and the neighbouring
 * sequences a change to either could plausibly start emitting: printable text
 * with autowrap and scrolling, CR/LF/BS/TAB, SGR colours and attributes
 * (16, 256 and 24-bit, in the `;` and `:` forms), cursor movement
 * (CUU/CUD/CUF/CUB/CNL/CPL/CHA/CUP), erase in line and display (EL/ED),
 * cursor show/hide, save/restore (ESC 7/8) and reset (ESC c). Every other
 * control sequence is consumed and ignored, so an unknown one never prints as
 * text. Character widths follow `cellWidth` below, an approximation of what a
 * modern terminal does; the renderer repositions text after every wide
 * character, so an approximation can only shift spacing, not a whole line.
 */

export interface CellStyle {
  /** A CSS colour, or null for the terminal's default foreground. */
  fg: string | null;
  /** A CSS colour, or null for no background. */
  bg: string | null;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  inverse: boolean;
  hidden: boolean;
  strike: boolean;
}

export interface Cell {
  /** The grapheme drawn in this cell; "" for the second half of a wide character. */
  text: string;
  style: CellStyle;
}

/** One run of identically styled text on a row, starting at `col`. */
export interface StyledRun {
  col: number;
  /** How many cells the run covers, wide characters counted twice. */
  cells: number;
  text: string;
  style: CellStyle;
}

export interface ScreenSnapshot {
  /** One entry per terminal row: the row's runs, trailing unstyled blanks dropped. */
  rows: StyledRun[][];
  /** The cursor, or null while it is hidden. */
  cursor: { row: number; col: number } | null;
}

export const DEFAULT_STYLE: Readonly<CellStyle> = Object.freeze({
  fg: null,
  bg: null,
  bold: false,
  dim: false,
  italic: false,
  underline: false,
  inverse: false,
  hidden: false,
  strike: false,
});

const ESC = "\u001b";
const VS16 = String.fromCodePoint(0xfe0f);

/**
 * The 16 ANSI colours. A dark palette chosen to read on the demo window's
 * background (render-svg.ts); indexes 0-7 are the normal colours, 8-15 the
 * bright ones.
 */
export const ANSI_PALETTE: readonly string[] = [
  "#1e1a2b",
  "#f28b82",
  "#81c995",
  "#fdd663",
  "#7aa7f0",
  "#c58af9",
  "#78d9ec",
  "#d9d4e7",
  "#6e6787",
  "#f6aea9",
  "#a8dab5",
  "#fde293",
  "#a5c3f7",
  "#d7aefb",
  "#a1e4f2",
  "#ffffff",
];

function hex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

/** The xterm 256-colour table: 16 ANSI, a 6x6x6 cube, then 24 greys. */
export function xterm256(index: number): string {
  if (index < 16) return ANSI_PALETTE[index] ?? ANSI_PALETTE[7];
  if (index < 232) {
    const i = index - 16;
    const level = (v: number): number => (v === 0 ? 0 : 55 + v * 40);
    return `#${hex(level(Math.floor(i / 36)))}${hex(level(Math.floor(i / 6) % 6))}${hex(level(i % 6))}`;
  }
  const grey = 8 + (index - 232) * 10;
  return `#${hex(grey)}${hex(grey)}${hex(grey)}`;
}

// Emoji that a terminal draws two cells wide without a variation selector
// (Emoji_Presentation=Yes) in the BMP, plus the East Asian wide/fullwidth
// blocks.
const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f],
  [0x231a, 0x231b],
  [0x23e9, 0x23ec],
  [0x23f0, 0x23f0],
  [0x23f3, 0x23f3],
  [0x25fd, 0x25fe],
  [0x2614, 0x2615],
  [0x2648, 0x2653],
  [0x267f, 0x267f],
  [0x2693, 0x2693],
  [0x26a1, 0x26a1],
  [0x26aa, 0x26ab],
  [0x26bd, 0x26be],
  [0x26c4, 0x26c5],
  [0x26ce, 0x26ce],
  [0x26d4, 0x26d4],
  [0x26ea, 0x26ea],
  [0x26f2, 0x26f3],
  [0x26f5, 0x26f5],
  [0x26fa, 0x26fa],
  [0x26fd, 0x26fd],
  [0x2705, 0x2705],
  [0x270a, 0x270b],
  [0x2728, 0x2728],
  [0x274c, 0x274c],
  [0x274e, 0x274e],
  [0x2753, 0x2755],
  [0x2757, 0x2757],
  [0x2795, 0x2797],
  [0x27b0, 0x27b0],
  [0x27bf, 0x27bf],
  [0x2b1b, 0x2b1c],
  [0x2b50, 0x2b50],
  [0x2b55, 0x2b55],
  [0x2e80, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
];

// The East Asian Wide ranges outside the BMP (EastAsianWidth.txt, Unicode 15):
// Tangut, Khitan, Kana and Nushu, the emoji drawn two cells wide by default,
// and the CJK extension planes.
// Everything else there (playing cards, enclosed alphanumerics, regional
// indicators, symbols for legacy computing, private use) takes one cell, as do
// pictographs whose default presentation is text, until a VS16 follows them.
const WIDE_SUPPLEMENTARY: ReadonlyArray<readonly [number, number]> = [
  [0x16fe0, 0x16fe4],
  [0x16ff0, 0x16ff1],
  [0x17000, 0x187f7],
  [0x18800, 0x18cd5],
  [0x18d00, 0x18d08],
  [0x1aff0, 0x1aff3],
  [0x1aff5, 0x1affb],
  [0x1affd, 0x1affe],
  [0x1b000, 0x1b122],
  [0x1b132, 0x1b132],
  [0x1b150, 0x1b152],
  [0x1b155, 0x1b155],
  [0x1b164, 0x1b167],
  [0x1b170, 0x1b2fb],
  [0x1f004, 0x1f004],
  [0x1f0cf, 0x1f0cf],
  [0x1f18e, 0x1f18e],
  [0x1f191, 0x1f19a],
  [0x1f200, 0x1f202],
  [0x1f210, 0x1f23b],
  [0x1f240, 0x1f248],
  [0x1f250, 0x1f251],
  [0x1f260, 0x1f265],
  [0x1f300, 0x1f320],
  [0x1f32d, 0x1f335],
  [0x1f337, 0x1f37c],
  [0x1f37e, 0x1f393],
  [0x1f3a0, 0x1f3ca],
  [0x1f3cf, 0x1f3d3],
  [0x1f3e0, 0x1f3f0],
  [0x1f3f4, 0x1f3f4],
  [0x1f3f8, 0x1f43e],
  [0x1f440, 0x1f440],
  [0x1f442, 0x1f4fc],
  [0x1f4ff, 0x1f53d],
  [0x1f54b, 0x1f54e],
  [0x1f550, 0x1f567],
  [0x1f57a, 0x1f57a],
  [0x1f595, 0x1f596],
  [0x1f5a4, 0x1f5a4],
  [0x1f5fb, 0x1f64f],
  [0x1f680, 0x1f6c5],
  [0x1f6cc, 0x1f6cc],
  [0x1f6d0, 0x1f6d2],
  [0x1f6d5, 0x1f6d7],
  [0x1f6dc, 0x1f6df],
  [0x1f6eb, 0x1f6ec],
  [0x1f6f4, 0x1f6fc],
  [0x1f7e0, 0x1f7eb],
  [0x1f7f0, 0x1f7f0],
  [0x1f90c, 0x1f93a],
  [0x1f93c, 0x1f945],
  [0x1f947, 0x1f9ff],
  [0x1fa70, 0x1fa7c],
  [0x1fa80, 0x1fa88],
  [0x1fa90, 0x1fabd],
  [0x1fabf, 0x1fac5],
  [0x1face, 0x1fadb],
  [0x1fae0, 0x1fae8],
  [0x1faf0, 0x1faf8],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
];

function inRanges(codePoint: number, ranges: ReadonlyArray<readonly [number, number]>): boolean {
  return ranges.some(([low, high]) => codePoint >= low && codePoint <= high);
}

/** True for code points that attach to the previous cell instead of taking one. */
export function isZeroWidth(codePoint: number): boolean {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) || // combining diacritics
    codePoint === 0x200b || // zero-width space
    codePoint === 0x200c ||
    codePoint === 0x200d || // zero-width joiner
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) || // variation selectors
    (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff) || // skin-tone modifiers
    (codePoint >= 0xe0020 && codePoint <= 0xe007f) || // tag characters
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef) // variation selectors supplement
  );
}

/** How many cells a terminal gives one (non-zero-width) code point. */
export function cellWidth(codePoint: number): 1 | 2 {
  return inRanges(codePoint, codePoint > 0xffff ? WIDE_SUPPLEMENTARY : WIDE_RANGES) ? 2 : 1;
}

/** A style that draws something on a blank cell (a background, a line, an inverse block). */
function isVisibleOnBlank(style: CellStyle): boolean {
  return style.bg !== null || style.inverse || style.underline || style.strike;
}

/** An erased cell: blank, keeping only the current background (as xterm does). */
function blankCell(style: CellStyle = DEFAULT_STYLE): Cell {
  return { text: " ", style: style.bg === null ? { ...DEFAULT_STYLE } : { ...DEFAULT_STYLE, bg: style.bg } };
}

function sameStyle(a: CellStyle, b: CellStyle): boolean {
  return (
    a.fg === b.fg &&
    a.bg === b.bg &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.inverse === b.inverse &&
    a.hidden === b.hidden &&
    a.strike === b.strike
  );
}

export class VirtualTerminal {
  readonly cols: number;
  readonly rows: number;
  private grid: Cell[][];
  private row = 0;
  private col = 0;
  /** Set after a character lands in the last column; the next printable wraps first. */
  private wrapPending = false;
  private cursorVisible = true;
  private style: CellStyle = { ...DEFAULT_STYLE };
  private saved: { row: number; col: number; style: CellStyle } | null = null;
  /** An escape sequence split across two writes, kept until the rest arrives. */
  private pending = "";

  constructor(cols: number, rows: number) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 1) {
      throw new Error(`A virtual terminal needs at least 2 columns and 1 row, got ${cols}x${rows}.`);
    }
    this.cols = cols;
    this.rows = rows;
    this.grid = Array.from({ length: rows }, () => this.blankRow());
  }

  private blankRow(style: CellStyle = DEFAULT_STYLE): Cell[] {
    return Array.from({ length: this.cols }, () => blankCell(style));
  }

  /** Feed raw output, escape sequences included. */
  write(data: string): void {
    const input = this.pending + data;
    this.pending = "";
    let i = 0;
    while (i < input.length) {
      if (input[i] === ESC) {
        const consumed = this.escape(input, i);
        if (consumed === 0) {
          this.pending = input.slice(i);
          return;
        }
        i += consumed;
        continue;
      }
      const codePoint = input.codePointAt(i) ?? 0;
      const length = codePoint > 0xffff ? 2 : 1;
      this.character(input.slice(i, i + length), codePoint);
      i += length;
    }
  }

  /** The visible screen: styled runs per row and the cursor, if shown. */
  snapshot(): ScreenSnapshot {
    const rows = this.grid.map((cells) => {
      const runs: StyledRun[] = [];
      let last = cells.length;
      while (last > 0 && cells[last - 1].text === " " && !isVisibleOnBlank(cells[last - 1].style)) last--;
      // A wide character ends its run, so the renderer places the text after it by column.
      let afterWide = false;
      for (let c = 0; c < last; c++) {
        const cell = cells[c];
        const previous = runs[runs.length - 1];
        if (cell.text === "") {
          if (previous !== undefined) previous.cells++;
          continue;
        }
        if (previous !== undefined && !afterWide && sameStyle(previous.style, cell.style)) {
          previous.text += cell.text;
          previous.cells++;
        } else {
          runs.push({ col: c, cells: 1, text: cell.text, style: { ...cell.style } });
        }
        afterWide = cells[c + 1]?.text === "";
      }
      return runs;
    });
    const cursorCol = Math.min(this.col, this.cols - 1);
    return { rows, cursor: this.cursorVisible ? { row: this.row, col: cursorCol } : null };
  }

  private character(text: string, codePoint: number): void {
    switch (text) {
      case "\n":
        // A terminal's line discipline turns LF into CR LF (onlcr).
        this.col = 0;
        this.lineFeed();
        return;
      case "\r":
        this.col = 0;
        this.wrapPending = false;
        return;
      case "\b":
        if (this.col > 0) this.col--;
        this.wrapPending = false;
        return;
      case "\t":
        this.col = Math.min(this.cols - 1, (Math.floor(this.col / 8) + 1) * 8);
        this.wrapPending = false;
        return;
    }
    if (codePoint < 0x20 || codePoint === 0x7f) return; // BEL and other C0 controls
    if (isZeroWidth(codePoint)) {
      this.attachToPrevious(text);
      return;
    }
    const width = cellWidth(codePoint);
    if (this.wrapPending || this.col + width > this.cols) {
      this.col = 0;
      this.lineFeed();
    }
    const line = this.grid[this.row];
    this.clearWideAt(line, this.col);
    line[this.col] = { text, style: { ...this.style } };
    if (width === 2) {
      this.clearWideAt(line, this.col + 1);
      line[this.col + 1] = { text: "", style: { ...this.style } };
    }
    this.col += width;
    if (this.col >= this.cols) {
      this.col = this.cols - 1;
      this.wrapPending = true;
    }
  }

  /** Overwriting either half of a wide character blanks the other half (in the current background). */
  private clearWideAt(line: Cell[], col: number): void {
    const cell = line[col];
    if (cell === undefined) return;
    if (cell.text === "" && col > 0) line[col - 1] = blankCell(this.style);
    if (line[col + 1]?.text === "") line[col + 1] = blankCell(this.style);
  }

  private attachToPrevious(text: string): void {
    const line = this.grid[this.row];
    let c = this.wrapPending ? this.col : this.col - 1;
    while (c > 0 && line[c].text === "") c--;
    if (c < 0) return;
    const cell = line[c];
    cell.text += text;
    // VS16 right after a narrow character asks for emoji presentation, which a
    // terminal draws two cells wide (U+270F U+FE0F, a pencil). Only when the cursor is still beside
    // it and there is room; otherwise the character stays one cell.
    const justWritten = !this.wrapPending && c === this.col - 1;
    if (text === VS16 && justWritten && this.col < this.cols && cellWidth(cell.text.codePointAt(0) ?? 0) === 1) {
      this.clearWideAt(line, this.col);
      line[this.col] = { text: "", style: { ...cell.style } };
      this.col++;
      if (this.col >= this.cols) {
        this.col = this.cols - 1;
        this.wrapPending = true;
      }
    }
  }

  private lineFeed(): void {
    this.wrapPending = false;
    if (this.row === this.rows - 1) {
      this.grid.shift();
      this.grid.push(this.blankRow(this.style));
    } else {
      this.row++;
    }
  }

  private reset(): void {
    this.grid = Array.from({ length: this.rows }, () => this.blankRow());
    this.row = 0;
    this.col = 0;
    this.wrapPending = false;
    this.cursorVisible = true;
    this.style = { ...DEFAULT_STYLE };
    this.saved = null;
  }

  /**
   * Handle the escape sequence at `start`; return the number of characters
   * consumed, or 0 when the sequence is incomplete (it continues in the next write).
   */
  private escape(input: string, start: number): number {
    const next = input[start + 1];
    if (next === undefined) return 0;
    // An ESC inside a sequence abandons it and starts a new one, as in xterm.
    if (next === ESC) return 1;
    if (next === "[") return this.csiAt(input, start);
    if (next === "]" || next === "P" || next === "_" || next === "^" || next === "X") {
      // OSC/DCS/APC/PM/SOS: a string terminated by BEL or ST (ESC \); ignored.
      for (let end = start + 2; end < input.length; end++) {
        if (input[end] === "\u0007") return end - start + 1;
        if (input[end] === ESC) {
          if (end + 1 >= input.length) return 0;
          if (input[end + 1] === "\\") return end - start + 2;
        }
      }
      return 0;
    }
    switch (next) {
      case "7":
        this.saved = { row: this.row, col: this.col, style: { ...this.style } };
        return 2;
      case "8":
        if (this.saved !== null) {
          this.row = this.saved.row;
          this.col = this.saved.col;
          this.style = { ...this.saved.style };
        }
        this.wrapPending = false;
        return 2;
      case "c":
        this.reset();
        return 2;
      case "(":
      case ")":
      case "*":
      case "+":
      case "#":
      case "%":
        return start + 2 < input.length ? 3 : 0; // charset and line-attribute selection: ignored
      default:
        return 2; // any other two-character escape: ignored
    }
  }

  /**
   * A CSI sequence: parameter and intermediate bytes, then a final byte. As in
   * xterm, a C0 control inside it takes effect before the sequence does, and an
   * ESC abandons the sequence. The controls run only once the sequence is
   * complete or abandoned, so a sequence split across two writes, which is
   * parsed again from its start, does not run them twice.
   */
  private csiAt(input: string, start: number): number {
    let body = "";
    const controls: string[] = [];
    const runControls = (): void => {
      for (const control of controls) this.character(control, control.charCodeAt(0));
    };
    for (let end = start + 2; end < input.length; end++) {
      const ch = input[end];
      if (ch === ESC) {
        runControls();
        return end - start;
      }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        controls.push(ch);
        continue;
      }
      if (code >= 0x40 && code <= 0x7e) {
        runControls();
        this.csi(body, ch);
        return end - start + 1;
      }
      body += ch;
    }
    return 0;
  }

  private csi(body: string, final: string): void {
    // A leading "<", "=", ">" or "?" marks a private sequence; only the cursor's matters here.
    const prefix = /^[<=>?]/.test(body) ? body[0] : "";
    const groups = body.slice(prefix.length).split(";");
    if (prefix !== "") {
      if (prefix === "?" && groups.includes("25") && (final === "h" || final === "l")) this.cursorVisible = final === "h";
      return;
    }
    if (final === "m") {
      this.sgr(groups);
      return;
    }
    const params = groups.map((p) => (p === "" ? NaN : Number(p)));
    const n = (index: number, fallback: number): number => {
      const value = params[index];
      return value === undefined || Number.isNaN(value) ? fallback : value;
    };
    const count = Math.max(1, n(0, 1));
    switch (final) {
      case "A":
        this.row = Math.max(0, this.row - count);
        break;
      case "B":
        this.row = Math.min(this.rows - 1, this.row + count);
        break;
      case "C":
        this.col = Math.min(this.cols - 1, this.col + count);
        break;
      case "D":
        this.col = Math.max(0, this.col - count);
        break;
      case "E":
        this.row = Math.min(this.rows - 1, this.row + count);
        this.col = 0;
        break;
      case "F":
        this.row = Math.max(0, this.row - count);
        this.col = 0;
        break;
      case "G":
        this.col = Math.min(this.cols - 1, count - 1);
        break;
      case "H":
      case "f":
        this.row = Math.min(this.rows - 1, Math.max(1, n(0, 1)) - 1);
        this.col = Math.min(this.cols - 1, Math.max(1, n(1, 1)) - 1);
        break;
      case "K":
        this.eraseInLine(n(0, 0));
        return;
      case "J":
        this.eraseInDisplay(n(0, 0));
        return;
      default:
        return; // unsupported CSI: ignored
    }
    this.wrapPending = false;
  }

  private eraseInLine(mode: number): void {
    if (mode > 2) return;
    const line = this.grid[this.row];
    const from = mode === 0 ? this.col : 0;
    const to = mode === 1 ? this.col + 1 : this.cols;
    // A wide character cut by either edge of the range goes entirely.
    if (from > 0 && line[from]?.text === "") line[from - 1] = blankCell(this.style);
    if (line[to]?.text === "") line[to] = blankCell(this.style);
    for (let c = from; c < to; c++) line[c] = blankCell(this.style);
  }

  private eraseInDisplay(mode: number): void {
    if (mode === 0) {
      this.eraseInLine(0);
      for (let r = this.row + 1; r < this.rows; r++) this.grid[r] = this.blankRow(this.style);
    } else if (mode === 1) {
      this.eraseInLine(1);
      for (let r = 0; r < this.row; r++) this.grid[r] = this.blankRow(this.style);
    } else if (mode === 2) {
      this.grid = Array.from({ length: this.rows }, () => this.blankRow(this.style));
    }
    // Mode 3 clears scrollback only, which this terminal does not keep.
  }

  /** An extended colour (38/48/58) from its sub-parameters, or null when malformed. */
  private extendedColour(parts: number[]): string | null {
    const [mode, ...rest] = parts;
    if (mode === 5) {
      const index = rest[0];
      return index === undefined || Number.isNaN(index) ? null : xterm256(Math.max(0, Math.min(255, index)));
    }
    if (mode === 2) {
      if (rest.length < 3) return null;
      const [r, g, b] = rest.slice(-3);
      const channel = (v: number): string => hex(Math.max(0, Math.min(255, Number.isNaN(v) ? 0 : v)));
      return `#${channel(r)}${channel(g)}${channel(b)}`;
    }
    return null;
  }

  private sgr(groups: string[]): void {
    const toNumbers = (group: string): number[] => group.split(":").map((p) => (p === "" ? NaN : Number(p)));
    for (let i = 0; i < groups.length; i++) {
      const parts = toNumbers(groups[i]);
      const p = Number.isNaN(parts[0]) ? 0 : parts[0];
      if (p === 38 || p === 48 || p === 58) {
        let colour: string | null;
        if (parts.length > 1) {
          // Colon form, one group: 38:5:n or 38:2:[colourspace]:r:g:b.
          const mode = parts[1];
          colour = this.extendedColour(mode === 2 && parts.length >= 6 ? [2, ...parts.slice(3, 6)] : parts.slice(1));
        } else {
          // Semicolon form: the sub-parameters are the following groups.
          const mode = Number(groups[i + 1]);
          const take = mode === 5 ? 2 : mode === 2 ? 4 : 1;
          // An empty sub-parameter is malformed here, as it is in the colon form.
          colour = this.extendedColour(groups.slice(i + 1, i + 1 + take).map((g) => (g === "" ? NaN : Number(g))));
          i += take;
        }
        if (colour === null || p === 58) continue; // malformed, or an underline colour: ignored
        if (p === 38) this.style.fg = colour;
        else this.style.bg = colour;
        continue;
      }
      this.sgrAttribute(p);
    }
  }

  private sgrAttribute(p: number): void {
    if (p === 0) this.style = { ...DEFAULT_STYLE };
    else if (p === 1) this.style.bold = true;
    else if (p === 2) this.style.dim = true;
    else if (p === 3) this.style.italic = true;
    else if (p === 4) this.style.underline = true;
    else if (p === 7) this.style.inverse = true;
    else if (p === 8) this.style.hidden = true;
    else if (p === 9) this.style.strike = true;
    else if (p === 22) this.style.bold = this.style.dim = false;
    else if (p === 23) this.style.italic = false;
    else if (p === 24) this.style.underline = false;
    else if (p === 27) this.style.inverse = false;
    else if (p === 28) this.style.hidden = false;
    else if (p === 29) this.style.strike = false;
    else if (p >= 30 && p <= 37) this.style.fg = ANSI_PALETTE[p - 30];
    else if (p >= 90 && p <= 97) this.style.fg = ANSI_PALETTE[p - 90 + 8];
    else if (p === 39) this.style.fg = null;
    else if (p >= 40 && p <= 47) this.style.bg = ANSI_PALETTE[p - 40];
    else if (p >= 100 && p <= 107) this.style.bg = ANSI_PALETTE[p - 100 + 8];
    else if (p === 49) this.style.bg = null;
  }
}
