-- Generated from api/app/observation/markers.py. Do not edit.
local M = {}

local rules = {
  {
    exact = { "/.env" },
    prefixes = { "/.env.", "/.env/" },
    suffixes = { "/.env" },
    contains = { "/.env.", "/.env/" },
  },
  {
    exact = {  },
    prefixes = { "/.htaccess", "/.htpasswd" },
    suffixes = {  },
    contains = {  },
  },
  {
    exact = { "/.git" },
    prefixes = { "/.git/" },
    suffixes = {  },
    contains = {  },
  },
  {
    exact = { "/.svn" },
    prefixes = { "/.svn/" },
    suffixes = {  },
    contains = {  },
  },
  {
    exact = { "/.aws" },
    prefixes = { "/.aws/" },
    suffixes = {  },
    contains = {  },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/wp-config.php" },
    contains = {  },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/wp-login.php" },
    contains = {  },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/xmlrpc.php" },
    contains = {  },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = {  },
    contains = { "phpmyadmin" },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/adminer.php" },
    contains = {  },
  },
  {
    exact = { "/server-status" },
    prefixes = { "/server-status/" },
    suffixes = {  },
    contains = {  },
  },
  {
    exact = { "/actuator" },
    prefixes = { "/actuator/" },
    suffixes = {  },
    contains = {  },
  },
  {
    exact = { "/cgi-bin" },
    prefixes = { "/cgi-bin/" },
    suffixes = {  },
    contains = {  },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = {  },
    contains = { "/vendor/phpunit" },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/.ds_store" },
    contains = {  },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/id_rsa", "/id_rsa.pub", "/.pem" },
    contains = {  },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { ".sql.gz", ".sql" },
    contains = {  },
  },
}

local function has_prefix(path, prefix)
  return string.sub(path, 1, #prefix) == prefix
end

local function has_suffix(path, suffix)
  return #path >= #suffix and string.sub(path, -#suffix) == suffix
end

function M.is_probe(path)
  path = string.lower(path or "")
  for _, rule in ipairs(rules) do
    for _, item in ipairs(rule.exact) do
      if path == item then return true end
    end
    for _, item in ipairs(rule.prefixes) do
      if has_prefix(path, item) then return true end
    end
    for _, item in ipairs(rule.suffixes) do
      if has_suffix(path, item) then return true end
    end
    for _, item in ipairs(rule.contains) do
      if string.find(path, item, 1, true) then return true end
    end
  end
  return false
end

return M
