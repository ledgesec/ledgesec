import assert from "node:assert/strict";
import test from "node:test";
import { FLASH_PROBE, FLASH_REQUEST, countryFlashes } from "./flashes.ts";

test("a new request flashes its country, and a marker wins", () => {
  const rows = [
    { key: "a", country: "us", marked: false },
    { key: "b", country: "DE", marked: true },
    { key: "c", country: "us", marked: true },
    { key: "d", country: "", marked: false },
    { key: "e", country: "FR", marked: false },
  ];
  const flashes = countryFlashes(rows, ["a", "b", "c", "d"]);
  assert.equal(flashes.get("US")?.tone, FLASH_PROBE);
  assert.equal(flashes.get("DE")?.tone, FLASH_PROBE);
  assert.equal(flashes.has("FR"), false);
  assert.equal(flashes.has(""), false);
  assert.equal(countryFlashes(rows, []).size, 0);
  const again = countryFlashes([{ key: "a", country: "US", marked: false }], ["a"]);
  assert.equal(again.get("US")?.tone, FLASH_REQUEST);
  assert.notEqual(again.get("US")?.stamp, flashes.get("US")?.stamp);
});
