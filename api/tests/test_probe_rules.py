from app.codes import Code
from app.observation.markers import (
    CONTAINS,
    PREFIX,
    SUFFIX,
    ProbeRule,
    as_rule,
    bind_rules,
    classify,
    pattern_rows,
    prepare,
    reset_rules,
    rule_id,
)
from app.observation.models import ProbePattern
from app.observation.rules import _public


def test_the_seed_keeps_the_scan_patterns():
    patterns = {row["pattern"] for row in pattern_rows()}
    assert "/firebase-key.json" in patterns
    assert "/.env1" in patterns
    assert "/_environment" in patterns
    assert "phpinfo" in patterns
    assert "/server-status.php" in patterns
    assert "/wp-" in patterns
    assert "/classwithtostring.php" in patterns
    assert all(row["custom"] is False for row in pattern_rows())
    assert rule_id(SUFFIX, "/firebase-key.json") == rule_id(SUFFIX, "/firebase-key.json")


def test_a_listed_rule_says_whether_it_was_added():
    builtin = ProbePattern(id="a", code="shell", label="Web shell", kind=SUFFIX, pattern="/bless.php", custom=False)
    added = ProbePattern(id="b", code="notes", label="Notes", kind=SUFFIX, pattern="/notes.txt", custom=True)
    assert _public(builtin)["custom"] is False
    assert _public(added)["custom"] is True


def test_a_blank_pattern_is_refused_and_a_label_can_name_the_code():
    try:
        prepare("cloud-key", "Cloud key", SUFFIX, "  ")
    except ValueError as exc:
        assert str(exc) == "bad_rule"
    else:
        raise AssertionError("blank pattern")
    assert prepare("", "Cloud key", SUFFIX, "/firebase-key.json")[0] == "cloud-key"


def test_the_index_follows_rule_order():
    rules = (
        ProbeRule("env", "Secret file", exact=("/.env",), suffixes=("/.env", "/.env~")),
        as_rule("notes", "Notes", CONTAINS, "secret"),
        as_rule("shell", "Web shell", SUFFIX, ".php"),
        as_rule("later", "Later", PREFIX, "/.env"),
    )
    paths = (
        "/.env",
        "/.ENV",
        "/foo/.env",
        "/foo/.env~",
        "/a/secret.php",
        "/a.php",
        "/pricing",
        "/secret.txt",
        "/.env/prod",
    )
    token = bind_rules(rules)
    try:
        for path in paths:
            found = classify(path)
            pair = (found.code, found.label) if found is not None else None
            expected = None
            lowered = path.lower()
            for rule in rules:
                if rule.matches(lowered):
                    expected = (rule.code, rule.label)
                    break
            assert pair == expected
    finally:
        reset_rules(token)
    restored = classify("/.env")
    assert restored is not None
    assert restored.code == "env"


def test_a_bound_rule_replaces_the_builtin_list_for_one_read():
    token = bind_rules((as_rule("notes", "Secret file", SUFFIX, "/secret-notes.txt"),))
    try:
        found = classify("/secret-notes.txt")
        assert found is not None
        assert found.code == "notes"
        assert found.label == "Secret file"
        assert classify("/.env") is None
    finally:
        reset_rules(token)
    builtin = classify("/.env")
    assert builtin is not None
    assert builtin.code == "env"
    assert Code.BAD_RULE == "bad_rule"
