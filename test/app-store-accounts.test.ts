import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getComponent, getProfile } from "../src/modules/registry.js";

const PROMPTS = join(process.cwd(), "src", "assets", ".arcane", "spells");
const COMMANDS = join(process.cwd(), "src", "assets", ".claude", "commands");
const SKILLS = join(process.cwd(), "src", "assets", ".agents", "skills");

let spell: string;
let commandStub: string;
let codexSkill: string;

beforeAll(async () => {
  [spell, commandStub, codexSkill] = await Promise.all([
    readFile(join(PROMPTS, "spell-app-store-accounts.md"), "utf8"),
    readFile(join(COMMANDS, "spell-app-store-accounts.md"), "utf8"),
    readFile(join(SKILLS, "spell-app-store-accounts", "SKILL.md"), "utf8"),
  ]);
});

describe("spell-app-store-accounts.md", () => {
  it("has frontmatter naming both stores and scoping itself to account creation", () => {
    expect(spell).toContain("Spell — App Store Accounts");
    expect(spell).toContain("Apple Developer Program and Google Play Console");
    expect(spell).toContain("Stops at approved, hardened accounts");
  });

  it("covers Apple before Google, each preceded by the enrollment-type decision and shared prerequisites", () => {
    const decideIdx = spell.indexOf("## Step 0 — Decide the enrollment type");
    const gatherIdx = spell.indexOf("## Step 1 — Gather what both stores will ask for");
    const dunsIdx = spell.indexOf("## Step 2 — D-U-N-S");
    const appleIdx = spell.indexOf("## Step 3 — Apple Developer Program");
    const googleIdx = spell.indexOf("## Step 4 — Google Play Console");
    const timelineIdx = spell.indexOf("## Step 5 — Timeline");
    const hardenIdx = spell.indexOf("## Step 6 — Post-approval hardening");
    expect(decideIdx).toBeGreaterThan(-1);
    expect(gatherIdx).toBeGreaterThan(decideIdx);
    expect(dunsIdx).toBeGreaterThan(gatherIdx);
    expect(appleIdx).toBeGreaterThan(dunsIdx);
    expect(googleIdx).toBeGreaterThan(appleIdx);
    expect(timelineIdx).toBeGreaterThan(googleIdx);
    expect(hardenIdx).toBeGreaterThan(timelineIdx);
  });

  it("carries both stores' entry URLs", () => {
    expect(spell).toContain("https://developer.apple.com/enroll/");
    expect(spell).toContain("https://play.google.com/console/signup");
  });

  it("date-stamps its verified facts so a reader knows when to re-check fees and rules", () => {
    expect(spell).toMatch(/\*\*Facts last verified: \d{4}-\d{2}-\d{2}\*\*/);
    expect(spell).toContain("99 USD per membership year");
    expect(spell).toContain("25 USD, one time");
  });

  it("treats the two stores as independent enrollments", () => {
    expect(spell).toContain("The two stores are independent enrollments.");
    expect(spell).toContain("Two trackers, not one.");
  });

  it("keeps the D&B questionnaire and other sensitive inputs out of the session", () => {
    expect(spell).toContain("not in an AI chat, not in a repository");
    expect(spell).toContain("Sensitive data stays out of the session.");
  });

  it("carries the call-Apple-if-silent escalation and a buffer of at least a week", () => {
    expect(spell).toContain("If about five business days pass with no update, call Apple");
    expect(spell).toContain("one week earlier than the earliest date the accounts must be active");
  });

  it("hands off to spell-eas-store-deploy rather than covering builds or submissions", () => {
    expect(spell).toContain("`spell-eas-store-deploy.md`");
    expect(spell).toContain("Out of scope:");
  });

  it("cites MR-11 by ID with graceful degradation when the standards doc is absent", () => {
    expect(spell).toContain("(`MR-11`)");
    expect(spell).toContain("rationale unavailable — install the standards doc");
  });

  it("ships generically: no email addresses, phone numbers or nine-digit identifiers in the body", () => {
    // The spell ships to public consumers. It describes identifiers (a D-U-N-S Number, an
    // Enrollment ID) without ever carrying one -- an email address, a phone number or a
    // nine-digit run would mean a real enrollment's data leaked into the generic process.
    expect(spell).not.toMatch(/@/);
    expect(spell).not.toMatch(/\b\d{9,}\b/);
    expect(spell).not.toMatch(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/);
  });
});

describe("spell-app-store-accounts: thin client shims", () => {
  it("the Claude Code command includes the canonical file rather than duplicating it", () => {
    expect(commandStub).toContain("@.arcane/spells/spell-app-store-accounts.md");
  });

  it("the Codex skill points at the canonical file", () => {
    expect(codexSkill).toContain("name: spell-app-store-accounts");
    expect(codexSkill).toContain(".arcane/spells/spell-app-store-accounts.md");
  });
});

describe("spell-app-store-accounts: registry wiring", () => {
  it("joins the existing spells-build component beside spell-eas-store-deploy (no new spell component)", () => {
    const component = getComponent("spells-build");
    expect(component.files).toContain(".arcane/spells/spell-app-store-accounts.md");
    expect(component.files).toContain(".github/prompts/spell-app-store-accounts.prompt.md");
    expect(component.files).toContain(".claude/commands/spell-app-store-accounts.md");
    expect(component.files).toContain(".agents/skills/spell-app-store-accounts/SKILL.md");
    expect(component.files).toContain(".arcane/spells/spell-eas-store-deploy.md");
  });

  it("reaches the full profile through spells-build", () => {
    const files = getProfile("full").flatMap((c) => c.files);
    expect(files).toContain(".arcane/spells/spell-app-store-accounts.md");
  });
});
