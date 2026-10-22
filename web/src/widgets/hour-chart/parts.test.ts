import assert from "node:assert/strict";
import test from "node:test";
import { hourParts } from "./parts.ts";

test("a bar keeps the probe share inside the hour", () => {
  assert.deepEqual(hourParts(18, 2), { ordinary: 16, probes: 2 });
  assert.deepEqual(hourParts(4, 4), { ordinary: 0, probes: 4 });
  assert.deepEqual(hourParts(3, 9), { ordinary: 0, probes: 3 });
  assert.deepEqual(hourParts(0, 2), { ordinary: 0, probes: 0 });
});
