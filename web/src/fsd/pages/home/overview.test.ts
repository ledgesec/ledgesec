import assert from "node:assert/strict";
import test from "node:test";
import { boardStaysInsideObservation } from "./overview.ts";

test("the homepage sample does not claim a block, an incident, or a response time", () => {
  assert.equal(boardStaysInsideObservation(), true);
});
