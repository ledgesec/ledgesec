import assert from "node:assert/strict";
import test from "node:test";
import { siteLines } from "./site-lines.ts";

test("a site keeps the day count and the last-minute rate", () => {
  const lines = siteLines(
    [
      { name: "web7.pro", requests: 40, probes: 3 },
      { name: "plantagoweb.ru", requests: 10, probes: 0 },
    ],
    [
      { name: "web7.pro", requests: 30, rps: 0.5 },
      { name: "fresh.example", requests: 6, rps: 0.1 },
    ],
  );
  assert.deepEqual(lines, [
    { name: "web7.pro", requests: 40, probes: 3, rps: 0.5 },
    { name: "plantagoweb.ru", requests: 10, probes: 0, rps: 0 },
    { name: "fresh.example", requests: 6, probes: 0, rps: 0.1 },
  ]);
});

test("an empty site name is left out", () => {
  assert.deepEqual(siteLines([{ name: "", requests: 4, probes: 1 }], []), []);
});
