import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { blockContaining, expectNotNegated, expectProseToContain, normalizeProse } from "./helpers/prose.js";

// Issue wave 2026-10-20 B (features/issue-wave-2026-10-20-b/PRD.md): the EAS
// update lifecycle (#376) and a visual-verification routine (#375). One
// describe block per story.

const ARCANE = join(process.cwd(), "src", "assets", ".arcane");

// Shipped text must not cite this repository's issue numbers: once installed,
// "#376" would mean the consumer's own issue.
const ISSUE_NUMBER = /#\d+/;

let standards: string;
let eas: string;
let testSpell: string;

beforeAll(async () => {
    [standards, eas, testSpell] = await Promise.all([
        readFile(join(ARCANE, "governance", "mobile-release-standards.md"), "utf8"),
        readFile(join(ARCANE, "spells", "spell-eas-store-deploy.md"), "utf8"),
        readFile(join(ARCANE, "spells", "spell-test.md"), "utf8"),
    ]);
});

/** Asserts that every needle occurs in `text`, each after the one before it. */
function expectInOrder(text: string, needles: string[]): void {
    const prose = normalizeProse(text);
    let from = -1;
    for (const needle of needles) {
        const at = prose.indexOf(normalizeProse(needle), from + 1);
        expect(at, `"${needle}" after position ${from}`).toBeGreaterThan(from);
        from = at;
    }
}

