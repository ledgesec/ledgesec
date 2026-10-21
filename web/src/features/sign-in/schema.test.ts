import assert from "node:assert/strict";
import test from "node:test";
import { signInSchema } from "./schema.ts";

test("sign-in trims a valid email", () => {
  const parsed = signInSchema.safeParse({ email: " iris@example.com ", password: "secret" });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.email, "iris@example.com");
});

test("sign-in rejects a blank or malformed email and a blank password", () => {
  const blank = signInSchema.safeParse({ email: "  ", password: "" });
  assert.equal(blank.success, false);
  if (!blank.success) {
    const fields = blank.error.flatten().fieldErrors;
    assert.equal(fields.email?.[0], "Enter a valid email.");
    assert.equal(fields.password?.[0], "Enter a password.");
  }
  const malformed = signInSchema.safeParse({ email: "iris", password: "secret" });
  assert.equal(malformed.success, false);
});
