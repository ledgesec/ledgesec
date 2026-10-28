import assert from "node:assert/strict";
import test from "node:test";
import { HUMANS_PATH, LLMS_FULL_PATH, LLMS_PATH, ROBOTS_PATH, robotsDisallow } from "./crawl-paths.ts";

test("the public host is indexed and a cabinet host is closed", () => {
  assert.deepEqual(robotsDisallow("ledgesec.com"), ["/dashboard", "/admin", "/api/"]);
  assert.deepEqual(robotsDisallow("www.ledgesec.com"), ["/dashboard", "/admin", "/api/"]);
  assert.deepEqual(robotsDisallow("dash.ledgesec.com"), ["/"]);
  assert.deepEqual(robotsDisallow("admin.ledgesec.com"), ["/"]);
  assert.equal(LLMS_PATH, "/llms.txt");
  assert.equal(LLMS_FULL_PATH, "/llms-full.txt");
  assert.equal(HUMANS_PATH, "/humans.txt");
  assert.equal(ROBOTS_PATH, "/robots.txt");
});
