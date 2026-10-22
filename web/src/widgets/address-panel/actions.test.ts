import assert from "node:assert/strict";
import test from "node:test";
import { ADDRESS_ACTIONS, requestCount } from "./actions.ts";

test("an address can be inspected and copied, and it cannot be stopped", () => {
  const enabled = ADDRESS_ACTIONS.filter((action) => action.enabled).map((action) => action.id);
  const disabled = ADDRESS_ACTIONS.filter((action) => !action.enabled).map((action) => action.id);
  assert.deepEqual(enabled, ["details", "requests", "copy"]);
  assert.deepEqual(disabled, ["block", "challenge"]);
  assert.equal(requestCount({ eu: 2, web7: 3 }), 5);
});
