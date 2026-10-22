import assert from "node:assert/strict";
import test from "node:test";
import { arrivingSites } from "./arrival.ts";

test("a host is confirmed when a site name has arrived", () => {
  assert.deepEqual(arrivingSites([], "536a35a4"), []);
  assert.deepEqual(arrivingSites([{ id: "536a35a4", sites: [] }], "536a35a4"), []);
  const shop = [{ id: "536a35a4", sites: [{ name: "shop.example" }] }];
  const other = [{ id: "other", sites: [{ name: "elsewhere.example" }] }];
  assert.deepEqual(arrivingSites([...other, ...shop], "536a35a4"), [{ name: "shop.example" }]);
});
