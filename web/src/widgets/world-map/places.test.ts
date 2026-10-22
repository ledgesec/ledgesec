import assert from "node:assert/strict";
import test from "node:test";
import { formatRps, project } from "./places.ts";

test("a country is projected onto the world map", () => {
  const unitedStates = project(39.8, -98.6, 1000, 500);
  assert.ok(unitedStates.x > 180 && unitedStates.x < 280);
  assert.ok(unitedStates.y > 120 && unitedStates.y < 180);
  const australia = project(-25.3, 133.8, 1000, 500);
  assert.ok(australia.x > unitedStates.x);
  assert.ok(australia.y > unitedStates.y);
});

test("rps stays two decimals until it is large", () => {
  assert.equal(formatRps(0), "0.00");
  assert.equal(formatRps(0.5), "0.50");
  assert.equal(formatRps(12.34), "12.3");
});
