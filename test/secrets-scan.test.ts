import { describe, it, expect } from "vitest";
import { SECRETS_RULES, SECRETS_PATTERNS } from "../src/modules/secrets-scan.js";

function ruleFor(label: string) {
  const rule = SECRETS_RULES.find((r) => r.label === label);
  if (!rule) throw new Error(`no rule labeled "${label}"`);
  return rule;
}

describe("SECRETS_PATTERNS", () => {
  it("is derived 1:1 from SECRETS_RULES, in the same order", () => {
    expect(SECRETS_PATTERNS).toEqual(SECRETS_RULES.map((r) => r.pattern));
  });
});

describe("generic-secret / generic-token", () => {
  const secret = ruleFor("generic-secret").pattern;
  const token = ruleFor("generic-token").pattern;

  it.each([
    ["SECRET_KEY=thisisarealsecretvalue12345", secret],
    ["API_SECRET: sk_live_abcdefghijklmnop", secret],
    ["SECRET: sk_live_abcdefghijklmnop", secret],
    ["TOKEN=ghp_realGithubPatShapedValue123", token],
  ])("flags a real-looking credential assignment: %s", (line, pattern) => {
    expect(pattern.test(line)).toBe(true);
  });

  it.each([
    ["GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}", token], // GitHub Actions secret reference, not a literal
    ["id-token: write", token], // short, safe permission value
    ["const token = value?.trim();", token], // ordinary lowercase code identifier
    ["SECRET_NAME={THE_REAL_VALUE}", secret], // {UPPER_SNAKE} documented placeholder
    ['auth = { provider = "token", token = { source = "env", id = "SECRET_NAME" } }', secret], // no assignment operator directly after the identifier
    ["# SECRET placeholder, replace me", secret], // prose, not an assignment
  ])("does not flag a non-credential shape: %s", (line, pattern) => {
    expect(pattern.test(line)).toBe(false);
  });

  it("does not require a specific leading character before SECRET/TOKEN (regression: mandatory [A-Z] once made bare SECRET_KEY= unmatchable)", () => {
    expect(secret.test("SECRET_KEY=thisisarealsecretvalue12345")).toBe(true);
    expect(token.test("TOKEN=thisisarealtokenvalue12345")).toBe(true);
  });
});

describe("other credential-shape rules", () => {
  it("api-key matches an API_KEY assignment case-insensitively", () => {
    expect(ruleFor("api-key").pattern.test("api-key: abc123")).toBe(true);
    expect(ruleFor("api-key").pattern.test("API_KEY=abc123")).toBe(true);
  });

  it("bearer-token requires a long value (real tokens are long)", () => {
    const pattern = ruleFor("bearer-token").pattern;
    expect(pattern.test("Bearer abcdefghijklmnopqrstuvwxyz0123456789")).toBe(true);
    expect(pattern.test("Bearer short")).toBe(false);
  });

  it("openai-key matches the sk- prefix shape", () => {
    expect(ruleFor("openai-key").pattern.test("sk-abcdefghijklmnopqrstuvwxyz")).toBe(true);
  });

  it("pem-key matches a PEM header", () => {
    expect(ruleFor("pem-key").pattern.test("-----BEGIN PRIVATE KEY-----")).toBe(true);
  });

  it("slack-token matches xoxb/xoxp-style tokens", () => {
    expect(ruleFor("slack-token").pattern.test("xoxb-123456-abcdef")).toBe(true);
  });

  it("aws-access-key matches the AKIA-prefixed shape", () => {
    expect(ruleFor("aws-access-key").pattern.test("AKIAABCDEFGHIJKLMNOP")).toBe(true);
  });

  it("github-pat matches the ghp_-prefixed shape", () => {
    expect(
      ruleFor("github-pat").pattern.test("ghp_abcdefghijklmnopqrstuvwxyz0123456789AB"),
    ).toBe(true);
  });
});
