-- Observation only. The request already continued to the origin.
-- This module never redirects and never returns a status.
-- Query, body, and Cookie are not part of the record.

local token = require("ledgesec.token")

local M = {}

local ASSETS = {
  css = true, js = true, png = true, jpg = true, jpeg = true, gif = true,
  webp = true, ico = true, svg = true, woff = true, woff2 = true, map = true,
}

function M.clean_path(path)
  path = path or "/"
  local cut = string.find(path, "?", 1, true)
  if cut then path = string.sub(path, 1, cut - 1) end
  path = string.gsub(path, "%c", "")
  if path == "" then path = "/" end
  if #path > 160 then path = string.sub(path, 1, 160) end
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

function M.event(req)
  local path = M.clean_path(req.path)
  if M.skip(path) then return nil end
  local ip = req.ip or ""
  if string.find(ip, "?", 1, true) or string.find(ip, "%c") then ip = "" end
  return {
    ts = tonumber(req.ts) or 0,
    path = path,
    route_group = M.route_group(path),
    ip = ip,
  }
end

local function esc(value)
  value = tostring(value or "")
  value = string.gsub(value, "\\", "\\\\")
  value = string.gsub(value, '"', '\\"')
  return value
end

function M.event_json(ev)
  return string.format(
    '{"ts":%d,"path":"%s","route_group":"%s","ip":"%s"}',
    ev.ts, esc(ev.path), esc(ev.route_group), esc(ev.ip)
  )
end

function M.body(site_id, edge_id, events)
  local parts = {}
  for i, ev in ipairs(events) do
    parts[i] = M.event_json(ev)
  end
  return string.format(
    '{"site_id":"%s","edge_id":"%s","events":[%s]}',
    esc(site_id), esc(edge_id or "module"), table.concat(parts, ",")
  )
end

function M.mac(secret, body)
  return token.hex_hmac(secret, body)
end

local function flush(premature, opts)
  if premature then return end
  local dict = ngx.shared.ledgesec_observe
  if not dict then return end
  local n = dict:get("n") or 0
  local sent = dict:get("sent") or 0
  local events = {}
  local last = sent
  while last < n and #events < 50 do
    last = last + 1
    local raw = dict:get("e:" .. last)
    dict:delete("e:" .. last)
    if raw then events[#events + 1] = raw end
  end
  dict:set("sent", last)
  dict:delete("flushing")
  if #events == 0 then return end
  local payload = string.format(
    '{"site_id":"%s","edge_id":"module","events":[%s]}',
    esc(opts.site_id), table.concat(events, ",")
  )
  local mac = M.mac(opts.secret, payload)
  local https, host, port, path = string.match(opts.contour, "^(https?)://([^/:]+):?(%d*)(.*)$")
  if not host then return end
  if path == nil or path == "" then path = "" end
  port = tonumber(port)
  if not port then port = https == "https" and 443 or 80 end
  local sock = ngx.socket.tcp()
  sock:settimeout(2000)
  local ok = sock:connect(host, port)
  if not ok then return end
  if https == "https" then
    local shaken = sock:sslhandshake(nil, host, false)
    if not shaken then
      sock:close()
      return
    end
  end
  local req = table.concat({
    "POST " .. path .. "/v1/observations HTTP/1.1\r\n",
    "Host: " .. host .. "\r\n",
    "Content-Type: application/json\r\n",
    "X-Ledgesec-Mac: " .. mac .. "\r\n",
    "Content-Length: " .. #payload .. "\r\n",
    "Connection: close\r\n\r\n",
    payload,
  })
  sock:send(req)
  sock:receive("*a")
  sock:close()
end

function M.note(opts)
  if type(ngx) ~= "table" then return end
  if not opts or not opts.secret or opts.secret == "" or not opts.site_id or opts.site_id == "" or not opts.contour then
    return
  end
  local ev = M.event({
    path = ngx.var.uri or "/",
    ts = math.floor((ngx.now() or 0) * 1000),
    ip = ngx.var.remote_addr or "",
  })
  if not ev then return end
  local dict = ngx.shared.ledgesec_observe
  if not dict then return end
  local n = dict:incr("n", 1, 0)
  if not n then return end
  dict:set("e:" .. n, M.event_json(ev), 60)
  if dict:add("flushing", true, 2) then
    ngx.timer.at(1, flush, opts)
  end
end

return M
