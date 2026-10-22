import assert from "node:assert/strict";
import test from "node:test";
import { shareFlight } from "./flight.ts";

test("a summary read in flight is shared, and the next one starts after it settles", async () => {
  const slot: { current: Promise<number> | null } = { current: null };
  let starts = 0;
  let release: (value: number) => void = () => {};
  const first = shareFlight(slot, () => {
    starts += 1;
    return new Promise<number>((resolve) => {
      release = resolve;
    });
  });
  const second = shareFlight(slot, () => {
    starts += 1;
    return Promise.resolve(0);
  });
  assert.equal(starts, 1);
  assert.equal(first, second);
  release(4);
  assert.equal(await first, 4);
  const third = shareFlight(slot, () => {
    starts += 1;
    return Promise.resolve(5);
  });
  assert.equal(starts, 2);
  assert.equal(await third, 5);
});

test("a failed summary read does not stick in the slot", async () => {
  const slot: { current: Promise<number> | null } = { current: null };
  let starts = 0;
  await assert.rejects(
    shareFlight(slot, () => {
      starts += 1;
      return Promise.reject(new Error("down"));
    }),
    /down/,
  );
  const next = shareFlight(slot, () => {
    starts += 1;
    return Promise.resolve(1);
  });
  assert.equal(starts, 2);
  assert.equal(await next, 1);
});
