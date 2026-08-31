import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");
const COMMANDS = join(process.cwd(), "src", "assets", ".claude", "commands");

let scry: string;
let commandStub: string;

beforeAll(async () => {
  [scry, commandStub] = await Promise.all([
    readFile(join(PROMPTS, "spell-scry.prompt.md"), "utf8"),
    readFile(join(COMMANDS, "spell-scry.md"), "utf8"),
  ]);
});

describe("spell-scry: inward pass is mandatory and runs first (BC-21)", () => {
  it("states the inward pass is mandatory, not optional", () => {
    expect(scry).toContain("## Step 2 — Inward pass (mandatory, run first)");
    expect(scry).toContain("**Never skip the inward pass.**");
  });

  it("cites the ARC-028 workspace incident as the concrete reason it runs first", () => {
    expect(scry).toContain("the ARC-028 `workspace` incident is the concrete");
    expect(scry).toContain("nearly settled the decision before a single `grep -ri` found the word");
  });

  it("weights code identifiers above prose", () => {
    expect(scry).toContain("weight these **above** prose");
  });
});

describe("spell-scry: four outward checks (BC-21)", () => {
  it("names all four checks explicitly", () => {
    expect(scry).toContain("**Who coined it**");
    expect(scry).toContain("**Is an estate/trademark holder still trading**");
    expect(scry).toContain("**Same-audience giants**");
    expect(scry).toContain("**First-association salience per market**");
  });

  it("requires a source for every outward claim", () => {
    expect(scry).toContain("**Never assert an outward finding without a source.**");
  });
});

describe("spell-scry: unified taxonomy and verdict (BC-21)", () => {
  it("uses the same same-space/adjacent/out-of-space taxonomy for both passes", () => {
    expect(scry).toContain("**Same-space**");
    expect(scry).toContain("**Adjacent**");
    expect(scry).toContain("**Out-of-space**");
    expect(scry).toContain("**Never use a separate classification scheme for inward vs. outward findings.**");
  });

  it("defines all three verdicts: pass, pass-with-disclosure, kill", () => {
    expect(scry).toContain("**pass** — no same-space finding");
    expect(scry).toContain("**pass-with-disclosure** — a same-space finding exists but is distant");
    expect(scry).toContain("**kill** — a genuine, blocking same-space collision");
  });

  it("forbids rounding a nuanced verdict up or down", () => {
    expect(scry).toContain(
      "**Never round pass-with-disclosure up to pass, or down to kill, to avoid stating a nuanced verdict.**",
    );
  });
});

describe("spell-scry: relationship to spell ward (BC-21)", () => {
  it("names ward as the opposite-direction counterpart, and that neither calls the other", () => {
    expect(scry).toContain("finds what leaked **in**");
    expect(scry).toContain("clears what's about to go **out**");
    expect(scry).toContain("They do not call each other");
  });
});

describe("spell-scry: scope discipline (BC-21)", () => {
  it("classifies and reports only -- never renames or resolves a collision itself", () => {
    expect(scry).toContain(
      "This spell classifies and reports. It does not rename, alias, or otherwise resolve a collision",
    );
  });
});

describe("spell-scry command stub ships proactive-trigger frontmatter (matching R2/BC-16)", () => {
  it("has frontmatter with a Use PROACTIVELY description", () => {
    expect(commandStub).toContain("---\ndescription: Use PROACTIVELY");
  });
});
