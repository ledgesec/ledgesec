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
        contains=("/.env.", "/.env/", "/.env_"),
    ),
    ProbeRule("secrets", "Secret file", suffixes=("/secrets.json", "/auth.json")),
    ProbeRule("htaccess", "Server file", prefixes=("/.htaccess", "/.htpasswd")),
    ProbeRule(
        "git",
        "Source checkout",
        exact=("/.git",),
        prefixes=("/.git/",),
        suffixes=("/.git-credentials", "/.gitmodules"),
        contains=("/.git/",),
    ),
    ProbeRule("svn", "Source checkout", exact=("/.svn",), prefixes=("/.svn/",), contains=("/.svn/",)),
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
    ProbeRule("laravel-config", "Config file", contains=("/config/database.php", "/config/app.php")),
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
        contains=("/docker-compose.",),
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
        prefixes=("/.claude/", "/.continue/", "/.vscode/"),
        suffixes=("/mcp.json", "/sftp.json", "/sftp-config.json"),
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
    ProbeRule(
        "wordpress",
        "WordPress path",
        prefixes=("/wp-", "/wordpress/", "/uploads/"),
    ),
    ProbeRule(
        "shell",
        "Web shell",
        exact=("/wk/index.php",),
        suffixes=(
            "/222.php",
            "/ms-edit.php",
            "/defaults.php",
            "/classwithtostring.php",
            "/chosen.php",
            "/autoload_classmap.php",
            "/kbfr.php",
            "/sf.php",
            "/class-t.api.php",
            "/goods.php",
            "/adminfuns.php",
            "/file.php",
            "/about.php",
            "/as.php",
            "/abcd.php",
            "/abc.php",
            "/404.php",
            "/ws.php",
            "/randkeyword.php7",
            "/function.php",
            "/an.php",
            "/themes.php",
            "/cache.php",
            "/admin.php",
            "/rip.php",
            "/ioxi-o.php",
            "/inputs.php",
            "/bless.php",
            "/bolt.php",
            "/manager.php",
            "/wp.php",
            "/edit.php",
            "/2p.update.php",
            "/2p.php",
            "/csss.php",
            "/hp2.php",
            "/worksec.php",
            "/theme.php",
            "/samll.php",
            "/mh.php",
            "/lufizz.php",
            "/hh.php",
            "/gulu.php",
            "/fpwch.php",
            "/file5.php",
            "/fff.php",
            "/f.php",
            "/em.php",
            "/default.php",
            "/bavbdb.php",
            "/anom.php",
            "/6.php",
            "/002.php",
            "/0-9.php",
            "/.ww.php",
            "/xyn.php",
            "/term.php",
            "/readme.php",
            "/opomo.php",
            "/jpg.php",
            "/go.php",
            "/a.php",
            "/tdn_up.php",
            "/plugin-bridge.php",
            "/lufix.php",
            "/jaw.php",
            "/sallu.php",
            "/dex.php",
            "/component.php",
            "/das.php",
            "/cdc.php",
            "/kir.php",
            "/dsa.php",
            "/bnmtp.php",
            "/opsh.php",
            "/motu.php",
            "/min.php",
            "/init-notica.php",
            "/sm.php",
            "/ebkid.php",
            "/ai.php",
            "/fferr.php",
            "/403.php",
            "/1.php",
            "/txets.php",
            "/wp_blog_footer.php",
            "/php8.php",
            "/hplfuns.php",
            "/xl9.php",
        ),
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


@dataclass(frozen=True)
class _Hit:
    order: int
    code: str
    label: str


@dataclass(frozen=True)
class _Index:
    exact: dict[str, _Hit]
    prefixes: tuple[tuple[str, _Hit], ...]
    prefix_patterns: tuple[str, ...]
    suffixes: tuple[tuple[str, _Hit], ...]
    suffix_patterns: tuple[str, ...]
    contains: tuple[tuple[str, _Hit], ...]


def _build_index(rules: tuple[ProbeRule, ...]) -> _Index:
    exact: dict[str, _Hit] = {}
    prefixes: list[tuple[str, _Hit]] = []
    suffixes: list[tuple[str, _Hit]] = []
    contains: list[tuple[str, _Hit]] = []
    for order, rule in enumerate(rules):
        hit = _Hit(order, rule.code, rule.label)
        for pattern in rule.exact:
            exact.setdefault(pattern, hit)
        prefixes.extend((pattern, hit) for pattern in rule.prefixes)
        suffixes.extend((pattern, hit) for pattern in rule.suffixes)
        contains.extend((pattern, hit) for pattern in rule.contains)
    return _Index(
        exact,
        tuple(prefixes),
        tuple(pattern for pattern, _hit in prefixes),
        tuple(suffixes),
        tuple(pattern for pattern, _hit in suffixes),
        tuple(contains),
    )


_indexed: ContextVar[tuple[ProbeRule, ...] | None] = ContextVar("probe_index_rules", default=None)
_index: ContextVar[_Index | None] = ContextVar("probe_index", default=None)


def _rule_index() -> _Index:
    rules = _bound.get()
    if rules is None:
        rules = RULES
    if _indexed.get() is rules:
        cached = _index.get()
        if cached is not None:
            return cached
    built = _build_index(rules)
    _indexed.set(rules)
    _index.set(built)
    return built


def _earlier(
    value: str,
    best: _Hit | None,
    patterns: tuple[tuple[str, _Hit], ...],
    matched,
) -> _Hit | None:
    for pattern, hit in patterns:
        if best is not None and hit.order >= best.order:
            break
        if matched(value, pattern):
            best = hit
            break
    return best


def _contains(path: str, pattern: str) -> bool:
    return pattern in path


def classify(path: str) -> Marker | None:
    value = str(path or "").lower()
    index = _rule_index()
    best = index.exact.get(value)
    if index.prefix_patterns and value.startswith(index.prefix_patterns):
        best = _earlier(value, best, index.prefixes, str.startswith)
    if index.suffix_patterns and value.endswith(index.suffix_patterns):
        best = _earlier(value, best, index.suffixes, str.endswith)
    best = _earlier(value, best, index.contains, _contains)
    if best is None:
        return None
    return Marker(best.code, best.label)


def marker_body(path: str) -> dict | None:
    found = classify(path)
    if found is None:
        return None
    return {"code": found.code, "label": found.label}
