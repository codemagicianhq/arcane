import { describe, it, expect, afterEach } from "vitest";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { checkMcpConfig } from "../src/commands/doctor.js";
import { createFixtureDir } from "./helpers/git-fixture.js";

let dir: string | undefined;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("checkMcpConfig (I12/BC-22)", () => {
  it("passes silently when no .mcp.json exists", async () => {
    dir = await createFixtureDir("doctor-mcp-none");
    const result = await checkMcpConfig(dir);
    expect(result.passed).toBe(true);
    expect(result.blocking).toBe(false);
    expect(result.message).toBe("no .mcp.json — nothing to check");
  });

  it("passes when no servers are configured", async () => {
    dir = await createFixtureDir("doctor-mcp-empty");
    await writeFile(join(dir, ".mcp.json"), JSON.stringify({ mcpServers: {} }), "utf8");
    const result = await checkMcpConfig(dir);
    expect(result.passed).toBe(true);
    expect(result.message).toBe("no MCP servers configured");
  });

  it("passes when every configured server has a timeout", async () => {
    dir = await createFixtureDir("doctor-mcp-all-timeouts");
    await writeFile(
      join(dir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          alpha: { command: "npx", timeout: 30000 },
          beta: { command: "npx", timeout: 15000 },
        },
      }),
      "utf8",
    );
    const result = await checkMcpConfig(dir);
    expect(result.passed).toBe(true);
    expect(result.message).toBe("2 server(s) configured, all with a timeout set");
  });

  it("warns, non-blocking, naming every server missing a timeout", async () => {
    dir = await createFixtureDir("doctor-mcp-missing-timeout");
    await writeFile(
      join(dir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          alpha: { command: "npx", timeout: 30000 },
          beta: { command: "npx" },
          gamma: { command: "npx" },
        },
      }),
      "utf8",
    );
    const result = await checkMcpConfig(dir);
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("beta");
    expect(result.message).toContain("gamma");
    expect(result.message).not.toContain("alpha");
  });

  it("treats a non-numeric timeout the same as a missing one", async () => {
    dir = await createFixtureDir("doctor-mcp-bad-timeout-type");
    await writeFile(
      join(dir, ".mcp.json"),
      JSON.stringify({ mcpServers: { alpha: { timeout: "30000" } } }),
      "utf8",
    );
    const result = await checkMcpConfig(dir);
    expect(result.passed).toBe(false);
    expect(result.message).toContain("alpha");
  });

  it("degrades to a non-blocking warning on invalid JSON, never throws", async () => {
    dir = await createFixtureDir("doctor-mcp-invalid-json");
    await writeFile(join(dir, ".mcp.json"), "{ not valid json", "utf8");
    const result = await checkMcpConfig(dir);
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("invalid JSON");
  });

  it("degrades to a non-blocking warning when the file is valid JSON but not an object, never throws", async () => {
    dir = await createFixtureDir("doctor-mcp-not-an-object");
    await writeFile(join(dir, ".mcp.json"), "null", "utf8");
    const result = await checkMcpConfig(dir);
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("not a JSON object");
  });
});
