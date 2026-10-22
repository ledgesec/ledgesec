import assert from "node:assert/strict";
import test from "node:test";
import { pathMarker } from "./model.ts";

test("marks files a site should not serve", () => {
  assert.equal(pathMarker("/.env")?.label, "Secret file");
  assert.equal(pathMarker("/.env.local")?.code, "env");
  assert.equal(pathMarker("/redis/.env")?.label, "Secret file");
  assert.equal(pathMarker("/.environment"), null);
  assert.equal(pathMarker("/.htaccess")?.label, "Server file");
  assert.equal(pathMarker("/wp-login.php")?.label, "Login probe");
  assert.equal(pathMarker("/pricing"), null);
});
