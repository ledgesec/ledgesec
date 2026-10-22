import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RATE_WINDOW,
  POINT_HOUR,
  POINT_MINUTE,
  RATE_WINDOWS,
  pointLabel,
  pointMinutes,
  stepCaption,
} from "./windows.ts";

test("the rate chart offers an hour and then longer windows", () => {
  assert.deepEqual(RATE_WINDOWS, ["1h", "3h", "6h", "12h", "24h"]);
  assert.equal(DEFAULT_RATE_WINDOW, "1h");
});

test("the caption follows the bucket the period asked for", () => {
  assert.equal(stepCaption(60), POINT_MINUTE);
  assert.equal(stepCaption(5 * 60), pointMinutes(5));
  assert.equal(stepCaption(30 * 60), pointMinutes(30));
  assert.equal(stepCaption(60 * 60), POINT_HOUR);
  assert.equal(pointLabel("2026-10-22 18:07:00"), "18:07");
});
