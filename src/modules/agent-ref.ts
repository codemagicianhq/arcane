/**
 * Opaque, typed references: `arcane:<type>:<uuid>` (ARC-059 decision 1,
 * features/agent-identity/PRD.md AI-01).
 *
 * Built by the presence channel (features/presence-channel/architecture.md
 * D2) because the agent-identity feature had not started when the channel
 * needed `arcane:session:`; the agent-identity feature adopts this module.
 *
 * - `<type>` is a registered lowercase word. Registered: `agent` and
 *   `template` (ARC-059), `session` (ARC-060, minted by the presence service
 *   and nowhere else). A new type is registered by a decision record.
 * - `<uuid>` is a UUIDv7 (RFC 9562) in canonical lowercase hex.
 * - A reference is opaque: consumers compare it and never read it. The time
 *   prefix is a sorting convenience, not a field.
 *
 * No runtime dependency (ARC-037 decision 8): node:crypto only.
 */

import { randomBytes } from "node:crypto";

export const REF_TYPES = ["agent", "template", "session"] as const;
export type RefType = (typeof REF_TYPES)[number];

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ANY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface UuidV7Options {
  /** Milliseconds since the epoch. Defaults to `Date.now`. */
  now?: () => number;
  /** `n` random bytes. Defaults to `crypto.randomBytes`. */
  random?: (n: number) => Uint8Array;
}

/**
 * A UUIDv7 generator. Within one millisecond the 12-bit `rand_a` field is a
 * counter seeded at random (RFC 9562 section 6.2, method 1), so values minted
 * by one generator are strictly increasing; when the counter overflows, or
 * the clock steps backwards, the timestamp is carried forward instead, so the
 * time prefix never decreases.
 */
export function createUuidV7Generator(options: UuidV7Options = {}): () => string {
  const now = options.now ?? Date.now;
  const random = options.random ?? ((n: number) => randomBytes(n));
  let lastMs = -1;
  let counter = 0;

  return () => {
    let ms = Math.floor(now());
    const bytes = random(10);
    if (ms > lastMs) {
      // A fresh millisecond: seed the counter in its lower half so it has room to count.
      counter = ((bytes[0] << 8) | bytes[1]) & 0x7ff;
    } else {
      ms = lastMs;
      counter += 1;
      if (counter > 0xfff) {
        ms += 1;
        counter = ((bytes[0] << 8) | bytes[1]) & 0x7ff;
      }
    }
    lastMs = ms;

    const out = new Uint8Array(16);
    // 48-bit big-endian millisecond timestamp. Math, not bit shifts: JS shifts are 32-bit.
    let t = ms;
    for (let i = 5; i >= 0; i -= 1) {
      out[i] = t % 256;
      t = Math.floor(t / 256);
    }
    out[6] = 0x70 | ((counter >> 8) & 0x0f); // version 7 + rand_a high nibble
    out[7] = counter & 0xff;
    out[8] = 0x80 | (bytes[2] & 0x3f); // variant 10 + rand_b
    for (let i = 9; i < 16; i += 1) out[i] = bytes[i - 6]!;

    const hex = Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}

const defaultUuidV7 = createUuidV7Generator();

/** A UUIDv7 in canonical lowercase form. */
export function uuidv7(): string {
  return defaultUuidV7();
}

/** Mints a reference of a registered type. */
export function mintRef(type: RefType, generate: () => string = uuidv7): string {
  if (!(REF_TYPES as readonly string[]).includes(type)) {
    throw new Error(`"${String(type)}" is not a registered reference type`);
  }
  return `arcane:${type}:${generate()}`;
}

export function mintAgentRef(): string {
  return mintRef("agent");
}

export function mintTemplateRef(): string {
  return mintRef("template");
}

/** Only the presence service mints sessions (ARC-060 decision 4). */
export function mintSessionRef(): string {
  return mintRef("session");
}

export type ParsedRef = { ok: true; type: RefType; uuid: string } | { ok: false; reason: string };

/**
 * Parses a reference. With `expected`, a well-formed reference of another
 * type is refused too. Every refusal carries a one-line reason.
 */
export function parseRef(text: unknown, expected?: RefType): ParsedRef {
  if (typeof text !== "string") return { ok: false, reason: "a reference must be a string" };
  if (text.length === 0) return { ok: false, reason: "a reference must not be empty" };
  if (text !== text.trim()) return { ok: false, reason: "a reference must not carry surrounding whitespace" };
  if (text !== text.toLowerCase()) return { ok: false, reason: "a reference must be lowercase" };
  const parts = text.split(":");
  if (parts.length !== 3 || parts[0] !== "arcane") {
    return { ok: false, reason: 'a reference must have the form "arcane:<type>:<uuid>"' };
  }
  const type = parts[1];
  const uuid = parts[2];
  if (!(REF_TYPES as readonly string[]).includes(type)) {
    return { ok: false, reason: `"${type}" is not a registered reference type` };
  }
  if (uuid.startsWith("{") || uuid.endsWith("}")) {
    return { ok: false, reason: "a reference's uuid must not be braced" };
  }
  if (!ANY_UUID.test(uuid)) return { ok: false, reason: "a reference's uuid must be in canonical hex form" };
  if (!UUID_V7.test(uuid)) return { ok: false, reason: "a reference's uuid must be a version 7 UUID" };
  if (expected !== undefined && type !== expected) {
    return { ok: false, reason: `expected a ${expected} reference, got one of type ${type}` };
  }
  return { ok: true, type: type as RefType, uuid };
}

/** The 48-bit millisecond prefix, for sorting and tests only; consumers never read it. */
export function uuidV7Millis(uuid: string): number {
  return parseInt(uuid.replace(/-/g, "").slice(0, 12), 16);
}
