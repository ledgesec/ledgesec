import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN, CLIENT } from "./role.ts";
import {
  ADDRESSES,
  HOSTS,
  OVERVIEW,
  PROBES,
  REQUESTS,
  cabinetRewrite,
  requestHref,
  sectionFromParts,
  sectionHref,
  sectionOfPath,
} from "./cabinet-section.ts";

test("a cabinet tab is a path under the local root and a tail on the public host", () => {
  assert.equal(sectionHref("localhost:44733", CLIENT, OVERVIEW), "/dashboard");
  assert.equal(sectionHref("localhost:44733", CLIENT, PROBES), "/dashboard/probes");
  assert.equal(sectionHref("127.0.0.1:44733", ADMIN, ADDRESSES), "/admin/addresses");
  assert.equal(sectionHref("dash.ledgesec.com", CLIENT, OVERVIEW), "/");
  assert.equal(sectionHref("dash.ledgesec.com", CLIENT, REQUESTS), "/requests");
  assert.equal(sectionHref("admin.ledgesec.com", ADMIN, HOSTS), "/hosts");
  assert.equal(requestHref("localhost:44733", CLIENT, "", "/.env"), "/dashboard/requests?path=%2F.env");
  assert.equal(requestHref("dash.ledgesec.com", CLIENT, "203.0.113.10", ""), "/requests?ip=203.0.113.10");
  assert.equal(
    requestHref("localhost:44733", ADMIN, "", "/.env", new URLSearchParams("q=shop&ip=203.0.113.10")),
    "/admin/requests?q=shop&path=%2F.env",
  );
});

test("the open path is the tab, and a client has no addresses tab", () => {
  assert.equal(sectionOfPath("/dashboard", CLIENT), OVERVIEW);
  assert.equal(sectionOfPath("/dashboard/probes", CLIENT), PROBES);
  assert.equal(sectionOfPath("/probes", CLIENT), PROBES);
  assert.equal(sectionOfPath("/", ADMIN), OVERVIEW);
  assert.equal(sectionOfPath("/admin/addresses", ADMIN), ADDRESSES);
  assert.equal(sectionFromParts(["addresses"], CLIENT), null);
  assert.equal(sectionFromParts(["overview"], CLIENT), null);
  assert.equal(sectionFromParts(undefined, CLIENT), OVERVIEW);
});

test("the public host rewrites a tab onto the cabinet route and leaves the site alone", () => {
  assert.equal(cabinetRewrite("client", "/"), "/dashboard");
  assert.equal(cabinetRewrite("client", "/probes"), "/dashboard/probes");
  assert.equal(cabinetRewrite("client", "/dashboard/probes"), null);
  assert.equal(cabinetRewrite("client", "/pricing"), "/dashboard");
  assert.equal(cabinetRewrite("client", "/api/v1/observations"), null);
  assert.equal(cabinetRewrite("admin", "/addresses"), "/admin/addresses");
  assert.equal(cabinetRewrite("admin", "/"), "/admin");
  assert.equal(cabinetRewrite("site", "/blog"), null);
});
