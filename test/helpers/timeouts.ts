/**
 * Named per-test timeout budgets for tests with real cost that vitest's
 * default 5000ms trips on under full-suite contention. Named, per-test
 * overrides -- never bump vitest's global `testTimeout`, which would mask a
 * genuine hang anywhere else in the suite (rejected on the record, Become
 * Current lesson E28). Three distinct budgets because the underlying cost
 * is genuinely different, not because a bigger number is safer:
 */

/** Real subprocess/filesystem cost (a single fixture git repo, one CLI spawn). */
export const HEAVY_TEST_TIMEOUT = 15_000;

/** A full CLI init/update/uninstall roundtrip doing substantial real file I/O. */
export const VERY_HEAVY_TEST_TIMEOUT = 30_000;

/** A real network round-trip (e.g. `gh` querying GitHub) -- latency, not CPU/disk contention. */
export const NETWORK_TEST_TIMEOUT = 20_000;
