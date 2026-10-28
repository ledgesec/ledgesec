import assert from "node:assert/strict";
import test from "node:test";
import { pathMarker } from "../../../entities/observation/model.ts";
import { posts } from "../blog/posts.ts";
import { EXAMPLE_PROBES, exampleOmitsAddresses } from "./examples.ts";
import { pageStaysInsideObservation, pageText, staysInsideObservation } from "./overview.ts";

test("the public page describes the journal and does not claim a block", () => {
  const text = pageText();
  assert.equal(pageStaysInsideObservation(), true);
  assert.equal(exampleOmitsAddresses(), true);
  assert.ok(EXAMPLE_PROBES.every((row) => pathMarker(row.path) !== null));
  assert.match(text, /openresty/);
  assert.match(text, /linux daemon/);
  assert.match(text, /coolify/);
  assert.match(text, /does not change the request/);
  assert.match(text, /without addresses/);
  assert.match(text, /shop\.example/);
  assert.match(text, /user-agent/);
  assert.match(text, /github\.com\/ledgesec\/ledgesec/);
});

test("the notes describe the same journal and do not claim a block", () => {
  const text = posts.flatMap((post) => [post.title, post.dek, ...post.body]).join(" ");
  assert.equal(staysInsideObservation(text), true);
  assert.match(text, /OpenResty/);
  assert.match(text, /Linux daemon/);
  assert.match(text, /Coolify/);
  assert.match(text, /country/);
  assert.match(text, /User-Agent/);
});
