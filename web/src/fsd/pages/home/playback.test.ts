import assert from "node:assert/strict";
import test from "node:test";
import { pathMarker } from "../../../entities/observation/model.ts";
import { LAND } from "../../../widgets/world-map/land.ts";
import {
  PROBE_ADD_MAX,
  PROBE_ADD_MIN,
  PROBE_BATCH,
  PROBE_BATCH_SIZE,
  PROBE_GAP_MAX_MS,
  PROBE_GAP_MIN_MS,
  PROBE_OPENING,
  countryCounts,
  freshKeys,
  nextShown,
  probeGap,
  visibleProbes,
} from "./playback.ts";

const ADDRESS = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const codes = new Set(LAND.map((place) => place.code));

test("one example batch holds fifty probes and no visitor address", () => {
  assert.equal(PROBE_BATCH.length, PROBE_BATCH_SIZE);
  assert.equal(new Set(PROBE_BATCH.map((row) => row.key)).size, PROBE_BATCH_SIZE);
  for (const row of PROBE_BATCH) {
    assert.equal(pathMarker(row.path) !== null, true);
    assert.equal(codes.has(row.country), true);
    assert.equal(ADDRESS.test(row.ua), false);
    assert.equal(Object.hasOwn(row, "ip"), false);
    assert.equal(row.path.startsWith("/"), true);
  }
  assert.equal(PROBE_BATCH[0]?.ts < (PROBE_BATCH[PROBE_BATCH_SIZE - 1]?.ts ?? ""), true);
});

test("playback opens on the five oldest and walks toward the newest", () => {
  const opening = visibleProbes(PROBE_BATCH, PROBE_OPENING);
  assert.equal(opening.length, PROBE_OPENING);
  assert.equal(opening.at(-1)?.key, PROBE_BATCH[0]?.key);
  assert.equal(opening[0]?.key, PROBE_BATCH[PROBE_OPENING - 1]?.key);
  assert.equal(nextShown(PROBE_OPENING, PROBE_BATCH_SIZE, 0), PROBE_OPENING + PROBE_ADD_MIN);
  assert.equal(nextShown(PROBE_OPENING, PROBE_BATCH_SIZE, PROBE_ADD_MAX - PROBE_ADD_MIN), PROBE_OPENING + PROBE_ADD_MAX);
  const added = freshKeys(PROBE_OPENING, PROBE_OPENING + 3, PROBE_BATCH);
  assert.deepEqual(added, ["probe-7", "probe-6", "probe-5"]);
  assert.equal(nextShown(PROBE_BATCH_SIZE - 1, PROBE_BATCH_SIZE, 2), PROBE_BATCH_SIZE);
  assert.equal(nextShown(PROBE_BATCH_SIZE, PROBE_BATCH_SIZE, 1), PROBE_OPENING);
  assert.deepEqual(freshKeys(PROBE_BATCH_SIZE, PROBE_OPENING, PROBE_BATCH), []);
});

test("the wait stays between two and three seconds", () => {
  assert.equal(probeGap(0), PROBE_GAP_MIN_MS);
  assert.equal(probeGap(PROBE_GAP_MAX_MS - PROBE_GAP_MIN_MS), PROBE_GAP_MAX_MS);
  const counts = countryCounts(visibleProbes(PROBE_BATCH, PROBE_OPENING));
  assert.equal(
    counts.reduce((sum, country) => sum + country.requests, 0),
    PROBE_OPENING,
  );
});
