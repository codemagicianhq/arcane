import type { IncidentRecord } from "../config/incidents.js";

const DEFERRAL_PATTERN = /^Deferred \d{4}-\d{2}-\d{2} — known open, accepting the risk\.$/;
const BLOCKING_SEVERITIES = new Set(["critical", "high"]);
const PROTECTED_IMPACTS = new Set(["data-integrity", "security"]);

export interface IncidentGateResult {
  blocked: boolean;
  blockers: string[];
  acceptedRisks: string[];
  checked: number;
}

export function evaluateIncidentGate(records: IncidentRecord[]): IncidentGateResult {
  const blockers: string[] = [];
  const acceptedRisks: string[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    if (seen.has(record.id)) {
      blockers.push(`${record.id}: duplicate incident record`);
      continue;
    }
    seen.add(record.id);

    if (record.confidence === "research") continue;
    if (!PROTECTED_IMPACTS.has(record.impact)) continue;

    if (!record.severity) {
      blockers.push(`${record.id}: confirmed ${record.impact} incident is missing severity`);
      continue;
    }
    if (!BLOCKING_SEVERITIES.has(record.severity)) continue;

    if (record.state === "resolved") {
      if (!record.resolution?.trim()) {
        blockers.push(`${record.id}: resolved incident is missing resolution evidence`);
      }
      continue;
    }

    if (record.state === "deferred") {
      if (!record.deferral || !DEFERRAL_PATTERN.test(record.deferral)) {
        blockers.push(
          `${record.id}: deferral must be exactly "Deferred <date> — known open, accepting the risk."`,
        );
      } else {
        acceptedRisks.push(`${record.id}: ${record.deferral}`);
      }
      continue;
    }

    blockers.push(
      `${record.id}: unresolved ${record.severity} ${record.impact} incident blocks release`,
    );
  }

  return {
    blocked: blockers.length > 0,
    blockers,
    acceptedRisks,
    checked: records.length,
  };
}