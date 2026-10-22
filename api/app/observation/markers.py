import hashlib
import re
from contextvars import ContextVar, Token
from dataclasses import dataclass


@dataclass(frozen=True)
class Marker:
    code: str
    label: str


@dataclass(frozen=True)
class ProbeRule:
    code: str
    label: str
    exact: tuple[str, ...] = ()
    prefixes: tuple[str, ...] = ()
    suffixes: tuple[str, ...] = ()
    contains: tuple[str, ...] = ()

    def matches(self, path: str) -> bool:
        return (
            path in self.exact
            or any(path.startswith(prefix) for prefix in self.prefixes)
            or any(path.endswith(suffix) for suffix in self.suffixes)
            or any(piece in path for piece in self.contains)
        )


RULES = (
    ProbeRule(
        "env",
        "Secret file",
        exact=("/.env",),
        prefixes=("/.env.", "/.env/", "/.env-"),
        suffixes=(
            "/.env",
            "/.env~",
            "/sendgrid.env",
            "/config.env",
            "/env.js",
            "/env.txt",
            "/env-config.js",
            "/credentials.env",
            "/secrets.env",
            "/secret.env",
            "/.env0",
            "/.env1",
            "/.env2",
            "/.env3",
            "/.env4",
            "/.env5",
            "/.env6",
            "/.env7",
            "/.env8",
            "/.env9",
            "/.env_copy",
            "/_environment",
        ),
        contains=("/.env.", "/.env/"),
    ),
    ProbeRule("secrets", "Secret file", suffixes=("/secrets.json", "/auth.json")),
    ProbeRule("htaccess", "Server file", prefixes=("/.htaccess", "/.htpasswd")),
    ProbeRule(
        "git",
        "Source checkout",
        exact=("/.git",),
        prefixes=("/.git/",),
        suffixes=("/.git-credentials", "/.gitmodules"),
    ),
    ProbeRule("svn", "Source checkout", exact=("/.svn",), prefixes=("/.svn/",)),
    ProbeRule(
        "aws",
        "Cloud key",
        exact=("/.aws",),
        prefixes=("/.aws/",),
        suffixes=(
            "/.boto",
            "/.s3cfg",
            "/.amplifyrc",
            "/credentials.json",
            "/credentials.ini",
            "/aws-exports.js",
            "/aws-exports.json",
            "/config/aws.yml",
            "/config/aws.yaml",
            "/config/aws.php",
            "/config/aws.json",
            "/config/azure.php",
            "/azure/config.json",
            "/bedrock/config.json",
            "/gcloud-service-key.json",
            "/service-account.json",
            "/serviceaccount.json",
            "/application_default_credentials.json",
            "/firebase-adminsdk.json",
            "/firebase-key.json",
            "/google-credentials.json",
            "/google-key.json",
            "/gcp-credentials.json",
            "/gcp-key.json",
            "/gcp-sa.json",
            "/keyfile.json",
            "/key.json",
            "/sa.json",
        ),
        contains=(
            "/.aws/",
            "/.config/gcloud/",
            "/latest/meta-data/",
            "firebase-adminsdk",
        ),
    ),
    ProbeRule("wp-config", "Config file", contains=("/wp-config.php",)),
    ProbeRule("appsettings", "Config file", contains=("/appsettings.",)),
    ProbeRule(
        "spring",
        "Config file",
        contains=(
            "/application.yml",
            "/application.yaml",
            "/application.properties",
            "/application-prod.",
            "/application-dev.",
            "/application-test.",
            "/application-local.",
        ),
    ),
    ProbeRule("configuration", "Config file", contains=("/configuration.php",)),
    ProbeRule(
        "config-bak",
        "Config file",
        contains=("/config.php.bak", "/config.php.old", "/config.php.save", "/config.php.swp", "/config.php~"),
    ),
    ProbeRule(
        "docker",
        "Config file",
        prefixes=("/.docker/",),
        suffixes=("/.npmrc", "/docker-compose.yml"),
    ),
    ProbeRule("wp-login", "Login probe", suffixes=("/wp-login.php",)),
    ProbeRule("xmlrpc", "Login probe", suffixes=("/xmlrpc.php",)),
    ProbeRule("phpmyadmin", "Database tool", contains=("phpmyadmin",)),
    ProbeRule("adminer", "Database tool", suffixes=("/adminer.php",)),
    ProbeRule(
        "server-status",
        "Server status",
        exact=("/server-status",),
        prefixes=("/server-status/",),
        suffixes=("/server-status.php", "/server-info.php"),
    ),
    ProbeRule("actuator", "Debug endpoint", exact=("/actuator",), prefixes=("/actuator/",)),
    ProbeRule("cgi-bin", "Old script path", exact=("/cgi-bin",), prefixes=("/cgi-bin/",)),
    ProbeRule("phpunit", "Test tool", contains=("/vendor/phpunit",)),
    ProbeRule("ds-store", "Hidden file", suffixes=("/.ds_store",)),
    ProbeRule("key", "Private key", suffixes=("/id_rsa", "/id_rsa.pub", "/.pem")),
    ProbeRule("sql", "Database dump", suffixes=(".sql.gz", ".sql")),
    ProbeRule(
        "pipeline",
        "Pipeline file",
        suffixes=("/.gitlab-ci.yml",),
        contains=("/.github/workflows/",),
    ),
    ProbeRule(
        "editor",
        "Editor config",
        exact=("/mcp.json",),
        prefixes=("/.claude/", "/.continue/"),
        suffixes=("/mcp.json",),
    ),
    ProbeRule(
        "phpinfo",
        "Debug endpoint",
        exact=("/_profiler", "/info", "/phpinfo"),
        prefixes=("/_profiler/",),
        suffixes=(
            "/phpinfo.php",
            "/info.php",
            "/wp-content/debug.log",
            "/info.php.bak",
            "/php-info.php",
            "/phpversion.php",
            "/debug.php",
            "/pinfo.php",
            "/pi.php",
            "/i.php",
            "/p.php",
            "/php.php",
            "/test.php",
        ),
        contains=("phpinfo",),
    ),
    ProbeRule("log", "Log file", suffixes=("/laravel.log",), contains=("/storage/logs/",)),
    ProbeRule(
        "llm",
        "Secret file",
        suffixes=("/ai/credentials", "/llm/credentials", "/claude/config.json", "/anthropic/config.json"),
        contains=("/ai/config.",),
    ),
    ProbeRule(
        "composer",
        "Package manifest",
        suffixes=("/vendor/composer/installed.json",),
        contains=("/composer.lock",),
    ),
)


