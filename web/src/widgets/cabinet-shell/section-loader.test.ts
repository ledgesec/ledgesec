import assert from "node:assert/strict";
import test from "node:test";
import { SECTION_LOADER_MS, sectionIsLoading } from "./section-loader.ts";

test("a tab change holds the radar, and a ready journal does not", () => {
  assert.equal(sectionIsLoading(true, true, false, false), true);
  assert.equal(sectionIsLoading(false, false, false, false), true);
  assert.equal(sectionIsLoading(false, true, false, false), false);
  assert.equal(sectionIsLoading(false, false, true, false), false);
  assert.equal(sectionIsLoading(false, false, false, true), false);
  assert.ok(SECTION_LOADER_MS > 0);
});
