import { evaluateRunGrant, readRunGrants, type RunGrantRequest } from "../modules/run-grants.js";

/** Read-only record check. Consent and platform authorization remain spell gates. */
export async function checkRunGrant(targetDir: string, request: RunGrantRequest) {
  try {
    return evaluateRunGrant(await readRunGrants(targetDir), request);
  } catch {
    return { matches: false, reason: "grant file unreadable or invalid" };
  }
}

export async function runGrantCheck(options: Omit<RunGrantRequest, "now">): Promise<void> {
  const result = await checkRunGrant(process.cwd(), { ...options, now: new Date() });
  // Do not echo operatorWords or other grant content into logs.
  console.log(JSON.stringify({ matches: result.matches, reason: result.reason }));
  if (!result.matches) process.exitCode = 1;
}
