-- Generated from api/app/observation/markers.py. Do not edit.
local M = {}

local rules = {
  {
    exact = { "/.env" },
    prefixes = { "/.env.", "/.env/", "/.env-" },
    suffixes = { "/.env", "/.env~", "/sendgrid.env", "/config.env", "/env.js", "/env.txt", "/env-config.js", "/credentials.env", "/secrets.env", "/secret.env", "/.env0", "/.env1", "/.env2", "/.env3", "/.env4", "/.env5", "/.env6", "/.env7", "/.env8", "/.env9", "/.env_copy", "/_environment" },
    contains = { "/.env.", "/.env/", "/.env_" },
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
    contains = { "/.git/" },
  },
  {
    exact = { "/.svn" },
    prefixes = { "/.svn/" },
    suffixes = {  },
    contains = { "/.svn/" },
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
    contains = { "/config/database.php", "/config/app.php" },
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
    contains = { "/docker-compose." },
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
    prefixes = { "/.claude/", "/.continue/", "/.vscode/" },
    suffixes = { "/mcp.json", "/sftp.json", "/sftp-config.json" },
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
  {
    exact = {  },
    prefixes = { "/wp-", "/wordpress/", "/uploads/" },
    suffixes = {  },
    contains = {  },
  },
  {
    exact = { "/wk/index.php" },
    prefixes = {  },
    suffixes = { "/222.php", "/ms-edit.php", "/defaults.php", "/classwithtostring.php", "/chosen.php", "/autoload_classmap.php", "/kbfr.php", "/sf.php", "/class-t.api.php", "/goods.php", "/adminfuns.php", "/file.php", "/about.php", "/as.php", "/abcd.php", "/abc.php", "/404.php", "/ws.php", "/randkeyword.php7", "/function.php", "/an.php", "/themes.php", "/cache.php", "/admin.php", "/rip.php", "/ioxi-o.php", "/inputs.php", "/bless.php", "/bolt.php", "/manager.php", "/wp.php", "/edit.php", "/2p.update.php", "/2p.php", "/csss.php", "/hp2.php", "/worksec.php", "/theme.php", "/samll.php", "/mh.php", "/lufizz.php", "/hh.php", "/gulu.php", "/fpwch.php", "/file5.php", "/fff.php", "/f.php", "/em.php", "/default.php", "/bavbdb.php", "/anom.php", "/6.php", "/002.php", "/0-9.php", "/.ww.php", "/xyn.php", "/term.php", "/readme.php", "/opomo.php", "/jpg.php", "/go.php", "/a.php", "/tdn_up.php", "/plugin-bridge.php", "/lufix.php", "/jaw.php", "/sallu.php", "/dex.php", "/component.php", "/das.php", "/cdc.php", "/kir.php", "/dsa.php", "/bnmtp.php", "/opsh.php", "/motu.php", "/min.php", "/init-notica.php", "/sm.php", "/ebkid.php", "/ai.php", "/fferr.php", "/403.php", "/1.php", "/txets.php", "/wp_blog_footer.php", "/php8.php", "/hplfuns.php", "/xl9.php" },
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