describe("#376 mobile-release-standards: the runtime audit and the toolchain guard are release gates", () => {
    const gates = () => standards.slice(standards.indexOf("## Release gates"), standards.indexOf("## Related"));

    it("lists MR-15 and MR-16 in the rule index and gives each its own section under Release gates", () => {
        expect(standards).toContain("| MR-15 |");
        expect(standards).toContain("| MR-16 |");
        expect(standards.indexOf("## Release gates")).toBeGreaterThan(standards.indexOf("### MR-14:"));
        expect(gates()).toContain("### MR-15:");
        expect(gates()).toContain("### MR-16:");
        expect(gates()).not.toMatch(ISSUE_NUMBER);
    });

    it("MR-15 audits every store version still in use for an update path, as it will stand once the release ships", () => {
        const rule = blockContaining(standards, "**Rule (MR-15):");
        expectProseToContain(rule, "Before each store release, list every binary version still in use");
        expectProseToContain(rule, "from the store releases, not from the updates published to them");
        expectProseToContain(rule, "judging each as it will stand once the release ships");
        expectProseToContain(rule, "an update path");
        expectProseToContain(rule, "an in-app prompt that sends it to the store");
        expectProseToContain(rule, "is stranded");
        expectProseToContain(rule, "Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's runtime audit");
        expectNotNegated(rule);
    });

    it("MR-15 is worded without a build tool: the EAS commands stay in the spell", () => {
        const mr15 = gates().slice(gates().indexOf("### MR-15:"), gates().indexOf("### MR-16:"));
        expectProseToContain(mr15, "native compatibility version");
        expect(mr15).not.toMatch(/`eas /);
    });

    it("MR-16 pins the Xcode of any build machine that can change it, fails the build on a mismatch, and reads the binary before the code", () => {
        const rule = blockContaining(standards, "**Rule (MR-16):");
        expectProseToContain(rule, "On any build machine whose Xcode can change between builds");
        expectProseToContain(rule, "selected with `DEVELOPER_DIR`");
        expectProseToContain(rule, "fail the build when the pinned toolchain is missing or another version is active");
        expectProseToContain(rule, "compare `DTXcode` and `DTSDKName` of the working and the crashing binary before reading any code");
        expectProseToContain(rule, "Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's toolchain step");
        expectProseToContain(rule, "reads that guard's result in the build's own run before a store build continues");
        expectNotNegated(rule);
        // A hosted runner whose default Xcode moves with its image drifts too (review R5).
        const mr16 = gates().slice(gates().indexOf("### MR-16:"));
        expectProseToContain(mr16, "a hosted CI runner whose default Xcode moves with its image");
    });

    it("names the source of the two new rules beside the two dogfooding runs", () => {
        expectProseToContain(standards, "for the two release gates (MR-15, MR-16), a consumer's later store release reported on 2026-10-18");
    });
});

describe("#376 spell-eas-store-deploy: the EAS Update lifecycle", () => {
    const HEADING = "## EAS Update lifecycle (both stores)";
    const PARTS = [
        "### 1. OTA lifecycle and stranded runtimes",
        "### 2. A store update prompt",
        "### 3. Toolchain pinning for self-hosted build agents",
        '### 4. When to set "latest"',
    ];
    const lifecycle = () => {
        const start = eas.indexOf(HEADING);
        return eas.slice(start, eas.indexOf("## Apple App Store", start));
    };
    const part = (n: number) => {
        const section = lifecycle();
        const start = section.indexOf(PARTS[n - 1]);
        return n < PARTS.length ? section.slice(start, section.indexOf(PARTS[n])) : section.slice(start);
    };
    const storeSection = (heading: string) => {
        const start = eas.indexOf(heading);
        return eas.slice(start, eas.indexOf("\n## ", start + 1));
    };

    it("sits after the shared preamble and before the store sections, its four parts in the issue's order", () => {
        const at = eas.indexOf(HEADING);
        expect(at).toBeGreaterThan(eas.indexOf("### Console automation (both stores)"));
        expect(at).toBeLessThan(eas.indexOf("## Apple App Store"));
        expectInOrder(lifecycle(), PARTS);
        expect(lifecycle()).not.toMatch(ISSUE_NUMBER);
    });

    it("part 1 makes the runtime audit a release step citing MR-15, inventoried from the store releases", () => {
        const audit = blockContaining(eas, "**Audit the live runtimes before every store build (`MR-15`).**");
        expectProseToContain(audit, "every store version is its own runtime");
        expectProseToContain(audit, "receives nothing new, forever, with no error anywhere");
        expect(part(1)).toContain("eas build:list --platform <ios|android> --app-version <version> --distribution store --status finished --json");
        expect(part(1)).toContain("eas channel:insights --channel <channel> --runtime-version <runtime> --days 30");
        expect(part(1)).toContain("eas update:list --branch <eas-branch> --runtime-version <runtime> --limit 1 --json");
        // The inventory is the store's own release list: an update listing misses runtimes that never got
        // one, and a page of the newest builds misses old versions (review R1, second pass N1).
        expectProseToContain(part(1), "List the store versions from each store console's release history");
        expectProseToContain(part(1), "A runtime that never received an update has no update group");
        expectProseToContain(part(1), "neither the update list nor a page of the newest builds can be the inventory");
        expectProseToContain(part(1), "A binary built with `eas build --local` has no EAS build record");
        expectProseToContain(part(1), "Judge each runtime as it will stand once this release ships");
        expectProseToContain(part(1), "stops receiving updates the moment the release is out");
        expectProseToContain(part(1), "choose its route before the release ships");
    });

    it("the store sections start every repeat deployment with the audit, and the release report carries its result", () => {
        for (const heading of ["## Apple App Store", "## Google Play"]) {
            const repeat = storeSection(heading);
            const step = repeat.slice(repeat.indexOf("### Repeat deployments"));
            expectProseToContain(step, "Start with the runtime audit (EAS Update lifecycle, part 1; `MR-15`)");
            expect(step.indexOf("Start with the runtime audit")).toBeLessThan(step.indexOf("eas build --platform"));
        }
        const report = eas.slice(eas.indexOf("### Reporting the release"));
        expectProseToContain(report, "the runtime audit's result (each runtime still on phones and the route chosen for it)");
    });

    it("part 1 says what a misaligned publish to an old runtime does, and how to stop a crash loop first", () => {
        const bullet = blockContaining(eas, "**Never publish to an old runtime from a checkout whose native dependencies differ from that binary.**");
        expectProseToContain(bullet, "the OTA/native alignment rule above (Cross-platform lessons)");
        expectProseToContain(bullet, "only when it crashes before its content first appears");
        expectProseToContain(bullet, "until a corrected update is published to that runtime");
        expectNotNegated(bullet);
        const firstAid = blockContaining(eas, "**When a runtime is already crashing on a bad update, stop the damage first**");
        expectProseToContain(firstAid, "`eas update:republish --group <last-good-group-id>`");
        expectProseToContain(firstAid, "`eas update:roll-back-to-embedded --channel <channel> --runtime-version <runtime>`");
        expectProseToContain(firstAid, "with the operator's go-ahead");
        // #298's rule keeps its one bold lead, which test/iw-2026-10.test.ts anchors on.
        expect(eas.split("**🔴 An OTA update must match the installed binary's native dependencies.**")).toHaveLength(2);
    });

    it("part 1 gives the backport recipe in order, published to the store channel and proved by reading the update back", () => {
        const recipe = part(1).slice(part(1).indexOf("**The backport recipe for a stranded runtime:**"));
        expectInOrder(recipe, [
            "`eas update:view <group-id> --json`",
            "`gitCommitHash`",
            "Create a git branch from that commit",
            "only primitives that binary has",
            "Build the workspace libraries first",
            "then typecheck against that tree",
            "With the operator's go-ahead",
            "`eas update --channel <channel> --environment <environment>",
            "loads that environment's server-side variables",
            "Never use `--auto`, which names the EAS branch after the git branch",
            "must not end in `*`",
            "the stranded runtime's `runtimeVersion`, the git branch's `gitCommitHash`",
            "the `branch` that `eas channel:view <channel>` names",
            "Mark the git branch publish-only",
            "never merge it",
        ]);
        expect(recipe).toContain("(`EV-02`)");
    });

    it("part 2 carries the store update prompt pattern", () => {
        expectInOrder(part(2), [
            "a \"latest version\" and a \"minimum version\" per platform",
            "empty by default",
            "`ok`, `update`",
            "`required`",
            "cannot be closed",
            "as request headers",
            "`426 Upgrade Required`",
            "except the version-check endpoint itself",
            "Older clients that send no headers pass",
            "Mount the prompt outside the app's error boundary",
            "something new, not something broken",
            "Backport the prompt to every stranded runtime",
        ]);
    });

    it("part 3 pins Xcode on any machine whose Xcode can change, behind a guard read before every store build", () => {
        expectProseToContain(part(3), "Applies when `eas build --local` runs on a machine whose Xcode can change between builds");
        const pin = blockContaining(eas, "**Pin the Xcode per build (`MR-16`).**");
        expectProseToContain(pin, "`/Applications/Xcode-{XCODE_VERSION}.app`");
        expectProseToContain(pin, "on a hosted runner, point `DEVELOPER_DIR` at that version among the image's preinstalled Xcodes");
        expectProseToContain(pin, "`DEVELOPER_DIR`");
        expectProseToContain(pin, "fails the run when the path is missing or `xcodebuild -version` reports another version");
        const guard = part(3).slice(part(3).indexOf("```bash"), part(3).indexOf("```", part(3).indexOf("```bash") + 3));
        expect(guard).toContain("xcodebuild -version");
        expect(guard).toContain("exit 1");
        expect(guard).not.toMatch(/\|\s*head/);
        expectProseToContain(part(3), "Avoid `xcodebuild -version | head -1` under `pipefail`");
        expectProseToContain(part(3), "(exit 141)");
        const read = blockContaining(eas, "**Before a store build on such a machine, read the guard's result in that build's own run.**");
        expectProseToContain(read, "stop the release if the step is missing or failed");
        const move = blockContaining(eas, "**Move the pin only with the EAS build image the build profile selects**");
        expectProseToContain(move, "`build.<profile>.ios.image`");
        expectProseToContain(move, "records the Xcode it used as `DTXcode`");
        expectProseToContain(move, "never one older than App Store Connect accepts for uploads");
        const forensics = blockContaining(eas, "**When a store build crashes at launch but the same JavaScript runs fine via OTA**");
        expectProseToContain(forensics, "compare `DTXcode` and `DTSDKName`");
        expectProseToContain(forensics, "before reading any code");
        expectProseToContain(forensics, "build the same commit in the EAS cloud");
        expect(forensics).toContain("(`MR-16`)");
    });

    it("part 4 sets latest only once the listing offers the version, and raises the minimum only to what every user can install", () => {
        expectInOrder(part(4), [
            "only when that store's listing actually offers the version",
            "Raise the \"minimum version\" only to a version every user can install now",
            "once the production rollout reaches 100%",
            "raises the iOS deployment target or Android's `minSdkVersion`",
            "`https://itunes.apple.com/lookup?bundleId={IOS_BUNDLE_ID}`",
            "`results[0].version`",
            "a warning when the typed version is newer",
            "treat the warning as a reason to check the listing by hand",
            "Google Play publishes no equivalent lookup",
            "manual check",
        ]);
    });

    it("records the consumer session's specifics as one dated block to re-check", () => {
        const observed = blockContaining(eas, "**Observed in one consumer session (reported 2026-10-18), not re-verified since**");
        expectProseToContain(observed, "re-check before relying on any of them");
        expectProseToContain(observed, "five earlier store versions");
        expectProseToContain(observed, "the build Mac's Xcode updated itself");
        expectProseToContain(observed, "error boundary");
        expect(lifecycle()).toContain(observed.slice(0, 40));
    });

    it("declares each part's enforcement mode (ARC-023)", () => {
        const enforcement = blockContaining(lifecycle(), "Enforcement: parts 1 and 3 are structured spell gates");
        expectProseToContain(enforcement, "through `MR-15` and `MR-16`");
        expectProseToContain(enforcement, "parts 2 and 4 are explicitly advisory prose (ARC-023)");
    });

    it("adds the {XCODE_VERSION} placeholder with its resolution rule, and scopes the spell to EAS Build, Submit and Update", () => {
        const row = blockContaining(eas, "| `{XCODE_VERSION}` |");
        expectProseToContain(row, "`DTXcode`");
        expectProseToContain(row, "`build.<profile>.ios.image`");
        expectProseToContain(row, "ask");
        expectProseToContain(eas, "Deliberately scoped to EAS Build, EAS Submit and EAS Update");
        expect(eas).toContain("no local Xcode, Xcode Cloud, or Fastlane coverage");
        expectProseToContain(eas, "The only local toolchain it touches is a build machine running `eas build --local`");
    });
});

