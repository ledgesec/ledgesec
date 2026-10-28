import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTIONS, docsOmitAddresses, docsStayInsideObservation, docsText } from "./connect.ts";

test("the docs show the three collectors and keep addresses out", () => {
  const text = docsText();
  assert.equal(docsStayInsideObservation(), true);
  assert.equal(docsOmitAddresses(), true);
  assert.equal(CONNECTIONS.length, 3);
  assert.match(text, /OpenResty/);
  assert.match(text, /Linux daemon/);
  assert.match(text, /Coolify/);
  assert.match(text, /log_by_lua/);
  assert.match(text, /\/var\/log\/nginx\/ledgesec\.log/);
  assert.match(text, /\/data\/coolify\/proxy\/access\.log/);
  assert.match(text, /\/api\/v1\/observations/);
  assert.match(text, /ClickHouse/);
  assert.match(text, /Postgres/);
  assert.match(text, /New York/);
  assert.match(text, /does not store the journal/);
});
