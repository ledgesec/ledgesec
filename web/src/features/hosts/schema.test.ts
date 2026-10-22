import assert from "node:assert/strict";
import test from "node:test";
import { hostCollectorSchema, hostLabelSchema } from "./schema.ts";

test("a host name is trimmed and required", () => {
  const parsed = hostLabelSchema.safeParse({ label: "  Shop EU  " });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.label, "Shop EU");
  const blank = hostLabelSchema.safeParse({ label: "   " });
  assert.equal(blank.success, false);
  if (!blank.success) assert.equal(blank.error.flatten().fieldErrors.label?.[0], "Enter a name for this host.");
});

test("only the nginx connection can be added", () => {
  assert.equal(hostCollectorSchema.safeParse({ collector: "nginx" }).success, true);
  const apache = hostCollectorSchema.safeParse({ collector: "apache" });
  assert.equal(apache.success, false);
  if (!apache.success) {
    assert.equal(apache.error.flatten().fieldErrors.collector?.[0], "Nginx is the connection available now.");
  }
  assert.equal(hostCollectorSchema.safeParse({ collector: "dns" }).success, false);
  assert.equal(hostCollectorSchema.safeParse({ collector: "linux" }).success, false);
});