describe("#375 spell-test: visual verification for HTML and UI deliverables", () => {
    const LEAD = "4a. **Visual verification (HTML and UI deliverables)**";
    const step = () => testSpell.slice(testSpell.indexOf(LEAD), testSpell.indexOf("5. **Generate test evidence**"));

    it("runs as step 4a, after the acceptance-criteria step and before the evidence step, for anything a browser renders", () => {
        const at = testSpell.indexOf(LEAD);
        expect(at).toBeGreaterThan(testSpell.indexOf("4. **Check acceptance criteria**"));
        expect(at).toBeLessThan(testSpell.indexOf("5. **Generate test evidence**"));
        const lead = blockContaining(testSpell, LEAD);
        expectProseToContain(lead, "run this step when the scope changes anything a browser renders");
        expectProseToContain(lead, "A passing suite is not evidence that a page renders");
        expectNotNegated(lead);
        expect(step()).not.toMatch(ISSUE_NUMBER);
    });

    it("serves the page over local HTTP with production's headers, never file://, and checks the declared charset", () => {
        const serve = blockContaining(step(), "**Serve it over local HTTP, never `file://`,** with the headers production sends");
        expectProseToContain(serve, "the same `Content-Type` (adding no charset production does not send)");
        expectProseToContain(serve, "`<meta charset=\"utf-8\">` within its first 1024 bytes");
        expectProseToContain(serve, "can read correctly from disk and still garble when served without a charset");
        expectProseToContain(serve, "a content security policy sent as a response header never applies to a `file://` load");
        // Prescribing a charset production does not send would hide the defect the step looks for (review R6).
        expect(normalizeProse(serve)).not.toContain("at least `Content-Type: text/html; charset=utf-8`");
    });

    it("captures headless at 1440, 390 and 320 px, in dark and light, with and without reduced motion, after animations settle", () => {
        const capture = blockContaining(step(), "**Capture it headless at 1440, 390 and 320 px wide");
        expectProseToContain(capture, "in dark and in light, each with motion allowed and with reduced motion");
        expectProseToContain(capture, "twelve full-page captures per page");
        expectProseToContain(capture, "`page.emulateMedia({ colorScheme, reducedMotion })`");
        expectProseToContain(capture, "wait until `document.getAnimations()` reports none whose `playState` is `\"running\"`");
        expectProseToContain(capture, "`page.screenshot({ animations: \"disabled\" })`");
        expectProseToContain(capture, "the evidence says which method was used");
    });

    it("reads the console for script errors and content-security-policy violations, with a bar of zero", () => {
        const consoleRead = blockContaining(step(), "**Read the console for every capture.**");
        expectProseToContain(consoleRead, "Script errors, uncaught exceptions and content-security-policy violations");
        expectProseToContain(consoleRead, "the bar is zero");
        expectProseToContain(consoleRead, "before the page loads");
    });

    it("compares before and after like with like, and says what to do for a new page", () => {
        const compare = blockContaining(step(), "**Compare before and after.**");
        expectProseToContain(compare, "in the same session, on the same machine and browser");
        expectProseToContain(compare, "`page.clock`");
        expectProseToContain(compare, "a difference the change did not intend is a finding");
        expectProseToContain(compare, "A page new in this change has no before set");
    });

    it("keeps the differing captures in the design record, never one with a secret, and none in a sensitive repository", () => {
        const keep = blockContaining(step(), "**Keep the captures in the design record:**");
        expectProseToContain(keep, "`features/<feature>/visual/YYYY-MM-DD/`");
        expectProseToContain(keep, "linked from the story's `testEvidence`");
        expectProseToContain(keep, "one reference capture per page; record the rest by hash");
        expectProseToContain(keep, "Never keep a capture that shows a secret, a token or personal data");
        expectProseToContain(keep, "`page.screenshot({ mask: [locator] })`");
        expectProseToContain(keep, "`content_sensitivity: \"sensitive\"`");
        expectProseToContain(keep, "keep no captures");
        expectProseToContain(keep, "a sanitized summary with no recoverable detail");
    });

    it("records NOT RUN, never PASS, without a headless browser, and declares its enforcement mode", () => {
        const none = blockContaining(step(), "**No headless browser available:**");
        expectProseToContain(none, "record the visual check as `NOT RUN`, never `PASS`");
        expectProseToContain(step(), "Enforcement: structured spell gate (ARC-023)");
    });

    it("adds a Visual Verification block to the evidence template and keeps a UI story open without it", () => {
        const evidence = testSpell.slice(testSpell.indexOf("5. **Generate test evidence**"), testSpell.indexOf("6. **Update stories.json**"));
        expectInOrder(evidence, ["### Acceptance Criteria Coverage", "### Visual Verification", "### Uncovered Areas"]);
        expectProseToContain(evidence, "Status: PASS / FAIL / NOT RUN");
        const rule = blockContaining(testSpell, "- Never mark a story whose scope a browser renders as passing");
        expectProseToContain(rule, "until step 4a's result is recorded (its captures, or in a sensitive repository their sanitized summary)");
    });
});
