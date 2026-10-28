import assert from "node:assert/strict";
import test from "node:test";
import { MEASUREMENT_ID, measurementSnippet, measurementSrc, measuresSite } from "./measure.ts";

test("the public site is measured and the cabinets are not", () => {
  assert.equal(measuresSite("ledgesec.com"), true);
  assert.equal(measuresSite("www.ledgesec.com"), true);
  assert.equal(measuresSite("WWW.LedgeSec.com:443"), true);
  assert.equal(measuresSite("dash.ledgesec.com"), false);
  assert.equal(measuresSite("admin.ledgesec.com"), false);
  assert.equal(measuresSite("localhost:44733"), false);
  assert.equal(measurementSrc(), `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`);
  assert.match(measurementSnippet(), new RegExp(`gtag\\('config', '${MEASUREMENT_ID}'\\)`));
});
