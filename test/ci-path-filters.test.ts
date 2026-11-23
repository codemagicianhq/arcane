import { describe, expect, it, vi } from "vitest";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { listCiPathCandidates, runCiPathFilters } from "../src/commands/ci-path-filters.js";
import { execFileWithTimeout, resolveAzureCli } from "../src/modules/exec.js";
vi.mock("../src/modules/exec.js", async (original) => {
  const actual = await original<typeof import("../src/modules/exec.js")>();
  return { ...actual, execFileWithTimeout: vi.fn(), resolveAzureCli: vi.fn(actual.resolveAzureCli) };
});
import { checkBuildPolicy, checkPipeline, checkSafePolicyUpdate, createFilterPlan, findReferences, isArcaneCandidate, renderPipeline, unchangedPolicySettings } from "../src/modules/ci-path-filters.js";

const tracked = ["journal/day.md", "features/one/stories.json", "features/one/notes.md", "docs/input.md", ".arcane/generated/app.ts", "journal/script.ts", "package-lock.json", "azure-pipelines.yml", "new-service/main.ts"];
const target = { id: 9, repositoryId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", branch: "main", buildDefinitionId: 12 };
const policy = (filter: string[]) => ({ id: 9, type: { id: "0609b952-1397-4640-95ec-e00a01b2c241" }, isEnabled: true, isBlocking: true, settings: { buildDefinitionId: 12, manualQueueOnly: false, queueOnSourceUpdateOnly: false, displayName: "build", validDuration: 0, filenamePatterns: filter, scope: [{ repositoryId: target.repositoryId, refName: "refs/heads/main", matchKind: "exact" }] } });

describe("reviewed exact path candidates", () => {
  it("includes only named Arcane-owned records and never generated files or code", () => {
    expect(tracked.filter(isArcaneCandidate)).toEqual(["journal/day.md", "features/one/stories.json", "features/one/notes.md"]);
    expect(isArcaneCandidate("TODO.md")).toBe(true);
    for (const path of ["README.md", "docs/input.md", ".arcane/generated/data.md", "journal/test.js", "journal/x.yml", "features/one/package-lock.json", "journal/*.md", "../TODO.md"]) expect(isArcaneCandidate(path)).toBe(false);
  });
  it("does not skip code, mixed or newly added paths", () => {
    const plan = createFilterPlan(["journal/day.md"], tracked);
    expect(plan.exclusions).toEqual(["journal/day.md"]);
    for (const path of ["new-service/main.ts", "journal/script.ts", "package-lock.json", "azure-pipelines.yml", ".arcane/generated/app.ts"]) expect(plan.exclusions).not.toContain(path);
    expect(plan.policyFilter).toBe("/*;!/journal/day.md");
  });
  it("refuses unknown, duplicate and case-colliding paths", () => {
    expect(() => createFilterPlan(["journal/##vso[bad].md"], tracked)).toThrow(/Invalid/);
    expect(() => createFilterPlan(["journal/missing.md"], tracked)).toThrow(/matches no tracked/);
    expect(() => createFilterPlan(["journal/script.ts"], tracked)).toThrow(/Unsafe/);
    expect(() => createFilterPlan(["journal/day.md", "journal/day.md"], tracked)).toThrow(/Duplicate/);
    expect(() => createFilterPlan(["journal/day.md"], [...tracked, "Journal/day.md"])).toThrow(/Case collision/);
  });
});

describe("pipeline and policy agreement", () => {
  const plan = createFilterPlan(["journal/day.md"], tracked);
  const yaml = renderPipeline("trigger:\n  branches:\n    include: [main]\nsteps: []\n", plan);
  it("emits both forms and verifies the exact exclusions and comment", () => {
    expect(yaml).toContain("# Arcane branch-policy path filter: /*;!/journal/day.md");
    expect(checkPipeline(yaml, plan)).toEqual([]);
    expect(checkPipeline(yaml.replace("journal/day.md", "Journal/day.md"), plan)).not.toEqual([]);
    expect(checkPipeline(yaml.replace("- journal/day.md", "- journal/other.md"), plan)).not.toEqual([]);
    expect(checkPipeline(yaml, plan, "main")).toEqual([]);
    expect(checkPipeline(yaml, plan, "release")).toContain("Pipeline must explicitly include the target branch without branch exclusions");
  });
  it("rejects existing path triggers, malformed YAML and other trigger scopes", () => {
    expect(() => renderPipeline("trigger: [", plan)).toThrow(/invalid or unsupported/);
    expect(() => renderPipeline("trigger: {}\nsteps:\n- script: echo '##vso[task.setvariable variable=x]y'\n", plan)).toThrow(/logging commands/);
    expect(() => renderPipeline("trigger: none", plan)).toThrow(/mapping/);
    expect(() => renderPipeline(yaml, plan)).toThrow(/Existing/);
    expect(() => renderPipeline("trigger:\n  paths:\n    include: [src]\n", plan)).toThrow(/Existing/);
    expect(checkPipeline("trigger: [", plan)).not.toEqual([]);
    expect(checkPipeline("trigger: none", plan)).not.toEqual([]);
    const emptyPlan = createFilterPlan([], tracked);
    const unfiltered = renderPipeline("trigger:\n  branches:\n    include: [main]\n", emptyPlan);
    expect(checkPipeline(unfiltered, emptyPlan, "main")).toEqual([]);
    expect(checkPipeline(yaml, emptyPlan, "main")).toContain("Expected an unfiltered trigger");
  });
  it("checks live-shaped policy type, identity, exact scope, blocking, queue and filter", () => {
    expect(checkBuildPolicy(policy(["/*", "!/journal/day.md"]), target, plan.policyFilter)).toEqual([]);
    expect(checkBuildPolicy(policy(["/*", "!/Journal/day.md"]), target, plan.policyFilter)).not.toEqual([]);
    expect(checkBuildPolicy({ ...policy([]), isBlocking: false }, target, plan.policyFilter)).not.toEqual([]);
    expect(checkBuildPolicy(policy([]), { ...target, branch: "other" }, "")).not.toEqual([]);
    expect(checkBuildPolicy({ ...policy([]), isDeleted: true }, target, "")).not.toEqual([]);
    const missingFilter = { ...policy([]).settings };
    Reflect.deleteProperty(missingFilter, "filenamePatterns");
    expect(checkBuildPolicy({ ...policy([]), settings: missingFilter }, target, "")).not.toEqual([]);
    expect(checkBuildPolicy(null, target, "")).not.toEqual([]);
    expect(checkBuildPolicy({ ...policy([]), settings: { ...policy([]).settings, filenamePatterns: null } }, target, "")).toEqual([]);
  });
  it("refuses updates that Azure CLI would truncate and detects other settings changing", () => {
    const original = policy([]);
    expect(checkSafePolicyUpdate(original)).toEqual([]);
    expect(checkSafePolicyUpdate(null)).not.toEqual([]);
    expect(checkSafePolicyUpdate({ ...original, settings: { ...original.settings, displayName: null } })).not.toEqual([]);
    expect(checkSafePolicyUpdate({ ...original, settings: { ...original.settings, scope: [...original.settings.scope, original.settings.scope[0]] } })).not.toEqual([]);
    expect(checkSafePolicyUpdate({ ...original, settings: { ...original.settings, futureSetting: true } })).not.toEqual([]);
    expect(checkSafePolicyUpdate({ ...original, settings: { ...original.settings, scope: [{ ...original.settings.scope[0], extra: true }] } })).not.toEqual([]);
    expect(unchangedPolicySettings(original, policy(["/*", "!/journal/day.md"]))).toBe(true);
    expect(unchangedPolicySettings(original, { ...original, settings: { ...original.settings, validDuration: 10 } })).toBe(false);
  });
  it("reports test references with the path to remove", () => {
    expect(findReferences(["journal/day.md"], new Map([["test/example.test.ts", "readFile('journal/day.md')"]]))).toContain("test/example.test.ts references journal/day.md; remove journal/day.md from the list");
  });
});

describe("policy guard with a real tracked fixture", () => {
  it("requires two matching policies and fails on live mismatch or a test reference", async () => {
    const dir = await createFixtureDir("arcane-ci-filter");
    const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
    try {
      git("init", "-q"); git("config", "user.email", "fixture@example.invalid"); git("config", "user.name", "Fixture");
      git("remote", "add", "origin", "https://dev.azure.com/example/Project/_git/repo");
      await mkdir(join(dir, "journal"));
      await writeFile(join(dir, "journal/day.md"), "log\n");
      await writeFile(join(dir, "reviewed.json"), JSON.stringify(["journal/day.md"]));
      const plan = createFilterPlan(["journal/day.md"], ["journal/day.md"]);
      await writeFile(join(dir, "azure-pipelines.yml"), "trigger:\n  branches:\n    include: [main]\nsteps: []\n");
      git("add", ".");
      const options = { reviewed: join(dir, "reviewed.json"), pipeline: join(dir, "azure-pipelines.yml"), org: "https://dev.azure.com/example", project: "Project", repositoryId: target.repositoryId, branch: "main", buildPolicyId: "9", buildId: "12", guardPolicyId: "10", guardBuildId: "13" };
      expect((await runCiPathFilters("prepare", dir, { ...options, reviewed: join(dir, "missing.json") })).ok).toBe(false);
      await writeFile(join(dir, "reviewed.json"), "{}");
      expect((await runCiPathFilters("prepare", dir, options)).output).toContain("JSON array");
      await writeFile(join(dir, "reviewed.json"), "[]");
      expect((await runCiPathFilters("prepare", dir, options)).output).toContain("(all paths)");
      await writeFile(join(dir, "reviewed.json"), JSON.stringify(["journal/day.md"]));
      expect(await listCiPathCandidates(dir)).toContain("journal/day.md");
      const prepared = await runCiPathFilters("prepare", dir, options);
      expect(prepared.ok).toBe(true);
      expect(prepared.output).toContain(plan.policyFilter);
      await writeFile(join(dir, "azure-pipelines.yml"), prepared.output);
      git("add", "."); git("commit", "-qm", "fixture");
      const guard = { ...policy([]), id: 10, settings: { ...policy([]).settings, buildDefinitionId: 13 } };
      const repositoryId = async () => ({ id: target.repositoryId });
      const deps = { repositoryId, policy: async (id: number) => id === 9 ? policy(["/*", "!/journal/day.md"]) : guard };
      expect((await runCiPathFilters("check", dir, options, deps)).ok).toBe(true);
      await writeFile(join(dir, "azure-pipelines.yml"), "{}\n");
      expect((await runCiPathFilters("check", dir, options, deps)).ok).toBe(false);
      await writeFile(join(dir, "azure-pipelines.yml"), prepared.output);
      await writeFile(join(dir, "untracked.txt"), "untracked");
      expect((await runCiPathFilters("check", dir, options, deps)).output).toContain("clean checkout");
      await unlink(join(dir, "untracked.txt"));
      expect((await runCiPathFilters("check", dir, { ...options, guardPolicyId: "0" }, deps)).ok).toBe(false);
      expect((await runCiPathFilters("check", dir, { ...options, guardPolicyId: "9" }, deps)).ok).toBe(false);
      expect((await runCiPathFilters("check", dir, options, { ...deps, repositoryId: async () => { throw new Error("offline"); } })).ok).toBe(false);
      expect((await runCiPathFilters("check", dir, options, { repositoryId, policy: async () => policy([]) })).ok).toBe(false);
      let filter: string[] = [];
      let writes = 0;
      const applyDeps = {
        repositoryId,
        policy: async (id: number) => id === 9 ? policy(filter) : guard,
        update: async (_id: number, _org: string, _project: string, value: string) => { writes++; filter = value.split(";"); },
      };
      expect((await runCiPathFilters("apply", dir, options, applyDeps)).ok).toBe(false);
      expect(writes).toBe(0);
      expect((await runCiPathFilters("apply", dir, { ...options, confirmPolicyUpdate: true }, {
        ...applyDeps,
        policy: async (id: number) => id === 9 ? policy([]) : { ...guard, isBlocking: false },
      })).ok).toBe(false);
      expect((await runCiPathFilters("apply", dir, { ...options, confirmPolicyUpdate: true }, {
        ...applyDeps,
        policy: async (id: number) => id === 9 ? { ...policy([]), settings: { ...policy([]).settings, scope: [...policy([]).settings.scope, policy([]).settings.scope[0]] } } : guard,
      })).output).toContain("discard additional");
      expect(writes).toBe(0);
      expect((await runCiPathFilters("apply", dir, { ...options, confirmPolicyUpdate: true }, applyDeps)).ok).toBe(true);
      expect(writes).toBe(1);
      expect(filter).toEqual(["/*", "!/journal/day.md"]);
      vi.mocked(execFileWithTimeout).mockImplementation(async (_file, args) => {
        if (args[0] === "repos" && args[1] === "show") return { stdout: JSON.stringify({ id: target.repositoryId }), stderr: "" };
        if (args.includes("update")) { filter = args[args.indexOf("--path-filter") + 1].split(";"); return { stdout: "", stderr: "" }; }
        return { stdout: JSON.stringify(args[args.indexOf("--id") + 1] === "9" ? policy(filter) : guard), stderr: "" };
      });
      vi.mocked(resolveAzureCli).mockReturnValue({ file: "az", prefixArgs: [], env: { ARCANE_TEST: "yes" } });
      expect((await runCiPathFilters("check", dir, options)).ok).toBe(true);
      expect((await runCiPathFilters("apply", dir, { ...options, confirmPolicyUpdate: true })).ok).toBe(true);
      expect((await runCiPathFilters("check", dir, { ...options, org: "http://bad" }, deps)).ok).toBe(false);
      expect((await runCiPathFilters("check", dir, options, { repositoryId, policy: async () => { throw new Error("secret"); } })).output).toContain("Unable to read live Azure policies");
      expect((await runCiPathFilters("check", dir, options, { repositoryId: async () => ({ id: "different" }), policy: deps.policy })).output).toContain("does not match");
      expect((await runCiPathFilters("check", dir, { ...options, org: "https://dev.azure.com/other" }, deps)).ok).toBe(false);
      git("remote", "set-url", "origin", "https://example.visualstudio.com/Project/_git/repo");
      expect((await runCiPathFilters("check", dir, options, deps)).ok).toBe(true);
      git("remote", "set-url", "origin", "https://evil.example/dev.azure.com/example/Project/_git/repo");
      expect((await runCiPathFilters("check", dir, options, deps)).ok).toBe(false);
      git("remote", "set-url", "origin", "https://dev.azure.com/example/Project/_git/repo");
      expect((await runCiPathFilters("apply", dir, { ...options, confirmPolicyUpdate: true }, { ...applyDeps, update: async () => { throw new Error("timeout"); } })).output).toContain("could not be verified");
      expect((await runCiPathFilters("apply", dir, { ...options, confirmPolicyUpdate: true }, { repositoryId, policy: applyDeps.policy })).output).toContain("unavailable");
      expect((await runCiPathFilters("apply", dir, { ...options, confirmPolicyUpdate: true }, { ...applyDeps, policy: async (id) => id === 9 ? policy([]) : guard, update: async () => {} })).output).toContain("inspect the live policy");
      const createOptions = { ...options, buildPolicyId: undefined, confirmPolicyUpdate: true };
      let creates = 0;
      const createdPolicy = { ...policy(["/*", "!/journal/day.md"]), id: 11 };
      const createDeps = {
        repositoryId,
        policy: async (id: number) => id === 10 ? guard : createdPolicy,
        list: async () => [],
        create: async () => { creates++; return { id: 11 }; },
      };
      expect((await runCiPathFilters("create", dir, { ...createOptions, confirmPolicyUpdate: false }, createDeps)).ok).toBe(false);
      expect((await runCiPathFilters("create", dir, { ...createOptions, buildPolicyId: "9" }, createDeps)).ok).toBe(false);
      expect((await runCiPathFilters("create", dir, { ...createOptions, guardBuildId: "12" }, createDeps)).ok).toBe(false);
      expect((await runCiPathFilters("create", dir, createOptions, { ...createDeps, list: async () => { throw new Error("offline"); } })).ok).toBe(false);
      expect((await runCiPathFilters("create", dir, createOptions, { ...createDeps, list: async () => [policy([])] })).ok).toBe(false);
      expect((await runCiPathFilters("create", dir, createOptions, { ...createDeps, list: async () => [null] })).ok).toBe(false);
      expect(creates).toBe(0);
      const created = await runCiPathFilters("create", dir, createOptions, createDeps);
      expect(created.ok).toBe(true);
      expect(created.output).toContain("policy 11");
      expect(creates).toBe(1);
      expect((await runCiPathFilters("create", dir, createOptions, { ...createDeps, create: async () => ({}) })).output).toContain("could not be verified");
      expect((await runCiPathFilters("create", dir, createOptions, { ...createDeps, policy: async (id) => id === 10 ? guard : policy([]) })).output).toContain("inspect policy");
      vi.mocked(execFileWithTimeout).mockImplementation(async (_file, args) => {
        if (args[0] === "repos" && args[1] === "show") return { stdout: JSON.stringify({ id: target.repositoryId }), stderr: "" };
        if (args.includes("list")) return { stdout: "[]", stderr: "" };
        if (args.includes("create")) return { stdout: JSON.stringify({ id: 11 }), stderr: "" };
        return { stdout: JSON.stringify(args[args.indexOf("--id") + 1] === "10" ? guard : createdPolicy), stderr: "" };
      });
      expect((await runCiPathFilters("create", dir, createOptions)).ok).toBe(true);
      await writeFile(join(dir, "test.ts"), "readFile('journal/day.md')");
      git("add", "."); git("commit", "-qm", "add test");
      const result = await runCiPathFilters("check", dir, options, deps);
      expect(result.ok).toBe(false);
      expect(result.output).toContain("remove journal/day.md");
      await writeFile(join(dir, "journal/pipeline.md"), "trigger:\n  branches:\n    include: [main]\nsteps: []\n");
      await writeFile(join(dir, "reviewed.json"), JSON.stringify(["journal/pipeline.md"]));
      git("add", ".");
      const pipelineExcluded = await runCiPathFilters("prepare", dir, { ...options, pipeline: join(dir, "journal/pipeline.md") });
      expect(pipelineExcluded.ok).toBe(false);
      expect(pipelineExcluded.output).toContain("must always trigger");
      await mkdir(join(dir, "features/one"), { recursive: true });
      await writeFile(join(dir, "features/one/stories.json"), JSON.stringify(["features/one/stories.json"]));
      git("add", ".");
      const listExcluded = await runCiPathFilters("prepare", dir, { ...options, reviewed: join(dir, "features/one/stories.json") });
      expect(listExcluded.ok).toBe(false);
      expect(listExcluded.output).toContain("must always trigger");
    } finally { await removeFixtureDir(dir); }
  });
  it("refuses policy writes when no exclusion has been reviewed", async () => {
    const dir = await createFixtureDir("arcane-ci-empty");
    const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
    try {
      git("init", "-q"); git("config", "user.email", "fixture@example.invalid"); git("config", "user.name", "Fixture");
      git("remote", "add", "origin", "https://dev.azure.com/example/Project/_git/repo");
      await writeFile(join(dir, "reviewed.json"), "[]");
      await writeFile(join(dir, "azure-pipelines.yml"), renderPipeline("trigger:\n  branches:\n    include: [main]\n", createFilterPlan([], [])));
      git("add", "."); git("commit", "-qm", "fixture");
      const options = { reviewed: join(dir, "reviewed.json"), pipeline: join(dir, "azure-pipelines.yml"), org: "https://dev.azure.com/example", project: "Project", repositoryId: target.repositoryId, branch: "main", buildPolicyId: "9", buildId: "12", guardPolicyId: "10", guardBuildId: "13", confirmPolicyUpdate: true };
      const guard = { ...policy([]), id: 10, settings: { ...policy([]).settings, buildDefinitionId: 13 } };
      const deps = { repositoryId: async () => ({ id: target.repositoryId }), policy: async (id: number) => id === 9 ? policy([]) : guard, list: async () => [], create: async () => ({ id: 11 }), update: async () => {} };
      expect((await runCiPathFilters("apply", dir, options, deps)).output).toContain("No exclusions");
      expect((await runCiPathFilters("create", dir, { ...options, buildPolicyId: undefined }, deps)).output).toContain("No exclusions");
    } finally { await removeFixtureDir(dir); }
  });
});
