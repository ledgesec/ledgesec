-- Token and line check shared with the Rust contour.
-- Bit operations are arithmetic so the file runs on LuaJIT (OpenResty) and Lua 5.4.

local M = {}

M.PATH_MAX = 160
M.QUERY_MAX = 512
M.PASS_TTL = 12 * 60 * 60
M.HANDOFF_TTL = 60
local SKEW = 30
local MOD = 4294967296

local ASSET = {
  css = true, js = true, png = true, jpg = true, jpeg = true, gif = true,
  webp = true, ico = true, svg = true, woff = true, woff2 = true, map = true,
}

local function to32(n)
  n = n % MOD
  if n < 0 then n = n + MOD end
  return n
end

local function bits_of(n)
  n = to32(n)
  local b = {}
  for i = 1, 32 do
    b[i] = n % 2
    n = math.floor(n / 2)
  end
  return b
end

local function from_bits(b)
  local n, p = 0, 1
  for i = 1, 32 do
    if b[i] == 1 then n = n + p end
    p = p * 2
  end
  return n
end

local function shift_bits(n, s, dir)
  local b = bits_of(n)
  local o = {}
  for i = 1, 32 do o[i] = 0 end
  if s >= 32 then return 0 end
  if dir == "left" then
    for i = 1, 32 - s do o[i + s] = b[i] end
  else
    for i = 1, 32 - s do o[i] = b[i + s] end
  end
  return from_bits(o)
end

local function lshift(n, s) return shift_bits(n, s, "left") end
local function rshift(n, s) return shift_bits(n, s, "right") end

local function band(x, y)
  local a, b = bits_of(x), bits_of(y)
  local o = {}
  for i = 1, 32 do o[i] = (a[i] == 1 and b[i] == 1) and 1 or 0 end
  return from_bits(o)
end

local function bxor(x, y)
  local a, b = bits_of(x), bits_of(y)
  local o = {}
  for i = 1, 32 do o[i] = (a[i] ~= b[i]) and 1 or 0 end
  return from_bits(o)
end

local function bnot(n)
  local b = bits_of(n)
  for i = 1, 32 do b[i] = 1 - b[i] end
  return from_bits(b)
end

local function rotr(n, s)
  return bxor(rshift(n, s), lshift(n, 32 - s))
end

local function add32(...)
  local s = 0
  for i = 1, select("#", ...) do
    s = s + select(i, ...)
  end
  return s % MOD
end

local K = {
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
}

