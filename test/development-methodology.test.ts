import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";

it("keeps each Phase Overview row aligned with its five-column header", async () => {
  const file = join("src", "assets", ".arcane", "governance", "development-methodology.md");
  const markdown = await readFile(file, "utf8");
  const section = markdown.split(/^### Phase Overview\s*$/m)[1]?.split(/^#{1,6} /m)[0] ?? "";
  const rows = section.split(/\r?\n/).filter((line) => line.startsWith("|"));
  const cells = (row: string) => row.trim().slice(1, -1).split(/(?<!\\)\|/).map((cell) => cell.trim());

  expect(cells(rows[0] ?? "")).toEqual(["Phase", "Spell", "Agent Owner", "Input", "Output"]);
  expect(rows.some((row) => cells(row)[1] === "`spell-unattended-run`")).toBe(true);
  expect(rows.some((row) => cells(row)[1] === "`spell-implement`")).toBe(true);
  for (const row of rows) expect(cells(row), row).toHaveLength(5);
});
