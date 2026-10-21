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
local ev = observe.event({ path = "/pricing?utm=1", ts = 1000, ip = "203.0.113.10" })
assert(ev.path == "/pricing")
assert(ev.route_group == "document")
assert(ev.ip == "203.0.113.10")
assert(observe.event({ path = "/app.js", ts = 1, ip = "203.0.113.10" }).route_group == "asset")
assert(observe.event({ path = "/.well-known/acme-challenge/tok", ts = 1 }) == nil)
local long_query = "/a?" .. string.rep("q", 400)
assert(#observe.clean_path(long_query) <= 160)
local body = observe.body("demo", "module", { ev })
assert(string.find(body, "utm", 1, true) == nil)
assert(observe.mac("ingest-secret", body) == token.hex_hmac("ingest-secret", body))

io.write("HANDOFF " .. token.handoff_token(
  "test-secret", "demo", "127.0.0.1:44721", "/pricing", "utm=1", "203.0.113.10", 2000000000, "n0nce"
) .. "\n")
io.write("PASS " .. token.pass_token("test-secret", "demo", 2000000000) .. "\n")
io.write("OK\n")
