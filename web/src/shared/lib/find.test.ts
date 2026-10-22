import assert from "node:assert/strict";
import test from "node:test";
import { findSpans } from "./find.ts";

test("an empty search leaves the cell unmarked", () => {
  assert.deepEqual(findSpans("203.0.113.10", "  "), [{ text: "203.0.113.10", hit: false }]);
  assert.deepEqual(findSpans("", "shop"), [{ text: "", hit: false }]);
});

test("the search is marked inside the cell and ignores case", () => {
  assert.deepEqual(findSpans("203.0.113.10", "113.10"), [
    { text: "203.0.", hit: false },
    { text: "113.10", hit: true },
  ]);
  assert.deepEqual(findSpans("Shop.Example", "shop"), [
    { text: "Shop", hit: true },
    { text: ".Example", hit: false },
  ]);
});

test("a miss stays unmarked", () => {
  assert.deepEqual(findSpans("/pricing", "203.0.113.10"), [{ text: "/pricing", hit: false }]);
});
