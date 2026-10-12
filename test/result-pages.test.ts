import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  PLAIN_RESULT_PAGES,
  RESULT_KINDS,
  loadResultPages,
  resultPageHeaders,
  resultPagePath,
  styleHashes,
  type ResultKind,
} from "../src/modules/result-pages.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

// The source tree's assets have the same layout the published package ships
// under dist/assets/, so this stands in for ASSETS_DIR without a build.
const ASSETS_DIR = join(process.cwd(), "src", "assets");

/** arcane-ui's own budget for these pages; the art, not the markup, is the size. */
const MAX_PAGE_BYTES = 480 * 1024;

const HEADINGS: Record<ResultKind, string> = {
  success: "Signed in to Arcane",
  denied: "Sign-in was not completed",
  failure: "Could not finish sign-in",
};

const policyOf = (html: string) => resultPageHeaders(html)["content-security-policy"]!;
const heading = (html: string) => html.match(/<h1>([^<]*)<\/h1>/)?.[1];

let dir: string;
beforeEach(async () => {
  dir = await createFixtureDir("result-pages-");
});
afterEach(async () => {
  await removeFixtureDir(dir);
});

describe("styleHashes", () => {
  it("hashes each inline stylesheet's text the way a browser does", () => {
    expect(styleHashes("<style>a{}</style>")).toEqual(["'sha256-X1RutGBrXCt9KkSaXMK7tHftWiRscFHOhxsS8tv8hBk='"]);
  });

  it("normalizes CRLF and a lone CR to LF before hashing, as the HTML parser does", () => {
    const lf = styleHashes("<style>a{}\nb{}</style>");
    expect(lf).toEqual(["'sha256-zed0RLOFY+TcmXcTg8xXzuEuz9LcL/bpBT9mk1CINVo='"]);
    expect(styleHashes("<style>a{}\r\nb{}</style>")).toEqual(lf);
    expect(styleHashes("<style>a{}\rb{}</style>")).toEqual(lf);
  });

  it("finds every style element, with or without attributes", () => {
    expect(styleHashes("<STYLE media=\"all\">a{}</STYLE ><p>x</p><style>b{}</style>")).toHaveLength(2);
    expect(styleHashes("<p style=\"color:red\">x</p>")).toEqual([]);
  });
});

describe("resultPageHeaders", () => {
  it("allows only the page's own stylesheets and data: images and fonts", () => {
    const headers = resultPageHeaders("<style>a{}</style><style>a{}</style><style>b{}</style>");
    expect(headers["content-security-policy"]).toBe(
      "default-src 'none'; style-src " +
        `${styleHashes("<style>a{}</style>")[0]} ${styleHashes("<style>b{}</style>")[0]}; ` +
        "img-src data:; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    expect(headers).toMatchObject({
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    });
  });

  it("allows no style at all for a page without a stylesheet", () => {
    expect(policyOf("<h1>x</h1>")).toContain("style-src 'none';");
  });
});

describe("the vendored Gate pages", () => {
  it.each(RESULT_KINDS)("%s: arcane-ui's compiled output, self-contained and within budget", async (kind) => {
    const html = await readFile(join(ASSETS_DIR, resultPagePath(kind)), "utf8");
    expect(html).toMatch(/^<!-- @codemagician\/arcane-ui v\d+\.\d+\.\d+ -- .*Do not edit by hand\. -->\n<!doctype html>/);
    expect(html).toContain(`data-state="${kind}"`);
    expect(heading(html)).toBe(HEADINGS[kind]);
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(MAX_PAGE_BYTES);

    // Nothing the policy would have to allow beyond one stylesheet and data: URLs.
    expect(html.match(/<style\b/gi)).toHaveLength(1);
    expect(html).not.toMatch(/<script\b|<link\b|<iframe\b|<object\b|<embed\b|<form\b|<base\b/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    const withoutData = html.replace(/data:[a-z0-9/+.-]+;base64,[A-Za-z0-9+/=]+/g, "data:");
    for (const link of withoutData.match(/https?:\/\/[^\s"')]+/g) ?? []) {
      expect(link).toBe("http://www.w3.org/2000/svg");
    }
    for (const reference of withoutData.match(/url\(\s*["']?[^"')]*/g) ?? []) {
      expect(reference).toMatch(/^url\(\s*["']?data:$/);
    }
  });

  it.each(RESULT_KINDS)("%s: the policy allows exactly the page's stylesheet, by hash", async (kind) => {
    const html = await readFile(join(ASSETS_DIR, resultPagePath(kind)), "utf8");
    const css = html.slice(html.indexOf("<style>") + "<style>".length, html.indexOf("</style>"));
    const expected = `'sha256-${createHash("sha256").update(css).digest("base64")}'`;
    const policy = policyOf(html);
    expect(policy).toContain(`style-src ${expected};`);
    expect(policy.match(/'sha256-/g)).toHaveLength(1);
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).toContain("img-src data:; font-src data:;");
  });

  it("ships the font licences and a notice beside the pages", async () => {
    const notice = await readFile(join(ASSETS_DIR, "sign-in", "NOTICE.txt"), "utf8");
    expect(notice).toContain("Code Magician LLC");
    expect(notice).toContain("SIL Open Font License 1.1");
    for (const licence of ["OFL-chakra-petch.txt", "OFL-rajdhani.txt"]) {
      expect(notice).toContain(licence);
      const text = await readFile(join(ASSETS_DIR, "sign-in", licence), "utf8");
      expect(text).toMatch(/^Copyright /);
      expect(text).toContain("SIL OPEN FONT LICENSE Version 1.1");
    }
  });
});

describe("the plain result pages", () => {
  it.each(RESULT_KINDS)("%s: says what the Gate page says, under the same hash-only policy", (kind) => {
    const page = PLAIN_RESULT_PAGES[kind];
    expect(heading(page.html)).toBe(HEADINGS[kind]);
    expect(page.html.match(/<style\b/gi)).toHaveLength(1);
    expect(page.html).not.toMatch(/\sstyle\s*=|<script\b/i);
    expect(page.headers).toEqual(resultPageHeaders(page.html));
    expect(page.headers["content-security-policy"]).not.toContain("unsafe-inline");
  });
});

describe("loadResultPages", () => {
  it("reads the three vendored pages with their headers", async () => {
    const pages = await loadResultPages(ASSETS_DIR);
    expect(pages).not.toBeNull();
    for (const kind of RESULT_KINDS) {
      expect(pages![kind].html).toBe(await readFile(join(ASSETS_DIR, resultPagePath(kind)), "utf8"));
      expect(pages![kind].headers).toEqual(resultPageHeaders(pages![kind].html));
    }
  });

  it("returns null when any page is missing, so the set is never mixed", async () => {
    await mkdir(join(dir, "sign-in"));
    for (const kind of ["success", "failure"] as const) {
      await copyFile(join(ASSETS_DIR, resultPagePath(kind)), join(dir, resultPagePath(kind)));
    }
    expect(existsSync(join(dir, resultPagePath("denied")))).toBe(false);
    expect(await loadResultPages(dir)).toBeNull();
  });
});
