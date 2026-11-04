import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createDenylistRules, scanFile } from "../src/modules/denylist-scan.js";
import { collectState, type CollectStateOptions } from "../src/modules/state/collect.js";
import { serializeState } from "../src/modules/state/serialize.js";
import type { StateDocument } from "../src/modules/state/types.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { compileStateSchema } from "./helpers/state-schema.js";
import {
  FIXTURE_CLONE_PATH,
  FIXTURE_HOSTNAME,
  FOREIGN_CLONE_PATH,
  FOREIGN_HOSTNAME,
  PRIVATE_NAME,
  USERINFO_CREDENTIAL,
  buildConsumerFixture,
  buildHubFixture,
  buildSelfHostedFixture,
} from "./helpers/state-snapshot-fixtures.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

/**
 * ST-09: the serialized document is identical on Windows, macOS and Linux
 * once the two per-run values are pinned: `generated_at` (the clock) and
 * `repository.root` (the temp directory). Everything else -- POSIX-relative
 * paths, code-unit sorting, pinned commit dates, content hashes -- is
 * deterministic by construction (architecture D11). `versions.cli` is the
 * package version the test passes in. A home directory nothing lives under
 * keeps the agents fallback from reading this machine's real user tier.
 */

const PACKAGE_VERSION = "1.17.0";
const NOW = () => new Date("2026-11-04T12:00:00.000Z");
const SNAPSHOT_DIR = "__snapshots__/state";

let parent: string;
let consumer: string;
let hub: string;
let selfHosted: string;
let noHome: string;

beforeAll(async () => {
  parent = await createFixtureDir("state-snapshot");
  noHome = join(parent, "no-home");
  await (await import("node:fs/promises")).mkdir(noHome);
  consumer = await buildConsumerFixture(parent);
  hub = await buildHubFixture(parent);
  selfHosted = await buildSelfHostedFixture(parent);
}, VERY_HEAVY_TEST_TIMEOUT * 2);

afterAll(async () => {
  await removeFixtureDir(parent);
});

function options(overrides: Partial<CollectStateOptions> = {}): CollectStateOptions {
  return { online: false, includeLocalPaths: false, now: NOW, hostname: FIXTURE_HOSTNAME, homeDir: noHome, ...overrides };
}

/** The document with its two per-run values pinned, serialized. */
function pinned(doc: StateDocument): string {
  return serializeState({ ...doc, repository: { ...doc.repository, root: "<root>" } });
}

const cases: Array<{ name: string; dir: () => string; overrides?: Partial<CollectStateOptions> }> = [
  { name: "consumer", dir: () => consumer },
  { name: "hub", dir: () => hub },
  { name: "hub-with-local-paths", dir: () => hub, overrides: { includeLocalPaths: true } },
  { name: "self-hosted", dir: () => selfHosted },
];

describe("state export snapshots (ST-09, ST-10, ST-11)", () => {
  for (const { name, dir, overrides } of cases) {
    it(`${name}: matches its committed snapshot, validates, is deterministic and leaks nothing`, async () => {
      const first = await collectState(dir(), PACKAGE_VERSION, options(overrides));
      const text = pinned(first);
      await expect(text).toMatchFileSnapshot(join(SNAPSHOT_DIR, `${name}.json`));

      const validate = await compileStateSchema();
      expect(validate(first)).toEqual([]);

      // Determinism: a second run differs only in generated_at.
      const second = await collectState(dir(), PACKAGE_VERSION, options({ ...overrides, now: () => new Date("2026-11-05T00:00:00.000Z") }));
      expect(second.generated_at).not.toBe(first.generated_at);
      expect(pinned({ ...second, generated_at: first.generated_at })).toBe(text);

      // Leak scan: the planted names never reach the document.
      const rules = createDenylistRules([FOREIGN_HOSTNAME, FOREIGN_CLONE_PATH, PRIVATE_NAME, USERINFO_CREDENTIAL], "state-leak");
      const output = join(parent, `${name}.output.json`);
      await writeFile(output, text, "utf8");
      expect(await scanFile(output, `${name}.json`, rules)).toEqual([]);
      expect(text).not.toContain("clones");
    }, VERY_HEAVY_TEST_TIMEOUT);
  }

  it("hub: local_path appears only with the flag, only for this machine, never the foreign one", async () => {
    const plain = await collectState(hub, PACKAGE_VERSION, options());
    const withPaths = await collectState(hub, PACKAGE_VERSION, options({ includeLocalPaths: true }));
    const repos = (doc: StateDocument) => doc.registry!.ventures.find((v) => v.slug === "ordovica")!.repos;
    expect(repos(plain).every((r) => !("local_path" in r))).toBe(true);
    expect(repos(withPaths).map((r) => r.local_path)).toEqual([FIXTURE_CLONE_PATH, null]);
    expect(serializeState(withPaths)).not.toContain(FOREIGN_CLONE_PATH);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("consumer: the remote URL is exported without its userinfo", async () => {
    const doc = await collectState(consumer, PACKAGE_VERSION, options());
    expect(doc.git?.remote).toEqual({ provider: "github", url: "https://github.com/ordovica/survey.git" });
  }, VERY_HEAVY_TEST_TIMEOUT);
});
