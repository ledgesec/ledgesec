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
        prefixes=("/.env.", "/.env/"),
        suffixes=("/.env",),
        contains=("/.env.", "/.env/"),
    ),
    ProbeRule("htaccess", "Server file", prefixes=("/.htaccess", "/.htpasswd")),
    ProbeRule("git", "Source checkout", exact=("/.git",), prefixes=("/.git/",)),
    ProbeRule("svn", "Source checkout", exact=("/.svn",), prefixes=("/.svn/",)),
    ProbeRule("aws", "Cloud key", exact=("/.aws",), prefixes=("/.aws/",)),
    ProbeRule("wp-config", "Config file", suffixes=("/wp-config.php",)),
    ProbeRule("wp-login", "Login probe", suffixes=("/wp-login.php",)),
    ProbeRule("xmlrpc", "Login probe", suffixes=("/xmlrpc.php",)),
    ProbeRule("phpmyadmin", "Database tool", contains=("phpmyadmin",)),
    ProbeRule("adminer", "Database tool", suffixes=("/adminer.php",)),
    ProbeRule("server-status", "Server status", exact=("/server-status",), prefixes=("/server-status/",)),
    ProbeRule("actuator", "Debug endpoint", exact=("/actuator",), prefixes=("/actuator/",)),
    ProbeRule("cgi-bin", "Old script path", exact=("/cgi-bin",), prefixes=("/cgi-bin/",)),
    ProbeRule("phpunit", "Test tool", contains=("/vendor/phpunit",)),
    ProbeRule("ds-store", "Hidden file", suffixes=("/.ds_store",)),
    ProbeRule("key", "Private key", suffixes=("/id_rsa", "/id_rsa.pub", "/.pem")),
    ProbeRule("sql", "Database dump", suffixes=(".sql.gz", ".sql")),
)


def classify(path: str) -> Marker | None:
    value = str(path or "").lower()
    for rule in RULES:
        if rule.matches(value):
            return Marker(rule.code, rule.label)
    return None


def marker_body(path: str) -> dict | None:
    found = classify(path)
    if found is None:
        return None
    return {"code": found.code, "label": found.label}
