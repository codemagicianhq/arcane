import { expect } from "vitest";

/**
 * Collapses hard-wrapped markdown prose to single-spaced text, so a
 * multi-word phrase assertion doesn't break just because the source
 * document happens to wrap that sentence across lines differently than
 * whoever wrote the test expected (P5: line-wrap-fragile `toContain`
 * assertions, 8x in Become Current's own record).
 */
export function normalizeProse(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

/**
 * `expect(normalizeProse(text)).toContain(normalizeProse(needle))` in one
 * call, so call sites don't each re-derive the normalize-then-toContain
 * pattern by hand.
 */
export function expectProseToContain(text: string, needle: string): void {
    expect(normalizeProse(text)).toContain(normalizeProse(needle));
}

/**
 * The single line containing `needle`, so callers can assert
 * attachment/proximity rather than mere presence anywhere in the file.
 * Throws if not found or if ambiguous, so a test failure is loud rather
 * than silently matching the wrong occurrence.
 */
export function lineContaining(text: string, needle: string): string {
    const matches = text.split("\n").filter((l) => l.includes(needle));
    if (matches.length === 0) throw new Error(`No line contains "${needle}"`);
    if (matches.length > 1) {
        throw new Error(`"${needle}" appears on ${matches.length} lines; test needs a unique anchor`);
    }
    return matches[0]!;
}

/**
 * The paragraph containing `needle` — the anchored line plus the wrapped
 * continuation lines that belong to it, up to the next blank line.
 *
 * Markdown prose in these documents is hard-wrapped, so a single bullet's
 * meaning is routinely split across several lines. `lineContaining` is still
 * the right tool when the assertion is about one command and its annotation
 * sitting together; this one is for assertions about a whole statement.
 * Proximity is still what is being proved — just at paragraph granularity
 * rather than line granularity, so it cannot be satisfied by a match in an
 * unrelated section.
 */
export function blockContaining(text: string, needle: string): string {
    const lines = text.split("\n");
    const start = lines.findIndex((l) => l.includes(needle));
    if (start === -1) throw new Error(`No line contains "${needle}"`);
    if (lines.filter((l) => l.includes(needle)).length > 1) {
        throw new Error(`"${needle}" appears more than once; test needs a unique anchor`);
    }
    const block = [lines[start]!];
    for (let i = start + 1; i < lines.length; i += 1) {
        const line = lines[i]!;
        if (line.trim() === "") break;
        // Stop at the next sibling bullet, so a block cannot absorb its neighbour.
        // Table rows, headings and code fences terminate it too: without them a
        // block could silently swallow the NEXT table row, and an assertion would
        // then pass on a match belonging to a different row entirely.
        if (/^\s*[-*]\s|^\s*\d+\.\s|^\s*\||^\s*#|^\s*```/.test(line)) break;
        block.push(line);
    }
    return block.join(" ");
}

/**
 * Guards against a `lineContaining`/`blockContaining` proximity assertion
 * being satisfied by an INVERTED sentence -- physical adjacency proves
 * attachment, not polarity. A future edit could keep every required phrase
 * on the same line while flipping its meaning ("...is NOT required for...",
 * "...does not apply here..."). Call after every positive proximity
 * assertion, not just the one this pattern was first built for.
 */
export function expectNotNegated(line: string): void {
    expect(line.toLowerCase()).not.toMatch(
        /does not apply|is exempt|no check (is )?(required|needed)|not required|n\/a here|does not carry/,
    );
}
