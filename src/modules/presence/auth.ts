/**
 * The bearer check (ARC-060 decisions 3 and 6; architecture D12).
 *
 * Only the exact header `Authorization: Bearer <token>` is accepted. Both
 * values are hashed with SHA-256 and the digests compared with
 * `crypto.timingSafeEqual`, so neither the comparison nor a length mismatch
 * reveals anything through timing. A token in a query string or a cookie is
 * never read: this function only ever sees the header.
 */

import { createHash, timingSafeEqual } from "node:crypto";

const BEARER = /^Bearer ([^\s]+)$/;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function checkBearer(header: unknown, token: string): boolean {
  if (typeof header !== "string" || token.length === 0) return false;
  const match = BEARER.exec(header);
  if (match === null) return false;
  return timingSafeEqual(digest(match[1]), digest(token));
}
