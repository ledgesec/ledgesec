import assert from "node:assert/strict";
import test from "node:test";
import { MASK, covered, hideColumn, showColumn } from "./mask.ts";

test("a hidden column is stars and an empty value stays empty", () => {
  assert.equal(covered("shop.example", true), MASK);
  assert.equal(covered("/.env", true), MASK);
  assert.equal(covered("", true), "");
  assert.equal(covered("shop.example", false), "shop.example");
  assert.equal(hideColumn("Site"), "Hide Site");
  assert.equal(showColumn("Site"), "Show Site");
});