EXACT = "exact"
PREFIX = "prefix"
SUFFIX = "suffix"
CONTAINS = "contains"
KINDS = (EXACT, PREFIX, SUFFIX, CONTAINS)
PATTERN_LIMIT = 200
CODE_LIMIT = 40
LABEL_LIMIT = 40

_CODE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_bound: ContextVar[tuple[ProbeRule, ...] | None] = ContextVar("probe_rules", default=None)


def bind_rules(rules: tuple[ProbeRule, ...] | None) -> Token:
    return _bound.set(rules)


def reset_rules(token: Token) -> None:
    _bound.reset(token)


def rule_id(kind: str, pattern: str) -> str:
    return hashlib.sha256(f"{kind}\n{pattern}".encode()).hexdigest()[:16]


def as_rule(code: str, label: str, kind: str, pattern: str) -> ProbeRule:
    if kind == EXACT:
        return ProbeRule(code, label, exact=(pattern,))
    if kind == PREFIX:
        return ProbeRule(code, label, prefixes=(pattern,))
    if kind == SUFFIX:
        return ProbeRule(code, label, suffixes=(pattern,))
    return ProbeRule(code, label, contains=(pattern,))


def pattern_rows(rules: tuple[ProbeRule, ...] = RULES) -> list[dict]:
    rows = []
    for rule in rules:
        groups = (
            (EXACT, rule.exact),
            (PREFIX, rule.prefixes),
            (SUFFIX, rule.suffixes),
            (CONTAINS, rule.contains),
        )
        for kind, patterns in groups:
            for pattern in patterns:
                rows.append(
                    {
                        "id": rule_id(kind, pattern),
                        "code": rule.code,
                        "label": rule.label,
                        "kind": kind,
                        "pattern": pattern,
                        "custom": False,
                    }
                )
    return rows


def slug(label: str) -> str:
    parts = re.sub(r"[^a-z0-9]+", "-", label.strip().lower()).strip("-")
    return parts[:CODE_LIMIT]


def prepare(code: str, label: str, kind: str, pattern: str) -> tuple[str, str, str, str]:
    text = " ".join(label.split())
    name = code.strip().lower() or slug(text)
    value = pattern.strip().lower()
    if kind not in KINDS or text == "" or len(text) > LABEL_LIMIT:
        raise ValueError("bad_rule")
    if name == "" or len(name) > CODE_LIMIT or _CODE.fullmatch(name) is None:
        raise ValueError("bad_rule")
    if value == "" or len(value) > PATTERN_LIMIT or any(char.isspace() for char in value):
        raise ValueError("bad_rule")
    return name, text, kind, value


def classify(path: str) -> Marker | None:
    value = str(path or "").lower()
    rules = _bound.get()
    if rules is None:
        rules = RULES
    for rule in rules:
        if rule.matches(value):
            return Marker(rule.code, rule.label)
    return None


def marker_body(path: str) -> dict | None:
    found = classify(path)
    if found is None:
        return None
    return {"code": found.code, "label": found.label}
