import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readProductVersion } from "./version.ts";

const web = dirname(fileURLToPath(import.meta.url));

test("the cabinet reads the number from VERSION", () => {
  const expected = readFileSync(join(web, "..", "VERSION"), "utf8").trim();
  assert.equal(readProductVersion(web), expected);
  assert.equal(readProductVersion(join(web, "..")), expected);
});
