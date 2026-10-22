import assert from "node:assert/strict";
import test from "node:test";
import { hostCollectorSchema, hostLabelSchema, hostOwnerSchema } from "./schema.ts";

test("a host name is trimmed and required", () => {
  const parsed = hostLabelSchema.safeParse({ label: "  Shop EU  " });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.label, "Shop EU");
  const blank = hostLabelSchema.safeParse({ label: "   " });
  assert.equal(blank.success, false);
  if (!blank.success) assert.equal(blank.error.flatten().fieldErrors.label?.[0], "Enter a name for this host.");
});

test("nginx and the linux daemon can be added", () => {
  assert.equal(hostCollectorSchema.safeParse({ collector: "nginx" }).success, true);
  assert.equal(hostCollectorSchema.safeParse({ collector: "linux" }).success, true);
  const apache = hostCollectorSchema.safeParse({ collector: "apache" });
  assert.equal(apache.success, false);
  if (!apache.success) {
    assert.equal(apache.error.flatten().fieldErrors.collector?.[0], "Nginx and the Linux daemon can be added now.");
  }
  assert.equal(hostCollectorSchema.safeParse({ collector: "dns" }).success, false);
});

test("an account is required when an admin adds a host", () => {
  const blank = hostOwnerSchema.safeParse({ ownerId: "  " });
  assert.equal(blank.success, false);
  if (!blank.success) {
    assert.equal(blank.error.flatten().fieldErrors.ownerId?.[0], "Choose the account that owns this host.");
  }
  assert.equal(hostOwnerSchema.safeParse({ ownerId: "ab".repeat(8) }).success, true);
});
