import assert from "node:assert/strict";
import test from "node:test";
import {
  CHANNEL_EMAIL,
  CHANNEL_ERROR,
  CHANNEL_TELEGRAM,
  CHANNEL_WHATSAPP,
  demoSchema,
  EMAIL_ERROR,
  MESSAGE_ERROR,
  NAME_ERROR,
  TELEGRAM_ERROR,
  WHATSAPP_ERROR,
} from "./schema.ts";

const NOTE = {
  name: " Ada ",
  channel: CHANNEL_EMAIL,
  reach: "ada@shop.example",
  host: "",
  message: " Nginx ",
};

test("a demo note trims the name and keeps an empty host", () => {
  const parsed = demoSchema.safeParse(NOTE);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.name, "Ada");
    assert.equal(parsed.data.channel, CHANNEL_EMAIL);
    assert.equal(parsed.data.host, "");
    assert.equal(parsed.data.message, "Nginx");
  }
});

test("a demo note rejects a blank name, a bad email, and a blank message", () => {
  const parsed = demoSchema.safeParse({ ...NOTE, name: " ", reach: "ada", message: "" });
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    assert.equal(fields.name?.[0], NAME_ERROR);
    assert.equal(fields.reach?.[0], EMAIL_ERROR);
    assert.equal(fields.message?.[0], MESSAGE_ERROR);
  }
});

test("telegram takes a name or a number, and whatsapp takes a number", () => {
  const telegram = demoSchema.safeParse({ ...NOTE, channel: CHANNEL_TELEGRAM, reach: " @ada_ledger " });
  assert.equal(telegram.success, true);
  if (telegram.success) assert.equal(telegram.data.reach, "@ada_ledger");
  const telegramNumber = demoSchema.safeParse({ ...NOTE, channel: CHANNEL_TELEGRAM, reach: "+1 202 555 0100" });
  assert.equal(telegramNumber.success, true);
  const number = demoSchema.safeParse({ ...NOTE, channel: CHANNEL_WHATSAPP, reach: "+1 202 555 0100" });
  assert.equal(number.success, true);
  const named = demoSchema.safeParse({ ...NOTE, channel: CHANNEL_WHATSAPP, reach: "@ada_ledger" });
  assert.equal(named.success, false);
  if (!named.success) assert.equal(named.error.flatten().fieldErrors.reach?.[0], WHATSAPP_ERROR);
  const short = demoSchema.safeParse({ ...NOTE, channel: CHANNEL_TELEGRAM, reach: "ada" });
  assert.equal(short.success, false);
  if (!short.success) assert.equal(short.error.flatten().fieldErrors.reach?.[0], TELEGRAM_ERROR);
  const other = demoSchema.safeParse({ ...NOTE, channel: "sms" });
  assert.equal(other.success, false);
  if (!other.success) assert.equal(other.error.flatten().fieldErrors.channel?.[0], CHANNEL_ERROR);
});
