import assert from "node:assert/strict";
import test from "node:test";
import { staysInsideObservation } from "../home/overview.ts";
import { PREMIUM_PRICE, PRICING_INTEREST, SELF_NAME, SELF_PRICE, pricingText } from "./copy.ts";

test("pricing keeps self-hosted as the current journal and premium as custom work", () => {
  const text = pricingText();
  assert.equal(staysInsideObservation(text), true);
  assert.equal(/\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(text), false);
  assert.match(text, new RegExp(SELF_NAME, "i"));
  assert.equal(SELF_PRICE, "MIT");
  assert.equal(PREMIUM_PRICE, "On request");
  assert.equal(PRICING_INTEREST, "premium");
  assert.match(text, /does not change the request/);
  assert.match(text, /on request/i);
  assert.match(text, /until that work is done/);
});
