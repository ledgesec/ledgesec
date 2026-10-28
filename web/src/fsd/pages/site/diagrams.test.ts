import assert from "node:assert/strict";
import test from "node:test";
import { SITE_DIAGRAMS, diagramAlt } from "./diagrams.ts";

const ADDRESS = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const FORBIDDEN = /incident|mttd|mttr|vulnerabilit|blocked|cve|endpoint/i;

test("each site diagram states one honest claim", () => {
  assert.equal(SITE_DIAGRAMS.length, 7);
  assert.equal(new Set(SITE_DIAGRAMS.map((item) => item.name)).size, 7);
  for (const item of SITE_DIAGRAMS) {
    assert.equal(diagramAlt(item.name), item.alt);
    assert.equal(item.alt.length > 20, true);
    assert.equal(ADDRESS.test(item.alt), false);
    assert.equal(FORBIDDEN.test(item.alt), false);
  }
});
