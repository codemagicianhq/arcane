import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getComponent } from "../src/modules/registry.js";

const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");
const COMMANDS = join(process.cwd(), "src", "assets", ".claude", "commands");
const ROOT_DIR = process.cwd();

let spell: string;
let commandStub: string;
let closeSession: string;

beforeAll(async () => {
  [spell, commandStub, closeSession] = await Promise.all([
    readFile(join(PROMPTS, "spell-verification-ledger.prompt.md"), "utf8"),
    readFile(join(COMMANDS, "spell-verification-ledger.md"), "utf8"),
    readFile(join(PROMPTS, "spell-close-session.prompt.md"), "utf8"),
  ]);
});

describe("spell-verification-ledger.prompt.md (I7/BC-27c)", () => {
  it("is explicitly separate from spell-close-session, run on demand", () => {
    expect(spell).toContain("Separate from spell-close-session; run on demand, not every session.");
  });

  it("treats a corrected result as the point, not something to hide", () => {
    expect(spell).toContain("A `corrected` result is the point, not a failure to hide.");
  });

  it("defines all three result classifications", () => {
    expect(spell).toContain("`confirmed`");
    expect(spell).toContain("`corrected`");
    expect(spell).toContain("`unverifiable`");
  });

  it("stops rather than manufacturing an entry when nothing qualifies", () => {
    expect(spell).toContain("Stop here if nothing qualifies.");
    expect(spell).toContain("Never fabricate a ledger-worthy event to fill a report");
  });

  it("appends to docs/verification-ledger.md rather than rewriting it", () => {
    expect(spell).toContain("docs/verification-ledger.md");
    expect(spell).toContain("Append, don't rewrite.");
  });
});

describe("spell-verification-ledger.md: thin Claude Code shim (I7/BC-27c)", () => {
  it("includes the prompt file rather than duplicating its content", () => {
    expect(commandStub).toContain("@.github/prompts/spell-verification-ledger.prompt.md");
  });
});

describe("spell-close-session.prompt.md: tie-in to the new spell (I7/BC-27c)", () => {
  it("suggests spell-verification-ledger as a separate step, not folded into close-session itself", () => {
    expect(closeSession).toContain("suggest `spell-verification-ledger` separately");
    expect(closeSession).toContain("it is not part of this close-session flow itself");
  });
});

describe("docs/verification-ledger.md (I7/BC-27c)", () => {
  it("starts with the schema explained and no backfilled historical entries", async () => {
    const ledger = await readFile(join(ROOT_DIR, "docs", "verification-ledger.md"), "utf8");
    expect(ledger).toContain("This file starts empty");
    expect(ledger).toContain("**Claim**");
    expect(ledger).toContain("**Verification method**");
    expect(ledger).toContain("**Result**");
    expect(ledger).toContain("**Correction**");
  });
});

describe("registry wiring (I7/BC-27c)", () => {
  it("joins spell-verification-ledger to spells-capture, alongside spell-document", () => {
    const component = getComponent("spells-capture");
    expect(component.files).toContain(".github/prompts/spell-document.prompt.md");
    expect(component.files).toContain(".github/prompts/spell-verification-ledger.prompt.md");
    expect(component.files).toContain(".claude/commands/spell-verification-ledger.md");
  });
});
