-- OpenResty adapter. Return without exiting and nginx continues to the application.
-- A redirect or a 403 never reaches proxy_pass.

local token = require("ledgesec.token")

local M = {}

function M.access(opts)
  if not opts or not opts.secret or opts.secret == "" then
    ngx.status = 500
    ngx.header["Content-Type"] = "text/plain; charset=utf-8"
    ngx.header["X-Ledgesec-Reason"] = "config"
    ngx.say("Ledgesec gate has no site secret.")
    return ngx.exit(500)
  end
  local request_uri = ngx.var.request_uri or "/"
  local path, query = string.match(request_uri, "^([^?]*)%??(.*)$")
  if path == nil or path == "" then path = "/" end
  local step = token.customer(opts, {
    method = ngx.req.get_method(),
    path = path,
    query = query or "",
    peer_ip = ngx.var.remote_addr or "",
    pass_cookie = ngx.var.cookie_ledgesec_pass,
    now = ngx.time(),
  })
  ngx.header["Cache-Control"] = "no-store"
  ngx.header["Referrer-Policy"] = "no-referrer"
  if step.kind == "continue" then
    return
  end
  if step.kind == "redirect" or step.kind == "cookie" then
    if step.cookie then ngx.header["Set-Cookie"] = step.cookie end
    return ngx.redirect(step.location, 302)
  end
  ngx.status = 403
  ngx.header["Content-Type"] = "text/plain; charset=utf-8"
  ngx.header["X-Ledgesec-Reason"] = step.reason or "needs_decision"
  ngx.say(step.body or "This request does not continue to the origin.")
  return ngx.exit(403)
end

return M
