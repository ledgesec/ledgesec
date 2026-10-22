import assert from "node:assert/strict";
import test from "node:test";
import { BLANK_FIELDS, FIND_LIMIT, FIND_WAIT_MS, QUERY, SITE, choiceList, fieldParams, fieldsFrom, hrefWithParams, keepRow, searchHeld } from "./query.ts";

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

test("a table query is written into the page address and an empty value is removed", () => {
  assert.equal(hrefWithParams("/admin/requests", new URLSearchParams("ip=203.0.113.10"), { q: "shop", site: "" }), "/admin/requests?ip=203.0.113.10&q=shop");
  assert.equal(hrefWithParams("/admin/sites", new URLSearchParams("q=shop&slow=env"), { q: "   " }), "/admin/sites?slow=env");
  const params = new URLSearchParams(hrefWithParams("/requests", new URLSearchParams(), { q: "x".repeat(FIND_LIMIT + 4), edge: "eu" }).slice("/requests?".length));
  assert.deepEqual(fieldsFrom(params, false), { ...BLANK_FIELDS, q: "x".repeat(FIND_LIMIT) });
  assert.equal(fieldsFrom(params, true).edge, "eu");
  assert.equal(params.get(QUERY)?.length, FIND_LIMIT);
  assert.equal(params.get(SITE), null);
});

test("a search holds until the wait commits it, and a filter does not", () => {
  assert.equal(searchHeld("env", "", FIND_WAIT_MS), true);
  assert.equal(searchHeld("env", "env", FIND_WAIT_MS), false);
  assert.equal(searchHeld("env", "", 0), false);
});

test("choices drop blanks and repeat once", () => {
  const choices = choiceList(["DE", "", "de", "US", "DE"]);
  assert.deepEqual(choices, ["DE", "US", "de"].sort((a, b) => a.localeCompare(b)));
});
