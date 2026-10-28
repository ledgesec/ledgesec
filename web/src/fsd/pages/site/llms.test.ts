import assert from "node:assert/strict";
import test from "node:test";
import { SITE_URL, staysInsideObservation } from "../home/overview.ts";
import { FUTURE_STATUS, PAINS } from "../future/pains.ts";
import { humansText, llmsFullText, llmsText } from "./llms.ts";

test("llms files describe the journal and leave the cabinets out", () => {
  const brief = llmsText();
  const full = llmsFullText();
  const humans = humansText();
  const joined = `${brief}\n${full}\n${humans}`;
  assert.equal(staysInsideObservation(joined), true);
  assert.equal(/\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(joined), false);
  assert.match(brief, /^# Ledgesec\n/);
  assert.match(brief, new RegExp(FUTURE_STATUS));
  assert.match(brief, /does not change the request|does not challenge a visitor/);
  assert.match(brief, new RegExp(`${SITE_URL}/llms-full.txt`));
  assert.match(brief, /github.com\/ledgesec\/ledgesec/);
  assert.match(full, new RegExp(PAINS[0].title));
  assert.equal(full.startsWith("# Ledgesec"), true);
  assert.match(humans, /\/llms.txt/);
  assert.equal(brief.includes("/dashboard"), false);
  assert.equal(brief.includes("/admin"), false);
});
