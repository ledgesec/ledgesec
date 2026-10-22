import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_REFRESH_SECONDS, LATEST_REQUESTS, REFRESH_MS, REFRESH_SECONDS, arrivedKeys, latestRequests, refreshLabel, refreshWait } from "./arrive.ts";

test("overview refresh defaults to one second and can be turned off", () => {
  assert.equal(DEFAULT_REFRESH_SECONDS, 1);
  assert.deepEqual(REFRESH_SECONDS, [1, 5, 10, 30, 60, 0]);
  assert.equal(refreshLabel(1), "1s");
  assert.equal(refreshLabel(0), "Never");
});

test("the next refresh waits out the interval and does not overlap a slow read", () => {
  assert.equal(refreshWait(0, 1), REFRESH_MS);
  assert.equal(refreshWait(REFRESH_MS - 1, 1), 1);
  assert.equal(refreshWait(REFRESH_MS + 1, 1), 0);
  assert.equal(refreshWait(0, 0), null);
});

test("overview keeps the newest thirty requests", () => {
  const rows = Array.from({ length: LATEST_REQUESTS + 5 }, (_, index) => index);
  assert.equal(latestRequests(rows).length, LATEST_REQUESTS);
  assert.equal(latestRequests(rows)[0], 0);
});

test("only requests that were not on the previous tick are marked new", () => {
  const older = ["a", "b"];
  assert.deepEqual(arrivedKeys(null, older), []);
  assert.deepEqual(arrivedKeys(older, ["a", "b", "c"]), ["c"]);
  assert.deepEqual(arrivedKeys(older, ["a"]), []);
});
