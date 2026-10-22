package.path = "module/?.lua;" .. package.path
local token = require("ledgesec.token")

assert(token.hex_sha256("") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
assert(token.hex_sha256("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
assert(token.hex_hmac(string.rep(string.char(0x0b), 20), "Hi There")
  == "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7")
assert(token.hex_hmac("Jefe", "what do ya want for nothing?")
  == "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843")

local rows = {
  { "GET", "/pricing", "utm=1", false, "handoff" },
  { "GET", "/pricing", "utm=1", true, "continue" },
  { "GET", "/.env", "", true, "handoff" },
  { "GET", "/app.js", "", false, "continue" },
  { "GET", "/app.js", "q=union%20select", true, "handoff" },
  { "GET", "/%2e%2e/secret", "", true, "handoff" },
  { "GET", "/.well-known/acme-challenge/abc", "", false, "continue" },
  { "POST", "/pricing", "", false, "hold:needs_decision" },
  { "POST", "/pricing", "", true, "continue" },
  { "POST", "/.env", "", true, "hold:waf" },
  { "OPTIONS", "/pricing", "", false, "continue" },
}
for _, row in ipairs(rows) do
  local got = token.classify_name(row[1], row[2], row[3], row[4])
  assert(got == row[5], row[2] .. " got " .. got .. " want " .. row[5])
end

local long = "/" .. string.rep("a", 161)
assert(token.classify_name("GET", long, "", true) == "hold:waf")

local observe = require("ledgesec.observe")
local ev = observe.event({ path = "/pricing?utm=1", ts = 1000, ip = "203.0.113.10", request_time_ms = 42 })
assert(ev.path == "/pricing")
assert(ev.request_time_ms == 42)
assert(string.find(observe.event_json(ev), '"request_time_ms":42', 1, true))
local client = observe.event({
  path = "/", ts = 1, ua = "Mozilla/5.0", scheme = "HTTPS", protocol = "HTTP/1.1", tls = "TLSv1.3", tls_cipher = "TLS_AES_128_GCM_SHA256", bytes_sent = 12,
})
local client_json = observe.event_json(client)
assert(string.find(client_json, '"ua":"Mozilla/5.0"', 1, true))
assert(string.find(client_json, '"protocol":"https HTTP/1.1"', 1, true))
assert(string.find(client_json, '"tls":"TLSv1.3 ', 1, true))
assert(string.find(client_json, "referer", 1, true) == nil)
assert(ev.route_group == "document")
assert(ev.ip == "203.0.113.10")
assert(observe.event({ path = "/app.js", ts = 1, ip = "203.0.113.10" }).route_group == "asset")
assert(observe.event({ path = "/.well-known/acme-challenge/tok", ts = 1 }) == nil)
local long_query = "/a?" .. string.rep("q", 400)
assert(#observe.clean_path(long_query) <= 160)
local body = observe.body("demo", "module", { ev })
assert(string.find(body, '"agent":', 1, true) == nil)
local named = observe.body("demo", "module", { ev }, "0.1.5\n")
assert(string.find(named, '"agent":"0.1.5"', 1, true))
assert(observe.read_version("  0.1.5\n") == "0.1.5")
assert(observe.read_version("latest") == nil)
assert(string.find(body, "utm", 1, true) == nil)
assert(string.find(body, "cookie", 1, true) == nil)
assert(string.find(body, "authorization", 1, true) == nil)
assert(string.find(body, "referer", 1, true) == nil)
assert(observe.mac("ingest-secret", body) == token.hex_hmac("ingest-secret", body))

assert(observe.is_probe("/.env"))
assert(observe.is_probe("/.ENV"))
assert(observe.is_probe("/foo/.env"))
assert(observe.is_probe("/redis/.env"))
assert(not observe.is_probe("/.environment"))
assert(not observe.is_probe("/.gitignore"))
assert(observe.is_probe("/.pem"))
assert(not observe.is_probe("/server.pem"))
assert(observe.is_probe("/phpMyAdmin/"))
assert(observe.is_probe("/.DS_Store"))
assert(not observe.is_probe("/pricing"))
assert(observe.is_probe("/mcp.json"))
assert(observe.is_probe("/application.yml"))
assert(observe.is_probe("/application-dev.yml"))
assert(observe.is_probe("/composer.lock"))
assert(observe.is_probe("/configuration.php"))
assert(not observe.is_probe("/composer.json"))
assert(not observe.is_probe("/app.js"))

local keep_probe, sampled_probe = observe.decide("/.env?x=1", 200, 1, 99)
assert(keep_probe and not sampled_probe)
local keep_err, sampled_err = observe.decide("/pricing", 404, 1, 99)
assert(keep_err and not sampled_err)
local keep_hit, sampled_hit = observe.decide("/pricing", 200, 1, 1)
assert(keep_hit and sampled_hit)
local keep_miss = observe.decide("/", 200, 1, 2)
assert(not keep_miss)
local keep_all = observe.decide("/", 200, 100, 100)
assert(keep_all)

local ring = {}
ring = observe.admit(ring, observe.event({ path = "/", ts = 1, status = 200, sampled = true }), 2)
ring = observe.admit(ring, observe.event({ path = "/a", ts = 2, status = 200, sampled = true }), 2)
ring = observe.admit(ring, observe.event({ path = "/b", ts = 3, status = 200, sampled = true }), 2)
assert(#ring == 2)
ring = observe.admit(ring, observe.event({ path = "/.env", ts = 4, status = 404, sampled = false }), 2)
assert(#ring == 2)
local packed = ring[1].json .. ring[2].json
assert(string.find(packed, "/.env", 1, true))
assert(string.find(packed, "leakquery", 1, true) == nil)

local function slot(i)
  if i == 2 then return 'S{"ts":10,"path":"/old"}' end
  if i == 3 then return 'K{"ts":20,"path":"/.env"}' end
  return nil
end
local got, last = observe.collect(slot, 0, 3, 1000, 900000)
assert(#got == 2)
assert(last == 3)
assert(got[2].priority == "keep")
assert(observe.should_send(got, 100, 21, 5000))
assert(not observe.should_send({ { priority = "sample", ts = 1000 } }, 100, 2000, 5000))
assert(observe.should_send({ { priority = "sample", ts = 1000 } }, 100, 7000, 5000))
assert(observe.ingest_url(nil) == "https://dash.ledgesec.com/api/v1/observations")
assert(observe.ingest_url("https://dash.ledgesec.com") == "https://dash.ledgesec.com/api/v1/observations")
local scheme, host, port, path = observe.parse_url("https://dash.ledgesec.com/api/v1/observations")
assert(scheme == "https" and host == "dash.ledgesec.com" and port == 443 and path == "/api/v1/observations")
assert(observe.http_ok(202) and not observe.http_ok(401) and not observe.http_ok(nil))
local parsed = observe.read_env_file("LEDGESEC_SITE_ID=demo\n# secret\nLEDGESEC_SAMPLE_RATE=1\n")
assert(parsed.LEDGESEC_SITE_ID == "demo")
assert(parsed.LEDGESEC_SAMPLE_RATE == "1")
assert(observe.config_from({ LEDGESEC_SITE_ID = "demo", LEDGESEC_EDGE_ID = "eu" }).url
  == "https://dash.ledgesec.com/api/v1/observations")

io.write("HANDOFF " .. token.handoff_token(
  "test-secret", "demo", "127.0.0.1:44721", "/pricing", "utm=1", "203.0.113.10", 2000000000, "n0nce"
) .. "\n")
io.write("PASS " .. token.pass_token("test-secret", "demo", 2000000000) .. "\n")
io.write("OK\n")
