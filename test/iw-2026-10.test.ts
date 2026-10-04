import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { blockContaining, expectNotNegated, expectProseToContain, normalizeProse } from "./helpers/prose.js";

// Issue wave 2026-10 (features/issue-wave-2026-10/PRD.md): eight consumer
// lessons carried into the spells. One describe block per issue.

const ARCANE = join(process.cwd(), "src", "assets", ".arcane");
const spell = (id: string) => readFile(join(ARCANE, "spells", `spell-${id}.md`), "utf8");

let plan: string;
let scope: string;
let bug: string;
let eas: string;
let closeSession: string;
let openSession: string;
let feedback: string;
let commitWork: string;
let createPr: string;
let gitConventions: string;

beforeAll(async () => {
    [plan, scope, bug, eas, closeSession, openSession, feedback, commitWork, createPr, gitConventions] =
        await Promise.all([
            spell("plan"),
            spell("scope"),
            spell("bug"),
            spell("eas-store-deploy"),
            spell("close-session"),
            spell("open-session"),
            spell("feedback"),
            spell("commit-work"),
            spell("create-pull-request"),
            readFile(join(ARCANE, "governance", "git-conventions.md"), "utf8"),
        ]);
});

describe("#325 acceptance criteria are read against the Won't Have list", () => {
    it("spell-plan flags a criterion that can only hold if a Won't Have item is done", () => {
        const step = blockContaining(plan, "**Check acceptance criteria against Won't Have.**");
        expectProseToContain(step, "can only hold if a Won't Have item is done");
        expectProseToContain(step, "⚠ AC conflicts with Won't Have");
        // The check runs after the ADR validation and before the PRD is saved.
        const check = plan.indexOf("**Check acceptance criteria against Won't Have.**");
        expect(check).toBeGreaterThan(plan.indexOf("**Validate against existing ADRs**"));
        expect(check).toBeLessThan(plan.indexOf("**Save to disk**"));
    });

    it("spell-scope's quick-check runs the same check by reference, not by copy", () => {
        const quickCheck = scope.slice(scope.indexOf("### 1.5. Quality Quick-Check"), scope.indexOf("### 2. Scope Assessment"));
        expectProseToContain(quickCheck, "`spell-plan`'s acceptance-criteria-vs-Won't-Have check");
        expect(quickCheck).not.toContain("⚠ AC conflicts with Won't Have");
    });
});

describe("#297 spell-bug diffs the environment before the code", () => {
    it("adds the 'it worked before' branch to Diagnose with its three ordered actions", () => {
        const diagnose = bug.slice(bug.indexOf("3. **Diagnose**"), bug.indexOf("4. **Implement the fix**"));
        expectProseToContain(diagnose, "diff the environment before the code");
        const dependencySet = diagnose.indexOf("Compare the dependency set");
        const readSource = diagnose.indexOf("read its actual implementation");
        const designFix = diagnose.indexOf("Only then design the fix");
        expect(dependencySet).toBeGreaterThan(-1);
        expect(readSource).toBeGreaterThan(dependencySet);
        expect(designFix).toBeGreaterThan(readSource);
        expectProseToContain(diagnose, "Prefer the upstream fix plus a stopgap over a workaround in the calling code");
    });
});

describe("#298 spell-eas-store-deploy: OTA/native alignment and console verification", () => {
    it("publishes an OTA only from a commit whose native dependencies match the installed binary", () => {
        const rule = blockContaining(eas, "**🔴 An OTA update must match the installed binary's native dependencies.**");
        expectProseToContain(rule, "`runtimeVersion.policy: appVersion`");
        expectProseToContain(rule, "`--commit-id <sha>`");
        expectProseToContain(rule, "`eas update`'s `Commit`, `Runtime version` and `Platform` lines");
        expectProseToContain(rule, "**Bump the app version in the same PR as any native dependency change**");
        expectProseToContain(rule, "(`package.json`, the lockfile and the app config's plugins)");
        expectProseToContain(rule, "reading the published update back (`eas update:view <group-id>`)");
        expectNotNegated(rule);
    });

    it("verifies every console save by reload and re-read, leaves big uploads and credentials to the operator", () => {
        const start = eas.indexOf("### Console automation (both stores)");
        expect(start).toBeGreaterThan(-1);
        const section = eas.slice(start, eas.indexOf("\n---", start));
        expectProseToContain(section, "reloading the page and re-reading the saved state");
        expect(section).toContain("`EV-01`");
        expectProseToContain(section, "the operator drags the artifact into the console's upload box");
        expectProseToContain(section, "The agent never types credentials");
    });

    it("records the unverified console specifics as dated observations with a re-check", () => {
        const observations = blockContaining(eas, "**Observed in one consumer session (2026-09-28)");
        expectProseToContain(observations, "re-check against the live console before relying on any of them");
        expect(observations).toContain("`<versionCode> (<version>)`");
        expect(observations).toContain("`authResult=FAILED`");
    });
});

