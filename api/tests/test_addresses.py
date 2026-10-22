from app.observation.addresses import address_panel


def test_panel_groups_an_address_and_keeps_the_first_probe():
    rows = [
        {
            "ip": "203.0.113.10",
            "edge_id": "eu",
            "site_id": "demo",
            "ts": "2026-10-21T16:00:00.000000Z",
            "path": "/.env",
            "country": "de",
            "marker": {"code": "env", "label": "Secret file"},
        },
        {
            "ip": "203.0.113.10",
            "edge_id": "us",
            "site_id": "other",
            "ts": "2026-10-21T15:00:00.000000Z",
            "path": "/pricing",
            "marker": None,
        },
        {
            "ip": "",
            "edge_id": "eu",
            "site_id": "demo",
            "ts": "2026-10-21T14:00:00.000000Z",
            "path": "/.git",
            "marker": {"code": "git", "label": "Source checkout"},
        },
    ]
    panel = address_panel(rows)
    assert len(panel) == 1
    assert panel[0]["ip"] == "203.0.113.10"
    assert panel[0]["edges"] == {"eu": 1, "us": 1}
    assert panel[0]["probes"] == 1
    assert panel[0]["probe_path"] == "/.env"
    assert panel[0]["probe_label"] == "Secret file"
    assert panel[0]["sites"] == ["demo", "other"]
    assert panel[0]["last_ts"] == "2026-10-21T16:00:00.000000Z"
    assert panel[0]["country"] == "DE"
    assert panel[0]["paths"] == ["/.env", "/pricing"]
    assert panel[0]["requests"] == 2
