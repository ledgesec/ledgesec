import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  columnPrefs,
  resizeColumn,
  resizeColumnLabel,
  tableWidth,
  toggleColumn,
} from "./columns.ts";

const defaults = [
  { id: "site", label: "Site", width: 160 },
  { id: "path", label: "Path", width: 200 },
];

test("a saved width is kept and a new column uses its default", () => {
  const columns = columnPrefs(defaults, [
    { id: "site", width: 40, hidden: false },
    { id: "gone", width: 10, hidden: true },
  ]);
  assert.equal(columns[0]?.width, MIN_COLUMN_WIDTH);
  assert.equal(columns[1]?.width, 200);
  assert.equal(columns.length, 2);
  assert.equal(resizeColumnLabel("Site"), "Resize Site");
});

test("the last visible column stays on", () => {
  const start = columnPrefs(defaults, null);
  const one = toggleColumn(start, "path");
  assert.equal(one.find((column) => column.id === "path")?.hidden, true);
  const stuck = toggleColumn(one, "site");
  assert.equal(stuck.find((column) => column.id === "site")?.hidden, false);
  assert.equal(tableWidth(stuck), 160);
});

test("a width stays inside the limits and the table sums what is shown", () => {
  const start = columnPrefs(defaults, null);
  const wide = resizeColumn(start, "site", 9000);
  assert.equal(wide[0]?.width, MAX_COLUMN_WIDTH);
  const hidden = toggleColumn(wide, "path");
  assert.equal(tableWidth(hidden), MAX_COLUMN_WIDTH);
});
