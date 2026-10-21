import pytest

from app.observation.markers import classify


@pytest.mark.parametrize(
    ("path", "code", "label"),
    [
        ("/.env", "env", "Secret file"),
        ("/.ENV", "env", "Secret file"),
        ("/.env.local", "env", "Secret file"),
        ("/.env/prod", "env", "Secret file"),
        ("/foo/.env", None, None),
        ("/.environment", None, None),
        ("/.htaccess", "htaccess", "Server file"),
        ("/.htpasswd", "htaccess", "Server file"),
        ("/.git", "git", "Source checkout"),
        ("/.git/config", "git", "Source checkout"),
        ("/.gitignore", None, None),
        ("/.svn", "svn", "Source checkout"),
        ("/.svn/entries", "svn", "Source checkout"),
        ("/.aws", "aws", "Cloud key"),
        ("/.aws/credentials", "aws", "Cloud key"),
        ("/wp-config.php", "wp-config", "Config file"),
        ("/blog/wp-config.php", "wp-config", "Config file"),
        ("/wp-login.php", "wp-login", "Login probe"),
        ("/xmlrpc.php", "xmlrpc", "Login probe"),
        ("/phpMyAdmin/", "phpmyadmin", "Database tool"),
        ("/adminer.php", "adminer", "Database tool"),
        ("/server-status", "server-status", "Server status"),
        ("/server-status/alive", "server-status", "Server status"),
        ("/actuator", "actuator", "Debug endpoint"),
        ("/actuator/env", "actuator", "Debug endpoint"),
        ("/cgi-bin", "cgi-bin", "Old script path"),
        ("/cgi-bin/test", "cgi-bin", "Old script path"),
        ("/vendor/phpunit/phpunit", "phpunit", "Test tool"),
        ("/.DS_Store", "ds-store", "Hidden file"),
        ("/id_rsa", "key", "Private key"),
        ("/id_rsa.pub", "key", "Private key"),
        ("/.pem", "key", "Private key"),
        ("/server.pem", None, None),
        ("/dump.sql", "sql", "Database dump"),
        ("/dump.sql.gz", "sql", "Database dump"),
        ("/pricing", None, None),
        ("", None, None),
    ],
)
def test_classify(path, code, label):
    found = classify(path)
    if code is None:
        assert found is None
        return
    assert found is not None
    assert found.code == code
    assert found.label == label
