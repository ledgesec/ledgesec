import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { keepsPwa, THEME_COLOR } from "./pwa.ts";

test("the installed app stays off the cabinets", () => {
  assert.equal(keepsPwa("ledgesec.com"), true);
  assert.equal(keepsPwa("localhost:44733"), true);
  assert.equal(keepsPwa("dash.ledgesec.com"), false);
  assert.equal(keepsPwa("admin.ledgesec.com"), false);
});

test("the worker does not keep a copy of a page", () => {
  const worker = readFileSync(new URL("../../../public/sw.js", import.meta.url), "utf8");
  assert.match(worker, /fetch\(event\.request\)/);
  assert.equal(worker.includes("caches"), false);
  assert.equal(THEME_COLOR.startsWith("#"), true);
});
