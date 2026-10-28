import assert from "node:assert/strict";
import test from "node:test";
import { staysInsideObservation } from "../home/overview.ts";
import { FUTURE_STATUS, PAINS, findPain, futureText } from "./pains.ts";

test("each future pain has ten ideas and is not a live claim", () => {
  assert.equal(PAINS.length, 10);
  for (const pain of PAINS) {
    assert.equal(pain.ideas.length, 10);
    assert.equal(findPain(pain.slug)?.title, pain.title);
  }
  const text = futureText();
  assert.equal(staysInsideObservation(text), true);
  assert.equal(/\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(text), false);
  assert.match(text, new RegExp(FUTURE_STATUS, "i"));
  assert.match(text, /refuses a request/i);
  assert.match(text, /apache/i);
  assert.match(text, /query/);
});
