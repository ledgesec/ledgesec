import assert from "node:assert/strict";
import test from "node:test";
import { staysInsideObservation } from "../home/overview.ts";
import { flowText } from "./flow.ts";

test("the request drawing stays a reading of the log", () => {
  const text = flowText();
  assert.equal(staysInsideObservation(text), true);
  assert.match(text, /not changed/);
  assert.match(text, /does not store the journal/i);
  assert.match(text, /does not stand on the request/);
});
