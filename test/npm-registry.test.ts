import { describe, it, expect, afterEach, vi } from "vitest";
import { fetchPublishedFile } from "../src/modules/npm-registry.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPublishedFile", () => {
  it("fetches from the expected unpkg URL shape for a given version and path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("file content\n"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPublishedFile("1.2.3", ".arcane/governance/cicd-standards.md");

    expect(result).toBe("file content\n");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://unpkg.com/arcane-cli@1.2.3/dist/assets/.arcane/governance/cicd-standards.md",
    );
  });

  it("normalizes a leading slash and backslashes in the path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("x") });
    vi.stubGlobal("fetch", fetchMock);

    await fetchPublishedFile("1.0.0", "\\.arcane\\governance\\x.md");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://unpkg.com/arcane-cli@1.0.0/dist/assets/.arcane/governance/x.md",
    );
  });

  it("returns undefined, never throws, on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve("") }));

    const result = await fetchPublishedFile("1.0.0", "missing.md");

    expect(result).toBeUndefined();
  });

  it("returns undefined, never throws, on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await fetchPublishedFile("1.0.0", "x.md");

    expect(result).toBeUndefined();
  });
});
