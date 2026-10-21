import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeFixtureDir } from "./fixture-dir.js";

/**
 * Points the user tier at a temp home holding a store manifest, so a test that
 * updates a `spell_scope: "user"` repository does not depend on whether the
 * machine running it has a real `~/.arcane` (#359: `spell update` refuses
 * without one, so such a test passed on a developer machine with the tier
 * installed and failed on CI). `os.homedir()` reads `USERPROFILE` (Windows) and
 * `HOME` (POSIX) at call time, so setting both is enough. Returns the restore
 * function: call it in `finally` or `afterEach`.
 */
export async function installFakeUserTier(version: string): Promise<() => Promise<void>> {
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  const home = await fs.mkdtemp(join(tmpdir(), "fake-user-tier-home-"));
  await fs.mkdir(join(home, ".arcane"), { recursive: true });
  await fs.writeFile(
    join(home, ".arcane", ".arcane.json"),
    JSON.stringify({ version, profile: "full", installedAt: "2026-10-20T00:00:00.000Z", components: [], scope: "user" }),
  );
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  return async () => {
    if (saved.HOME === undefined) delete process.env.HOME;
    else process.env.HOME = saved.HOME;
    if (saved.USERPROFILE === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = saved.USERPROFILE;
    await removeFixtureDir(home);
  };
}
