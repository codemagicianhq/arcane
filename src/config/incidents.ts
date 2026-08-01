export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentImpact = "data-integrity" | "security" | "other";
export type IncidentConfidence = "confirmed" | "research";
export type IncidentState = "open" | "resolved" | "deferred";

export interface IncidentRecord {
  id: string;
  severity?: IncidentSeverity;
  impact: IncidentImpact;
  confidence: IncidentConfidence;
  state: IncidentState;
  detectedOn: string;
  resolution?: string;
  deferral?: string;
}

export const INCIDENT_QUEUE: IncidentRecord[] = [
  { id: "EF-05", severity: "medium", impact: "other", confidence: "confirmed", state: "open", detectedOn: "2026-07-31" },
  { id: "EF-08", severity: "medium", impact: "other", confidence: "confirmed", state: "open", detectedOn: "2026-07-31" },
  { id: "EF-16", severity: "high", impact: "other", confidence: "confirmed", state: "open", detectedOn: "2026-07-31" },
  { id: "EF-17", severity: "high", impact: "other", confidence: "confirmed", state: "open", detectedOn: "2026-07-31" },
  { id: "EF-20", severity: "high", impact: "other", confidence: "research", state: "open", detectedOn: "2026-07-31" },
  { id: "EF-21", severity: "high", impact: "other", confidence: "confirmed", state: "open", detectedOn: "2026-07-31" },
  { id: "EF-23", severity: "medium", impact: "other", confidence: "confirmed", state: "open", detectedOn: "2026-07-31" },
  { id: "EF-25", severity: "high", impact: "data-integrity", confidence: "confirmed", state: "resolved", detectedOn: "2026-07-14", resolution: "PRs 13 and 14" },
  { id: "EF-26", severity: "high", impact: "security", confidence: "confirmed", state: "resolved", detectedOn: "2026-07-31", resolution: "PR 15" },
  { id: "EF-27", severity: "high", impact: "security", confidence: "confirmed", state: "resolved", detectedOn: "2026-07-31", resolution: "PR 16" },
  { id: "EF-28", severity: "high", impact: "security", confidence: "confirmed", state: "resolved", detectedOn: "2026-07-31", resolution: "PR 17" },
  { id: "EF-29", severity: "medium", impact: "other", confidence: "confirmed", state: "resolved", detectedOn: "2026-07-31", resolution: "PR 18" },
];