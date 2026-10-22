import assert from "node:assert/strict";
import test from "node:test";
import { clientStack } from "./client.ts";

test("the client line keeps protocol, tls, and size", () => {
  assert.equal(
    clientStack({ protocol: "HTTP/2.0", tls: "1.3 TLS_AES_128_GCM_SHA256", bytesSent: 1280 }),
    "HTTP/2.0 · 1.3 TLS_AES_128_GCM_SHA256 · 1280 B",
  );
  assert.equal(clientStack({ protocol: "", tls: "", bytesSent: 0 }), "");
});
