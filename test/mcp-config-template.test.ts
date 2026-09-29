import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SHIPPED = join(import.meta.dirname, "..", "src", "assets", ".mcp.json");

// The npm package-name grammar (validate-npm-package-name, new-package rules): lowercase, no spaces,
// no `<` or `>`. A value that does NOT match cannot resolve to any published package.
const NPM_PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

interface Server {
  command?: unknown;
  args?: unknown;
  timeout?: unknown;
}

async function readShipped(): Promise<{ raw: string; servers: Record<string, Server> }> {
  const raw = await readFile(SHIPPED, "utf8");
  const parsed = JSON.parse(raw) as { mcpServers?: Record<string, Server> };
  return { raw, servers: parsed.mcpServers ?? {} };
}

describe("shipped .mcp.json scaffold (R-295a)", () => {
  it("names no package under the unowned @example/ scope", async () => {
    const { raw } = await readShipped();
    expect(raw).not.toContain("@example/");
  });

  it("has at least one example server, so the assertions below compare something", async () => {
    const { servers } = await readShipped();
    expect(Object.keys(servers).length).toBeGreaterThan(0);
  });

  it("gives every non-flag args entry a value no npm package name can match", async () => {
    const { servers } = await readShipped();
    const checked: string[] = [];
    for (const [name, server] of Object.entries(servers)) {
      const args = Array.isArray(server.args) ? server.args : [];
      for (const arg of args) {
        if (typeof arg !== "string" || arg.startsWith("-")) continue;
        checked.push(`${name}: ${arg}`);
        expect(NPM_PACKAGE_NAME.test(arg), `${name} args entry "${arg}" is a resolvable npm package name`).toBe(false);
      }
    }
    // A vacuous pass proves nothing: at least one package argument was actually compared.
    expect(checked.length).toBeGreaterThan(0);
  });

  it("keeps the per-server timeout the MCP fail-fast rule points at", async () => {
    const { servers } = await readShipped();
    for (const server of Object.values(servers)) {
      expect(typeof server.timeout).toBe("number");
    }
  });
});
