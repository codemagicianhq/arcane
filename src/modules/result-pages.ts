/**
 * The pages the browser shows when a `spell login` browser sign-in ends
 * (features/spell-login/PRD.md, R8 and R8a): one fixed document per result,
 * chosen by the result's kind and never filled in from the request.
 *
 * The Gate pages are arcane-ui's compiled output, vendored under
 * `assets/sign-in/` (ARC-042's model; ARC-055 for these pages). Each is one
 * static document whose only style is one inline `<style>`, with the art and
 * fonts inlined as `data:` URLs. A page's content security policy allows
 * exactly its own stylesheet by hash, computed from the page it is sent
 * with, so the policy needs no `'unsafe-inline'` and cannot drift from the
 * bytes served.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const RESULT_KINDS = ["success", "denied", "failure"] as const;
export type ResultKind = (typeof RESULT_KINDS)[number];

export interface ResultPage {
  html: string;
  headers: Readonly<Record<string, string>>;
}

export type ResultPages = Readonly<Record<ResultKind, ResultPage>>;

/** The vendored page for a result, relative to the package's assets directory. */
export function resultPagePath(kind: ResultKind): string {
  return join("sign-in", `sign-in-callback-${kind}.html`);
}

/**
 * The CSP source expression for each inline `<style>` element, computed as a
 * browser computes it: SHA-256 over the element's text as UTF-8, after the
 * HTML parser's newline normalization (CRLF and a lone CR become LF).
 */
export function styleHashes(html: string): string[] {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((match) => {
    const text = match[1]!.replace(/\r\n?/g, "\n");
    return `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;
  });
}

/**
 * The response headers for a result page: never cached, no referrer, no
 * sniffing, and a policy under which the page can load nothing but its own
 * stylesheet and the `data:` images and fonts that stylesheet inlines.
 */
export function resultPageHeaders(html: string): Record<string, string> {
  const hashes = [...new Set(styleHashes(html))];
  return {
    "cache-control": "no-store",
    "content-security-policy": [
      "default-src 'none'",
      `style-src ${hashes.length > 0 ? hashes.join(" ") : "'none'"}`,
      "img-src data:",
      "font-src data:",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
    "content-type": "text/html; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };
}

export function resultPage(html: string): ResultPage {
  return { html, headers: resultPageHeaders(html) };
}

function plainPage(heading: string, next: string): ResultPage {
  return resultPage(
    [
      "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\">",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
      `<title>${heading} — Arcane</title>`,
      "<style>:root{color-scheme:light dark}body{font-family:system-ui,sans-serif;margin:3rem;line-height:1.5}</style>",
      `<body><h1>${heading}</h1><p>${next}</p></body></html>`,
    ].join(""),
  );
}

/** What the browser shows when this install is missing the Gate pages. */
export const PLAIN_RESULT_PAGES: ResultPages = {
  success: plainPage("Signed in to Arcane", "Return to your terminal. Your browser can be closed now."),
  denied: plainPage("Sign-in was not completed", "Return to your terminal to try again. No new session was stored."),
  failure: plainPage("Could not finish sign-in", "Return to your terminal for details. No new session was stored."),
};

/**
 * Reads the three vendored Gate pages. Resolves null when any of them is
 * missing or unreadable, so the caller can say so and use the plain pages
 * as a set rather than mixing the two.
 */
export async function loadResultPages(assetsDir: string): Promise<ResultPages | null> {
  try {
    const [success, denied, failure] = await Promise.all(
      RESULT_KINDS.map(async (kind) => resultPage(await readFile(join(assetsDir, resultPagePath(kind)), "utf8"))),
    );
    return { success: success!, denied: denied!, failure: failure! };
  } catch {
    return null;
  }
}
