import assert from "node:assert/strict";
import test from "node:test";
import { BLANK_FIELDS, FIND_LIMIT, choiceList, fieldParams, keepRow } from "./query.ts";

test("a row stays when the search and filters are empty", () => {
  assert.equal(keepRow(["shop.example", "/pricing"], "", ["shop.example"], [""]), true);
});

test("search matches any key field and ignores case", () => {
  assert.equal(keepRow(["shop.example", "/.env"], "ENV", ["shop.example"], [""]), true);
  assert.equal(keepRow(["shop.example", "/pricing"], "securitas", ["shop.example"], [""]), false);
});

test("a filter keeps only the chosen field", () => {
  assert.equal(keepRow(["shop.example"], "", ["shop.example", "DE"], ["", "US"]), false);
  assert.equal(keepRow(["shop.example"], "shop", ["shop.example", "DE"], ["shop.example", "DE"]), true);
});

test("field params omit an empty filter and hide the edge from a site user", () => {
  assert.deepEqual(fieldParams(BLANK_FIELDS, true), {});
  assert.deepEqual(fieldParams({ q: "  env  ", site: "shop.example", country: "", edge: "eu" }, false), {
    q: "env",
    site: "shop.example",
  });
  const long = "x".repeat(FIND_LIMIT + 8);
  assert.equal(fieldParams({ ...BLANK_FIELDS, q: long }, true).q.length, FIND_LIMIT);
});

test("choices drop blanks and repeat once", () => {
  const choices = choiceList(["DE", "", "de", "US", "DE"]);
  assert.deepEqual(choices, ["DE", "US", "de"].sort((a, b) => a.localeCompare(b)));
});
