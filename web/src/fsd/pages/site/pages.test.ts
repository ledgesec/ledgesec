import assert from "node:assert/strict";
import test from "node:test";
import { aboutText } from "../about/copy.ts";
import { demoText } from "../demo/copy.ts";
import { staysInsideObservation } from "../home/overview.ts";
import { productText } from "../product/copy.ts";

function omitsAddresses(text: string) {
  return !/\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(text);
}

test("the public pages describe the journal and omit visitor addresses", () => {
  const text = [aboutText(), productText(), demoText()].join(" ");
  assert.equal(staysInsideObservation(text), true);
  assert.equal(omitsAddresses(text), true);
  assert.match(text, /does not change the request/);
  assert.match(text, /without addresses/);
  assert.match(text, /OpenResty/);
  assert.match(text, /Coolify/);
  assert.match(text, /three years/);
  assert.match(text, /User-Agent/);
});
