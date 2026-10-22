import assert from "node:assert/strict";
import test from "node:test";
import { RULE_SUFFIX, probeRuleSchema } from "./schema.ts";

test("a marker needs a label, a match, and a pattern without spaces", () => {
  const parsed = probeRuleSchema.safeParse({ label: " Cloud key ", kind: RULE_SUFFIX, pattern: "/firebase-key.json" });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.label, "Cloud key");
  assert.equal(probeRuleSchema.safeParse({ label: "", kind: RULE_SUFFIX, pattern: "/key.json" }).success, false);
  assert.equal(probeRuleSchema.safeParse({ label: "Cloud key", kind: RULE_SUFFIX, pattern: "/key file.json" }).success, false);
});
