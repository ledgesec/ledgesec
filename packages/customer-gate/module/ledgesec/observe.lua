-- Observation only. log_by_lua pushes a short record into lua_shared_dict.
-- A worker timer POSTs the batch. The visitor request never opens a socket.
-- Query, body, Cookie, Authorization, and Referer are not part of the record.

local probes = require("ledgesec.probes")
local token = require("ledgesec.token")

local M = {}

M.DEFAULT_BASE = "https://dash.ledgesec.com"
M.INGEST_PATH = "/api/v1/observations"
M.PATH_MAX = 160
M.UA_MAX = 200
M.HOST_MAX = 253
M.BATCH_MAX = 1000
M.BATCH_MIN = 100
M.BODY_MAX = 900000
M.RING_MAX = 2000
M.FLUSH_WAIT_MS = 5000
M.ENV_FILE = "/etc/ledgesec/agent.env"

local ASSETS = {
  css = true, js = true, png = true, jpg = true, jpeg = true, gif = true,
  webp = true, ico = true, svg = true, woff = true, woff2 = true, map = true,
}

local cached

function M.clean_path(path)
  path = path or "/"
  local cut = string.find(path, "?", 1, true)
  if cut then path = string.sub(path, 1, cut - 1) end
  path = string.gsub(path, "%c", "")
  if path == "" then path = "/" end
  if #path > M.PATH_MAX then path = string.sub(path, 1, M.PATH_MAX) end
  return path
end

function M.route_group(path)
  if string.sub(path, 1, 5) == "/api/" or path == "/api" then return "api" end
  local ext = string.match(string.lower(path), "%.([a-z0-9]+)$")
  if ext and ASSETS[ext] then return "asset" end
  return "document"
end

function M.skip(path)
  return string.sub(path, 1, 28) == "/.well-known/acme-challenge/"
end

function M.is_probe(path)
  return probes.is_probe(string.lower(M.clean_path(path)))
end

function M.truncate(value, max)
  value = tostring(value or "")
  value = string.gsub(value, "%c", "")
  if #value > max then value = string.sub(value, 1, max) end
  return value
end

function M.method_name(value)
  value = string.upper(M.truncate(value or "GET", 16))
  if not string.match(value, "^[A-Z]+$") then return "GET" end
  return value
end

function M.decide(path, status, percent, roll)
  path = M.clean_path(path)
  status = tonumber(status) or 0
  if M.is_probe(path) or status >= 400 then
    return true, false
  end
  percent = tonumber(percent) or 1
  if percent < 0 then percent = 0 end
  if percent > 100 then percent = 100 end
  roll = tonumber(roll) or 100
  if roll <= percent then return true, true end
  return false, true
end

local function esc(value)
  value = tostring(value or "")
  value = string.gsub(value, "\\", "\\\\")
  value = string.gsub(value, '"', '\\"')
  return value
end

function M.event(req)
  local path = M.clean_path(req.path)
  if M.skip(path) then return nil end
  local ip = req.ip or ""
  if string.find(ip, "?", 1, true) or string.find(ip, "%c") or string.find(ip, '"', 1, true) then
    ip = ""
  end
  return {
    ts = tonumber(req.ts) or 0,
    method = M.method_name(req.method),
    path = path,
    route_group = M.route_group(path),
    status = tonumber(req.status) or 0,
    ip = ip,
    host = M.truncate(req.host or "", M.HOST_MAX),
    sampled = req.sampled == true,
    ua = M.truncate(req.ua or "", M.UA_MAX),
    bytes_sent = tonumber(req.bytes_sent) or 0,
    request_time_ms = tonumber(req.request_time_ms) or 0,
  }
end

function M.event_json(ev)
  local extra = ""
  if ev.ua and ev.ua ~= "" then
    extra = extra .. ',"ua":"' .. esc(ev.ua) .. '"'
  end
  if ev.bytes_sent and ev.bytes_sent > 0 then
    extra = extra .. ',"bytes_sent":' .. math.floor(ev.bytes_sent)
  end
  if ev.request_time_ms and ev.request_time_ms > 0 then
    extra = extra .. ',"request_time_ms":' .. math.floor(ev.request_time_ms)
  end
  return string.format(
    '{"ts":%d,"method":"%s","path":"%s","route_group":"%s","status":%d,"ip":"%s","host":"%s","sampled":%s%s}',
    math.floor(ev.ts),
    esc(ev.method),
    esc(ev.path),
    esc(ev.route_group),
    math.floor(ev.status),
    esc(ev.ip),
    esc(ev.host),
    ev.sampled and "true" or "false",
    extra
  )
end

function M.body(site_id, edge_id, events)
  local parts = {}
  for i, ev in ipairs(events) do
    if type(ev) == "string" then
      parts[i] = ev
    elseif ev.json then
      parts[i] = ev.json
    else
      parts[i] = M.event_json(ev)
    end
  end
  return string.format(
    '{"site_id":"%s","edge_id":"%s","events":[%s]}',
    esc(site_id), esc(edge_id or "module"), table.concat(parts, ",")
  )
end

