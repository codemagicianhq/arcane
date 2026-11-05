import { createRequire } from "node:module";

/** The fields this CLI reads from its own package.json. */
export interface OwnPackageJson {
  version: string;
  publishConfig?: { registry?: string };
}

const require = createRequire(import.meta.url);

/**
 * This package's own package.json: the one read, for every caller.
 *
 * The path is relative to the file that is running, and that file is not
 * always this one. From source it is `src/package-info.ts`; in the published
 * package tsup bundles every module into `dist/index.js` (tsup.config.ts), so
 * `import.meta.url` is the bundle. Both sit one folder below the package
 * root, so `../package.json` is right in both, and that is why this module
 * lives directly in `src/` and has to stay there.
 *
 * Do not add a second relative read anywhere else. One written in
 * `src/modules/` as `../../package.json` passes every test that imports the
 * source and resolves to the folder above the package once bundled, which is
 * how the latest-version lookup failed in every installed copy through
 * 1.17.2. test/installed-cli-version-lookup.test.ts runs the bundle from an
 * installed layout and holds this.
 */
export const packageJson = require("../package.json") as OwnPackageJson;
