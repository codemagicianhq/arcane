import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import {
  readManifest,
  writeManifest,
  isValidIdeaTags,
  ManifestInvalidFieldError,
} from "../src/modules/manifest.js";
import type { ArcaneManifest } from "../src/types.js";

/** PRD D-10 / UP02-A-06: the optional, validated `idea_tags` manifest field. */

const BASE = { version: "1.6.0", profile: "lite", installedAt: "2026-09-27T00:00:00.000Z", components: [] };

describe("idea_tags", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await createFixtureDir("up02-a-idea-tags-");
  });
  afterEach(async () => {
    await removeFixtureDir(dir);
  });

  async function writeRaw(value: Record<string, unknown>): Promise<void> {
    await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(value, null, 2));
  }

  it.each([
    { mode: "extend", tags: ["ui", "infra"] },
    { mode: "replace", tags: ["billing"] },
    { mode: "replace", tags: [] },
  ])("valid value %j round-trips through readManifest/writeManifest", async (idea_tags) => {
    await writeRaw({ ...BASE, idea_tags });

    const read = await readManifest(dir);
    expect(read.idea_tags).toEqual(idea_tags);
    await writeManifest(dir, read);
    expect((await readManifest(dir)).idea_tags).toEqual(idea_tags);
  });

  it("absent is fine", async () => {
    await writeRaw(BASE);
    expect((await readManifest(dir)).idea_tags).toBeUndefined();
  });

  it.each([
    ["an unknown mode", { mode: "merge", tags: ["ui"] }],
    ["a missing mode", { tags: ["ui"] }],
    ["tags that are not an array", { mode: "extend", tags: "ui" }],
    ["a non-string tag", { mode: "extend", tags: ["ui", 3] }],
    ["a blank tag", { mode: "extend", tags: ["ui", " "] }],
    ["missing tags", { mode: "replace" }],
    ["an array instead of an object", ["extend", "ui"]],
    ["null", null],
  ])("%s -> ManifestInvalidFieldError naming idea_tags", async (_label, idea_tags) => {
    await writeRaw({ ...BASE, idea_tags });

    const error = await readManifest(dir).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ManifestInvalidFieldError);
    expect((error as ManifestInvalidFieldError).field).toBe("idea_tags");
    expect((error as Error).message).toContain('"idea_tags"');
  });

  it("unknown fields, top-level and inside idea_tags, survive a read/write round trip unchanged", async () => {
    const raw = {
      ...BASE,
      idea_tags: { mode: "extend", tags: ["dx"], note: "kept" },
      some_future_field: { nested: [1, 2] },
    };
    await writeRaw(raw);

    await writeManifest(dir, await readManifest(dir));

    expect(JSON.parse(await fs.readFile(join(dir, ".arcane.json"), "utf-8"))).toEqual(raw);
  });

  it("isValidIdeaTags is the predicate the validator uses", () => {
    expect(isValidIdeaTags({ mode: "extend", tags: ["a"] })).toBe(true);
    expect(isValidIdeaTags({ mode: "EXTEND", tags: ["a"] })).toBe(false);
    const typed: ArcaneManifest["idea_tags"] = { mode: "replace", tags: ["x"] };
    expect(isValidIdeaTags(typed)).toBe(true);
  });
});
