import assert from "node:assert/strict";
import test from "node:test";
import { demoSchema, EMAIL_ERROR, MESSAGE_ERROR, NAME_ERROR } from "./schema.ts";

test("a demo note trims the name and keeps an empty host", () => {
  const parsed = demoSchema.safeParse({
    name: " Ada ",
    email: "ada@shop.example",
    host: "",
    message: " Nginx ",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.name, "Ada");
    assert.equal(parsed.data.host, "");
    assert.equal(parsed.data.message, "Nginx");
  }
});

test("a demo note rejects a blank name, a bad email, and a blank message", () => {
  const parsed = demoSchema.safeParse({ name: " ", email: "ada", host: "shop.example", message: "" });
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    assert.equal(fields.name?.[0], NAME_ERROR);
    assert.equal(fields.email?.[0], EMAIL_ERROR);
    assert.equal(fields.message?.[0], MESSAGE_ERROR);
  }
});
