import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

async function runTarballWait(readyAt: number) {
  const workflow = parse(await fs.readFile(".github/workflows/publish.yml", "utf8")) as {
    jobs: { publish: { steps: { name: string; run?: string }[] } };
  };
  const step = workflow.jobs.publish.steps.find(({ name }) =>
    name === "Wait for published tarball to become downloadable",
  );
  if (!step?.run) throw new Error("Publish workflow is missing its tarball wait");

  // Execute the real step with a virtual clock and an npm endpoint that returns
  // 404 until the tarball can be downloaded through the normal install path.
  const fixtures = `
    sleep() { SECONDS=$((SECONDS + $1)); }
    timeout() {
      local seconds="\${2%s}"
      if (( seconds < 1 || seconds > 15 )); then exit 2; fi
      shift 2
      "$@"
    }
    npm() {
      if (( SECONDS < ${readyAt} )); then
        echo "npm error 404 Not Found" >&2
        return 1
      fi
      local archive="arcane-cli-$VERSION.tgz"
      touch "$VERIFY_DIR/$archive"
      echo "$archive"
    }
    curl() {
      if [[ "$*" == *"arcane-cli-$VERSION.tgz?arcane-verify="* ]]; then
        touch "$VERIFY_DIR/direct.tgz"
      else
        return 1
      fi
    }
    tar() { test "$1" = "-tzf" && test -f "$2"; }
  `;
  return spawnSync("bash", ["-c", fixtures + step.run], {
    encoding: "utf8",
    timeout: 5_000,
  });
}

describe("npm publish workflow", () => {
  it("pins an npm major compatible with the configured Node runtime", async () => {
    const workflow = await fs.readFile(
      join(process.cwd(), ".github", "workflows", "publish.yml"),
      "utf8",
    );

    expect(workflow).toContain("node-version: 20");
    expect(workflow).toContain("npm install -g npm@11");
    expect(workflow).not.toContain("npm install -g npm@latest");
  });

  it("supports manual recovery after a release-triggered publish failure", async () => {
    const workflow = await fs.readFile(
      join(process.cwd(), ".github", "workflows", "publish.yml"),
      "utf8",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("npm publish --provenance --access public");
  });

  it("installs and exercises the packed CLI before publishing", async () => {
    const workflow = await fs.readFile(
      join(process.cwd(), ".github", "workflows", "publish.yml"),
      "utf8",
    );

    expect(workflow).toContain("npm pack --json --pack-destination");
    expect(workflow).toContain('npm install --prefix "$INSTALL_DIR"');
    expect(workflow).toContain('"$CLI" --version');
    expect(workflow).toContain('"$CLI" status');
    expect(workflow.indexOf("Verify packed package is installable")).toBeLessThan(
      workflow.indexOf("Publish to npm (OIDC trusted publishing — no token)"),
    );
  });

  it("accepts a standard npm download after the delay seen with v1.23.1", async () => {
    const result = await runTarballWait(480);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain("Downloaded and inspected");
  });

  it("reports a timed-out standard download even if the direct registry probe succeeds", async () => {
    const result = await runTarballWait(1_000);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(1);
    expect(result.stdout).toContain("Direct registry probe downloaded");
    expect(result.stdout).toMatch(/did not verify after 90\ds/);
    expect(result.stdout).toContain("npm error 404");
  });
});

describe("release drift workflow", () => {
  it("creates the release and starts publish.yml with the built-in token, holding no stored credential", async () => {
    const workflow = await fs.readFile(
      join(process.cwd(), ".github", "workflows", "release-drift.yml"),
      "utf8",
    );

    // A personal access token here expired silently and left 1.12.0 merged
    // but unpublished (2026-10-12). The built-in token cannot expire.
    expect([...new Set(workflow.match(/secrets\.\w+/g))]).toEqual(["secrets.GITHUB_TOKEN"]);
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("actions: write");
    expect(workflow).toContain('gh release create "${TAG}"');
    // A release created with GITHUB_TOKEN fires no `release` event, so the job
    // must start publish.yml itself, on the tag it just created.
    expect(workflow).toContain('gh workflow run publish.yml --repo "${{ github.repository }}" --ref "${TAG}"');
  });
});