describe("#322 environment claims in the handoff carry a date and a re-verify command", () => {
    it("close-session's Blockers and Notes require the date and command", () => {
        const blockers = blockContaining(closeSession, "- **Blockers:** Known unresolved blockers");
        expectProseToContain(blockers, "`<claim> — observed YYYY-MM-DD — re-verify: <command>`");
        expectProseToContain(blockers, "read-only command");
        const notes = blockContaining(closeSession, "- **Notes:** Anything time-sensitive");
        expectProseToContain(notes, "date it and give its re-verify command");
    });

    it("open-session re-runs the command before repeating the claim", () => {
        const bullet = blockContaining(openSession, "**Environment claims are re-verified, not repeated.**");
        expectProseToContain(bullet, "run its recorded re-verify command");
        expectProseToContain(bullet, "never as current");
        // The command comes from an editable file, so it runs only when read-only and quick.
        expectProseToContain(bullet, "run it only if it is read-only and quick");
        expectProseToContain(bullet, "`not re-verified (command not run: <reason>)`");
    });
});

describe("#299 private assistant memory is not a home for lessons", () => {
    const sentence = "An assistant's private memory is a convenience for the current assistant only and is never a destination for a lesson.";

    it("close-session step 2b says so", () => {
        const step = closeSession.slice(closeSession.indexOf("2b. **Lesson routing"), closeSession.indexOf("3. **Update [DECISIONS.md]"));
        expectProseToContain(step, sentence);
    });

    it("spell-feedback's scope step says so by reference, not by copy", () => {
        const step = feedback.slice(feedback.indexOf("## Step 1 — Identify Scope"), feedback.indexOf("## Step 2"));
        expectProseToContain(step, "Private assistant memory is never a destination for a lesson (`spell-close-session` step 2b)");
        expect(normalizeProse(step)).not.toContain(sentence);
    });
});

describe("#321 spell-commit-work checks the branch's PR state before pushing", () => {
    it("queries the provider and stops on a merged PR, between the push-policy check and the push", () => {
        const heading = "**PR-state check — before a branch push.**";
        const check = commitWork.slice(commitWork.indexOf(heading), commitWork.indexOf("When the checks allow it"));
        expectProseToContain(check, "`gh pr list --head <branch> --state all --json number,state`");
        expectProseToContain(check, "`az repos pr list --source-branch <branch> --status all`");
        expectProseToContain(check, "do not push: stop and name the merged PR");
        expectProseToContain(check, "**`CLOSED` without merging (`abandoned` on Azure DevOps):** name the PR and ask before pushing");
        expectProseToContain(check, "It does not cover Step 10's `git push origin --delete <branch>`");
        expectProseToContain(check, "Enforcement: structured spell gate (ARC-023)");
        const checkAt = commitWork.indexOf(heading);
        expect(checkAt).toBeGreaterThan(commitWork.indexOf("<!-- fragment:push-policy-check:end -->"));
        expect(checkAt).toBeLessThan(commitWork.indexOf("When the checks allow it, run `git push origin <branch>`."));
    });
});

describe("#324 one closing keyword per issue, and each issue's state confirmed after merge", () => {
    it("Step 4 states the rule and the forbidden form", () => {
        const rule = blockContaining(createPr, "**Closing issues: one keyword per issue.**");
        expectProseToContain(rule, "`Closes #A. Closes #B.`");
        expectProseToContain(rule, "never `Closes #A and #B`");
    });

    it("Step 6 confirms each named issue's state after the merge", () => {
        const report = createPr.slice(createPr.indexOf("## Step 6 — Report"));
        const bullet = blockContaining(report, "**Issues the body closes:**");
        expectProseToContain(bullet, "add one line to the `Needs you` block");
        expect(bullet).toContain("gh issue view <number> --json state");
        // ...and close-session step 10 actually runs the check once the merge is confirmed.
        const step10 = closeSession.slice(closeSession.indexOf("10. **Synchronize the configured integration branch"));
        expectProseToContain(step10, "confirm each issue the PR's body closes is closed");
    });

    it("git-conventions' footer example agrees", () => {
        expectProseToContain(gitConventions, "one keyword per issue, each on its own footer line (`Closes #535`, then `Closes #536`), never `Closes #535 and #536`");
    });
});

describe("#323 links inside a worktree are unlinked before git worktree remove --force", () => {
    it("git-conventions Post-Merge Cleanup carries the warning with both platforms' commands and the evidence scope", () => {
        const cleanup = gitConventions.slice(
            gitConventions.indexOf("### Post-Merge Cleanup"),
            gitConventions.indexOf("### Content-Verified Branch Deletion"),
        );
        expectProseToContain(cleanup, "**Links inside the worktree — check before `git worktree remove --force`.**");
        expect(cleanup).toContain("find <path> -type l");
        expect(cleanup).toContain('rm "<link>"');
        expect(cleanup).toContain("function Find-Links($p)");
        expect(cleanup).toContain('cmd /c rmdir "<link>"');
        // The listing must not recurse through junctions (Windows PowerShell 5.1 -Recurse can).
        expect(cleanup).not.toContain("Get-ChildItem -Force -Recurse");
        expectProseToContain(cleanup, "Enforcement: explicitly advisory prose (ARC-023) — `spell-close-session` step 10 points here");
        expectProseToContain(cleanup, "observed once");
        expectProseToContain(cleanup, "git 2.43.0");
    });

    it("close-session step 10 points to the warning instead of copying it", () => {
        const step10 = closeSession.slice(closeSession.indexOf("10. **Synchronize the configured integration branch"));
        expectProseToContain(step10, "list and unlink any junctions or symlinks inside it first");
        expect(normalizeProse(step10)).not.toContain("find <path> -type l");
    });
});
