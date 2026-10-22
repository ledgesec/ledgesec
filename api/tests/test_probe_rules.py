from app.codes import Code
from app.observation.markers import bind_rules, classify, pattern_rows, prepare, reset_rules, rule_id
from app.observation.markers import as_rule
from app.observation.markers import SUFFIX


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


def test_a_blank_pattern_is_refused_and_a_label_can_name_the_code():
    try:
        prepare("cloud-key", "Cloud key", SUFFIX, "  ")
    except ValueError as exc:
        assert str(exc) == "bad_rule"
    else:
        raise AssertionError("blank pattern")
    assert prepare("", "Cloud key", SUFFIX, "/firebase-key.json")[0] == "cloud-key"


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
