-- Generated from api/app/observation/markers.py. Do not edit.
local M = {}

local rules = {
  {
    exact = { "/.env" },
    prefixes = { "/.env.", "/.env/", "/.env-" },
    suffixes = { "/.env", "/.env~", "/sendgrid.env", "/config.env", "/env.js", "/env.txt", "/env-config.js", "/credentials.env", "/secrets.env", "/secret.env", "/.env0", "/.env1", "/.env2", "/.env3", "/.env4", "/.env5", "/.env6", "/.env7", "/.env8", "/.env9", "/.env_copy", "/_environment" },
    contains = { "/.env.", "/.env/" },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/secrets.json", "/auth.json" },
    contains = {  },
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
    suffixes = { "/.git-credentials", "/.gitmodules" },
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
    suffixes = { "/.boto", "/.s3cfg", "/.amplifyrc", "/credentials.json", "/credentials.ini", "/aws-exports.js", "/aws-exports.json", "/config/aws.yml", "/config/aws.yaml", "/config/aws.php", "/config/aws.json", "/config/azure.php", "/azure/config.json", "/bedrock/config.json", "/gcloud-service-key.json", "/service-account.json", "/serviceaccount.json", "/application_default_credentials.json", "/firebase-adminsdk.json", "/firebase-key.json", "/google-credentials.json", "/google-key.json", "/gcp-credentials.json", "/gcp-key.json", "/gcp-sa.json", "/keyfile.json", "/key.json", "/sa.json" },
    contains = { "/.aws/", "/.config/gcloud/", "/latest/meta-data/", "firebase-adminsdk" },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = {  },
    contains = { "/wp-config.php" },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = {  },
    contains = { "/appsettings." },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = {  },
    contains = { "/application.yml", "/application.yaml", "/application.properties", "/application-prod.", "/application-dev.", "/application-test.", "/application-local." },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = {  },
    contains = { "/configuration.php" },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = {  },
    contains = { "/config.php.bak", "/config.php.old", "/config.php.save", "/config.php.swp", "/config.php~" },
  },
  {
    exact = {  },
    prefixes = { "/.docker/" },
    suffixes = { "/.npmrc", "/docker-compose.yml" },
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
    suffixes = { "/server-status.php", "/server-info.php" },
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
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/.gitlab-ci.yml" },
    contains = { "/.github/workflows/" },
  },
  {
    exact = { "/mcp.json" },
    prefixes = { "/.claude/", "/.continue/" },
    suffixes = { "/mcp.json" },
    contains = {  },
  },
  {
    exact = { "/_profiler", "/info", "/phpinfo" },
    prefixes = { "/_profiler/" },
    suffixes = { "/phpinfo.php", "/info.php", "/wp-content/debug.log", "/info.php.bak", "/php-info.php", "/phpversion.php", "/debug.php", "/pinfo.php", "/pi.php", "/i.php", "/p.php", "/php.php", "/test.php" },
    contains = { "phpinfo" },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/laravel.log" },
    contains = { "/storage/logs/" },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/ai/credentials", "/llm/credentials", "/claude/config.json", "/anthropic/config.json" },
    contains = { "/ai/config." },
  },
  {
    exact = {  },
    prefixes = {  },
    suffixes = { "/vendor/composer/installed.json" },
    contains = { "/composer.lock" },
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
