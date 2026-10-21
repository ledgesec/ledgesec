import assert from "node:assert/strict";
import test from "node:test";
import { adminHref, dashboardHref, siteHref, surfaceOf } from "./hosts.ts";

test("dash is the site cabinet and admin.ledgesec.com is the admin cabinet", () => {
  assert.equal(surfaceOf("dash.ledgesec.com"), "client");
  assert.equal(surfaceOf("admin.ledgesec.com"), "admin");
  assert.equal(surfaceOf("ledgesec.com"), "site");
  assert.equal(surfaceOf("www.ledgesec.com"), "site");
  assert.equal(dashboardHref("ledgesec.com"), "https://dash.ledgesec.com");
  assert.equal(adminHref("dash.ledgesec.com"), "https://admin.ledgesec.com");
  assert.equal(dashboardHref("admin.ledgesec.com"), "https://dash.ledgesec.com");
  assert.equal(adminHref("127.0.0.1:44733"), "/admin");
  assert.equal(dashboardHref("localhost:44733"), "/dashboard");
  assert.equal(siteHref("admin.ledgesec.com"), "https://ledgesec.com");
  assert.equal(siteHref("ledgesec.com"), "/");
});
