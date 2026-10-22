import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_REFRESH_SECONDS, LATEST_REQUESTS, REFRESH_SECONDS, arrivedKeys, latestRequests, refreshLabel } from "./arrive.ts";

test("overview refresh defaults to one second and can be turned off", () => {
  assert.equal(DEFAULT_REFRESH_SECONDS, 1);
  assert.deepEqual(REFRESH_SECONDS, [1, 5, 10, 30, 60, 0]);
  assert.equal(refreshLabel(1), "1s");
  assert.equal(refreshLabel(0), "Never");
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