function M.mac(secret, payload)
  return token.hex_hmac(secret, payload)
end

function M.ingest_url(value)
  if value == nil or value == "" then value = M.DEFAULT_BASE end
  if string.find(value, "/v1/observations", 1, true) then return value end
  if string.sub(value, -1) == "/" then value = string.sub(value, 1, -2) end
  return value .. M.INGEST_PATH
end

function M.parse_url(url)
  local scheme, host, port, path = string.match(url, "^(https?)://([^/:]+):?(%d*)(.*)$")
  if not host then return nil end
  if path == nil or path == "" then path = "/" end
  port = tonumber(port)
  if not port then port = scheme == "https" and 443 or 80 end
  return scheme, host, port, path
end

function M.http_ok(code)
  return type(code) == "number" and code >= 200 and code < 300
end

function M.read_env_file(text)
  local out = {}
  for line in string.gmatch(text or "", "[^\n]+") do
    if not string.match(line, "^%s*#") then
      local key, value = string.match(line, "^%s*([A-Za-z0-9_]+)%s*=%s*(.*)$")
      if key then
        value = string.gsub(value, "%s+$", "")
        if string.sub(value, 1, 1) == '"' and string.sub(value, -1) == '"' then
          value = string.sub(value, 2, -2)
        end
        out[key] = value
      end
    end
  end
  return out
end

function M.config_from(env)
  env = env or {}
  local percent = tonumber(env.LEDGESEC_SAMPLE_RATE) or 1
  local batch_max = tonumber(env.LEDGESEC_BATCH_MAX) or M.BATCH_MAX
  if batch_max < 1 then batch_max = 1 end
  if batch_max > M.BATCH_MAX then batch_max = M.BATCH_MAX end
  return {
    site_id = env.LEDGESEC_SITE_ID or "",
    edge_id = env.LEDGESEC_EDGE_ID or "module",
    secret = env.LEDGESEC_INGEST_SECRET or "",
    url = M.ingest_url(env.LEDGESEC_INGEST_URL or env.LEDGESEC_CONTOUR),
    sample_percent = percent,
    batch_min = tonumber(env.LEDGESEC_BATCH_MIN) or M.BATCH_MIN,
    batch_max = batch_max,
  }
end