local function sha256(msg)
  local bytes = {}
  for i = 1, #msg do bytes[i] = string.byte(msg, i) end
  bytes[#bytes + 1] = 0x80
  while (#bytes % 64) ~= 56 do bytes[#bytes + 1] = 0 end
  local bitlen = #msg * 8
  for i = 7, 0, -1 do
    bytes[#bytes + 1] = math.floor(bitlen / 256 ^ i) % 256
  end

  local h = {
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  }

  for off = 0, (#bytes / 64) - 1 do
    local w = {}
    for i = 0, 15 do
      local p = off * 64 + i * 4 + 1
      w[i] = bytes[p] * 16777216 + bytes[p + 1] * 65536 + bytes[p + 2] * 256 + bytes[p + 3]
    end
    for i = 16, 63 do
      local s0 = bxor(bxor(rotr(w[i - 15], 7), rotr(w[i - 15], 18)), rshift(w[i - 15], 3))
      local s1 = bxor(bxor(rotr(w[i - 2], 17), rotr(w[i - 2], 19)), rshift(w[i - 2], 10))
      w[i] = add32(w[i - 16], s0, w[i - 7], s1)
    end
    local a, b, c, d, e, f, g, hh = h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8]
    for i = 0, 63 do
      local s1 = bxor(bxor(rotr(e, 6), rotr(e, 11)), rotr(e, 25))
      local ch = bxor(band(e, f), band(bnot(e), g))
      local t1 = add32(hh, s1, ch, K[i + 1], w[i])
      local s0 = bxor(bxor(rotr(a, 2), rotr(a, 13)), rotr(a, 22))
      local maj = bxor(bxor(band(a, b), band(a, c)), band(b, c))
      local t2 = add32(s0, maj)
      hh, g, f, e, d, c, b, a = g, f, e, add32(d, t1), c, b, a, add32(t1, t2)
    end
    h[1], h[2], h[3], h[4] = add32(h[1], a), add32(h[2], b), add32(h[3], c), add32(h[4], d)
    h[5], h[6], h[7], h[8] = add32(h[5], e), add32(h[6], f), add32(h[7], g), add32(h[8], hh)
  end

  local out = {}
  for i = 1, 8 do
    local n = h[i]
    out[#out + 1] = string.char(
      math.floor(n / 16777216) % 256,
      math.floor(n / 65536) % 256,
      math.floor(n / 256) % 256,
      n % 256
    )
  end
  return table.concat(out)
end

local function hmac_sha256(key, msg)
  if #key > 64 then key = sha256(key) end
  local k = key .. string.rep("\0", 64 - #key)
  local ip, op = {}, {}
  for i = 1, 64 do
    local b = string.byte(k, i)
    ip[i] = string.char(bxor(b, 0x36))
    op[i] = string.char(bxor(b, 0x5c))
  end
  return sha256(table.concat(op) .. sha256(table.concat(ip) .. msg))
end

local ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
local REV = {}
for i = 1, #ALPH do REV[string.sub(ALPH, i, i)] = i - 1 end

local function b64url(data)
  local out = {}
  local i = 1
  while i + 2 <= #data do
    local n = string.byte(data, i) * 65536 + string.byte(data, i + 1) * 256 + string.byte(data, i + 2)
    out[#out + 1] = string.sub(ALPH, math.floor(n / 262144) % 64 + 1, math.floor(n / 262144) % 64 + 1)
    out[#out + 1] = string.sub(ALPH, math.floor(n / 4096) % 64 + 1, math.floor(n / 4096) % 64 + 1)
    out[#out + 1] = string.sub(ALPH, math.floor(n / 64) % 64 + 1, math.floor(n / 64) % 64 + 1)
    out[#out + 1] = string.sub(ALPH, n % 64 + 1, n % 64 + 1)
    i = i + 3
  end
  local rest = #data - i + 1
  if rest == 1 then
    local n = string.byte(data, i) * 65536
    out[#out + 1] = string.sub(ALPH, math.floor(n / 262144) % 64 + 1, math.floor(n / 262144) % 64 + 1)
    out[#out + 1] = string.sub(ALPH, math.floor(n / 4096) % 64 + 1, math.floor(n / 4096) % 64 + 1)
  elseif rest == 2 then
    local n = string.byte(data, i) * 65536 + string.byte(data, i + 1) * 256
    out[#out + 1] = string.sub(ALPH, math.floor(n / 262144) % 64 + 1, math.floor(n / 262144) % 64 + 1)
    out[#out + 1] = string.sub(ALPH, math.floor(n / 4096) % 64 + 1, math.floor(n / 4096) % 64 + 1)
    out[#out + 1] = string.sub(ALPH, math.floor(n / 64) % 64 + 1, math.floor(n / 64) % 64 + 1)
  end
  return table.concat(out)
end

local function hex_val(c)
  local b = string.byte(c)
  if b >= 48 and b <= 57 then return b - 48 end
  if b >= 97 and b <= 102 then return b - 87 end
  if b >= 65 and b <= 70 then return b - 55 end
  return nil
end

local function percent_decode(s)
  local out = {}
  local i = 1
  while i <= #s do
    if string.sub(s, i, i) == "%" then
      if i + 2 > #s then return nil end
      local hi = hex_val(string.sub(s, i + 1, i + 1))
      local lo = hex_val(string.sub(s, i + 2, i + 2))
      if not hi or not lo then return nil end
      out[#out + 1] = string.char(hi * 16 + lo)
      i = i + 3
    else
      out[#out + 1] = string.sub(s, i, i)
      i = i + 1
    end
  end
  return table.concat(out)
end

local function lower(s)
  return string.lower(s)
end

local function has_dotdot(path)
  for seg in string.gmatch(path, "[^/]+") do
    if seg == ".." then return true end
  end
  -- a trailing ".." with the split above is caught; a path that is exactly ".." too.
  if path == ".." then return true end
  return false
end

local function suspicious(path, query)
  local dp = percent_decode(path)
  local dq = percent_decode(query)
  if not dp or not dq then return true end
  if string.find(dp, "\0", 1, true) or string.find(dq, "\0", 1, true) or string.find(dp, "\\", 1, true) then
    return true
  end
  if string.sub(path, 1, 2) == "//" or string.sub(dp, 1, 2) == "//" then return true end
  if has_dotdot(dp) then return true end
  local pl, ql = lower(dp), lower(dq)
  local marks = { "/.env", "/.git/", "/wp-login.php", "/wp-admin/", "/phpmyadmin", "/etc/passwd", "/vendor/phpunit", "<script", "union select", "' or 1=1" }
  for _, mark in ipairs(marks) do
    if string.find(pl, mark, 1, true) then return true end
  end
  local qmarks = { "<script", "union select", "' or 1=1", "../", "/.env", "/.git/" }
  for _, mark in ipairs(qmarks) do
    if string.find(ql, mark, 1, true) then return true end
  end
  return false
end

local function is_asset(path)
  local dp = percent_decode(path)
  if not dp then return false end
  local seg = string.match(dp, "([^/]+)$") or ""
  local ext = string.match(seg, "%.([^.]+)$")
  return ext ~= nil and ASSET[string.lower(ext)] == true
end

local function is_acme(path)
  local dp = percent_decode(path)
  return dp ~= nil and string.sub(dp, 1, 28) == "/.well-known/acme-challenge/"
end

function M.classify_name(method, path, query, has_pass)
  method = string.upper(method)
  local get_like = method == "GET" or method == "HEAD"
  if path == "" or string.sub(path, 1, 1) ~= "/" or #path > M.PATH_MAX or #query > M.QUERY_MAX then
    return "hold:waf"
  end
  if suspicious(path, query) then
    if get_like then return "handoff" end
    return "hold:waf"
  end
  if method == "OPTIONS" or (get_like and (is_asset(path) or is_acme(path))) then
    return "continue"
  end
  if has_pass then return "continue" end
  if get_like then return "handoff" end
  return "hold:needs_decision"
end

local function split_dots(s)
  local parts, start = {}, 1
  while true do
    local a, b = string.find(s, ".", start, true)
    if not a then
      parts[#parts + 1] = string.sub(s, start)
      break
    end
    parts[#parts + 1] = string.sub(s, start, a - 1)
    start = b + 1
  end
  return parts
end

local function join_dots(parts, n)
  local t = {}
  for i = 1, n do t[i] = parts[i] end
  return table.concat(t, ".")
end

local function finish(secret, message)
  return message .. "." .. b64url(hmac_sha256(secret, message))
end

function M.handoff_token(secret, site, host, path, query, ip, exp, nonce)
  local message = table.concat({
    "v1", "handoff", site,
    b64url(host), b64url(path), b64url(query), b64url(ip),
    tostring(exp), b64url(nonce),
  }, ".")
  return finish(secret, message)
end

function M.pass_token(secret, site, exp)
  return finish(secret, "v1.pass." .. site .. "." .. tostring(exp) .. ".allow")
end

local function hex_of(s)
  local t = {}
  for i = 1, #s do t[i] = string.format("%02x", string.byte(s, i)) end
  return table.concat(t)
end

function M.hex_sha256(msg)
  return hex_of(sha256(msg))
end

function M.hex_hmac(key, msg)
  return hex_of(hmac_sha256(key, msg))
end

local function fresh(exp, now, ttl)
  return exp > now and exp <= now + ttl + SKEW
end

local function mac_ok(secret, message, presented)
  return b64url(hmac_sha256(secret, message)) == presented
end

local function verify_pass(opts, token, now)
  local parts = split_dots(token)
  if #parts ~= 6 or parts[1] ~= "v1" or parts[2] ~= "pass" or parts[3] ~= opts.site_id or parts[5] ~= "allow" then
    return nil
  end
  local exp = tonumber(parts[4])
  if not exp or not fresh(exp, now, opts.pass_ttl or M.PASS_TTL) then return nil end
  if not mac_ok(opts.secret, join_dots(parts, 5), parts[6]) then return nil end
  return exp
end

local function split_pass(query)
  if query == "" then return nil, "" end
  local pass
  local rest = {}
  for pair in string.gmatch(query .. "&", "(.-)&") do
    local key, value = string.match(pair, "^([^=]*)=(.*)$")
    if not key then key = pair end
    if key == "ledgesec_pass" then
      if not pass then pass = value end
    else
      rest[#rest + 1] = pair
    end
  end
  return pass, table.concat(rest, "&")
end

local function random_nonce()
  local ok, random = pcall(require, "resty.random")
  if ok and random then
    local bytes = random.bytes(16, true)
    if bytes and #bytes == 16 then return bytes end
  end
  local f = io.open("/dev/urandom", "rb")
  if f then
    local raw = f:read(16)
    f:close()
    if raw and #raw == 16 then return raw end
  end
  error("ledgesec: no random source")
end

local function cookie(token, max_age, secure)
  local s = "ledgesec_pass=" .. token .. "; HttpOnly; SameSite=Lax; Path=/; Max-Age=" .. tostring(max_age)
  if secure then s = s .. "; Secure" end
  return s
end

-- What the customer server should do. kind is redirect, cookie, hold, or continue.
function M.customer(opts, req)
  local now = req.now
  local pass_ttl = opts.pass_ttl or M.PASS_TTL
  local handoff_ttl = opts.handoff_ttl or M.HANDOFF_TTL
  local query_pass, rest = split_pass(req.query or "")
  if query_pass and verify_pass(opts, query_pass, now) then
    local clean = opts.scheme .. "://" .. opts.host .. req.path
    if rest ~= "" then clean = clean .. "?" .. rest end
    return { kind = "cookie", location = clean, cookie = cookie(query_pass, pass_ttl, opts.scheme == "https") }
  end
  local pass_ok = req.pass_cookie and verify_pass(opts, req.pass_cookie, now) ~= nil
  local class = M.classify_name(req.method, req.path, rest, pass_ok)
  if class == "continue" then return { kind = "continue" } end
  if class == "hold:waf" then
    return { kind = "hold", reason = "waf", body = "This request does not continue to the origin." }
  end
  if class == "hold:needs_decision" then
    return {
      kind = "hold",
      reason = "needs_decision",
      body = "This request has no contour decision yet, so it does not continue to the origin.",
    }
  end
  local exp = now + handoff_ttl
  local token = M.handoff_token(opts.secret, opts.site_id, opts.host, req.path, rest, req.peer_ip, exp, random_nonce())
  local base = string.gsub(opts.contour, "/+$", "")
  return { kind = "redirect", location = base .. "/v1/gate?h=" .. token }
end

return M
