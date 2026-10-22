import assert from "node:assert/strict";
import test from "node:test";
import { compactCount, pulseCells, pulseStaysInsideObservation } from "./pulse.ts";

test("a large journal count stays short", () => {
  assert.equal(compactCount(18_400), "18K");
  assert.equal(compactCount(1_284), "1.3K");
  assert.equal(compactCount(42), "42");
  assert.equal(pulseCells(1284, 37, "0.42")[2]?.value, "0.42");
});

test("the sidebar pulse does not claim cpu, incidents, or a response time", () => {
  assert.equal(pulseStaysInsideObservation(), true);
});