function M.admit(items, record, cap)
  if not record then return items end
  cap = cap or M.RING_MAX
  local priority = record.sampled and "sample" or "keep"
  while #items >= cap do
    if priority == "sample" then return items end
    local evicted = false
    for i, item in ipairs(items) do
      if item.priority == "sample" then
        table.remove(items, i)
        evicted = true
        break
      end
    end
    if not evicted then table.remove(items, 1) end
  end
  items[#items + 1] = { priority = priority, json = M.event_json(record), ts = record.ts }
  return items
end

function M.should_send(items, min_count, now_ms, wait_ms)
  if not items or #items == 0 then return false end
  if #items >= min_count then return true end
  for _, item in ipairs(items) do
    if item.priority == "keep" then return true end
  end
  local oldest = items[1].ts or 0
  return (tonumber(now_ms) or 0) - oldest >= (tonumber(wait_ms) or M.FLUSH_WAIT_MS)
end

function M.collect(get, head, tail, max_n, max_bytes)
  local items = {}
  local last = head
  local bytes = 64
  local i = head
  while i < tail and #items < max_n do
    i = i + 1
    local raw = get(i)
    if not raw then
      if #items == 0 then last = i end
    else
      local json = string.sub(raw, 2)
      local add = #json + 1
      if #items > 0 and bytes + add > max_bytes then break end
      items[#items + 1] = {
        priority = string.sub(raw, 1, 1) == "K" and "keep" or "sample",
        json = json,
        id = i,
        ts = tonumber(string.match(json, '"ts":(%d+)')) or 0,
      }
      bytes = bytes + add
      last = i
    end
  end
  return items, last
end

local function load_file(path)
  local handle = io.open(path, "r")
  if not handle then return "" end
  local text = handle:read("*a")
  handle:close()
  return text or ""
end

function M.load_config()
  local env = {}
  local names = {
    "LEDGESEC_INGEST_SECRET", "LEDGESEC_SITE_ID", "LEDGESEC_EDGE_ID",
    "LEDGESEC_INGEST_URL", "LEDGESEC_CONTOUR", "LEDGESEC_SAMPLE_RATE",
    "LEDGESEC_BATCH_MIN", "LEDGESEC_BATCH_MAX",
  }
  for _, name in ipairs(names) do
    local value = os.getenv(name)
    if value and value ~= "" then env[name] = value end
  end
  if not env.LEDGESEC_INGEST_SECRET then
    local file_env = M.read_env_file(load_file(os.getenv("LEDGESEC_ENV_FILE") or M.ENV_FILE))
    for key, value in pairs(file_env) do
      if not env[key] or env[key] == "" then env[key] = value end
    end
  end
  return M.config_from(env)
end

local function dict_get(dict, key)
  if not dict then return nil end
  return dict:get(key)
end

local function drop_sampled(dict, head, tail)
  local index = head
  while index < tail do
    index = index + 1
    local raw = dict:get("i:" .. index)
    if raw and string.sub(raw, 1, 1) == "S" then
      dict:delete("i:" .. index)
      dict:incr("live", -1, 0)
      return true
    end
  end
  return false
end

local function drop_oldest(dict, head, tail)
  local index = head
  while index < tail do
    index = index + 1
    local raw = dict:get("i:" .. index)
    if raw then
      dict:delete("i:" .. index)
      dict:incr("live", -1, 0)
      return true
    end
  end
  return false
end

function M.note()
  if type(ngx) ~= "table" or not cached then return end
  local cfg = cached
  if cfg.secret == "" or cfg.site_id == "" then return end
  local uri = ngx.var.uri or "/"
  if M.skip(M.clean_path(uri)) then return end
  local status = ngx.status or 0
  local keep, sampled = M.decide(uri, status, cfg.sample_percent, math.random(1, 100))
  if not keep then return end
  local request_time = tonumber(ngx.var.request_time) or 0
  local record = M.event({
    path = uri,
    method = ngx.var.request_method,
    status = status,
    ts = math.floor((ngx.now() or 0) * 1000),
    ip = ngx.var.remote_addr or "",
    host = ngx.var.host or "",
    ua = ngx.var.http_user_agent or "",
    bytes_sent = ngx.var.bytes_sent,
    request_time_ms = math.floor(request_time * 1000),
    sampled = sampled,
  })
  if not record then return end
  local dict = ngx.shared.ledgesec_observe
  if not dict then return end
  local head = dict_get(dict, "head") or 0
  local tail = dict_get(dict, "tail") or 0
  local live = dict_get(dict, "live") or 0
  if live >= M.RING_MAX then
    if record.sampled then return end
    if not drop_sampled(dict, head, tail) then
      drop_oldest(dict, head, tail)
    end
  end
  local n = dict:incr("tail", 1, 0)
  if not n then return end
  local prefix = record.sampled and "S" or "K"
  local payload = prefix .. M.event_json(record)
  local ok = dict:set("i:" .. n, payload, 300)
  if not ok then
    if record.sampled then return end
    drop_oldest(dict, head, n)
    if not dict:set("i:" .. n, payload, 300) then return end
  end
  dict:incr("live", 1, 0)
end

local function post(url, payload, mac)
  local scheme, host, port, path = M.parse_url(url)
  if not host then return nil end
  local sock = ngx.socket.tcp()
  sock:settimeout(3000)
  local connected = sock:connect(host, port)
  if not connected then
    sock:close()
    return nil
  end
  if scheme == "https" then
    local shaken = sock:sslhandshake(nil, host, true)
    if not shaken then
      sock:close()
      return nil
    end
  end
  local req = table.concat({
    "POST ", path, " HTTP/1.1\r\n",
    "Host: ", host, "\r\n",
    "Content-Type: application/json\r\n",
    "X-Ledgesec-Mac: ", mac, "\r\n",
    "Content-Length: ", tostring(#payload), "\r\n",
    "Connection: close\r\n\r\n",
    payload,
  })
  local sent = sock:send(req)
  if not sent then
    sock:close()
    return nil
  end
  local status_line = sock:receive("*l")
  sock:close()
  return tonumber(string.match(status_line or "", " (%d%d%d)"))
end

function M.flush()
  if not cached then return end
  local cfg = cached
  if cfg.secret == "" or cfg.site_id == "" then return end
  local dict = ngx.shared.ledgesec_observe
  if not dict then return end
  local head = dict:get("head") or 0
  local tail = dict:get("tail") or 0
  local items, last = M.collect(function(i) return dict:get("i:" .. i) end, head, tail, cfg.batch_max, M.BODY_MAX)
  local now_ms = math.floor((ngx.now() or 0) * 1000)
  if not M.should_send(items, cfg.batch_min, now_ms, M.FLUSH_WAIT_MS) then return end
  local payload = M.body(cfg.site_id, cfg.edge_id, items)
  local code = post(cfg.url, payload, M.mac(cfg.secret, payload))
  if not M.http_ok(code) then return end
  local index = head
  while index < last do
    index = index + 1
    if dict:get("i:" .. index) then
      dict:delete("i:" .. index)
      dict:incr("live", -1, 0)
    end
  end
  dict:set("head", last)
end

function M.start()
  if type(ngx) ~= "table" then return end
  if cached == nil then
    cached = M.load_config()
    math.randomseed(math.floor((ngx.now() or 0) * 1000) + (ngx.worker.pid() or 0))
  end
  if ngx.worker.id() ~= 0 then return end
  if cached.secret == "" or cached.site_id == "" then
    ngx.log(ngx.ERR, "ledgesec observe is not configured")
    return
  end
  local ok = ngx.timer.every(1, function(premature)
    if premature then return end
    local fine = pcall(M.flush)
    if not fine then ngx.log(ngx.ERR, "ledgesec observe flush failed") end
  end)
  if not ok then ngx.log(ngx.ERR, "ledgesec observe timer failed") end
end

return M
