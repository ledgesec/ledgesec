def address_panel(rows: list[dict]) -> list[dict]:
    grouped: dict[str, dict] = {}
    for row in rows:
        ip = row.get("ip") or ""
        if ip == "":
            continue
        item = grouped.setdefault(
            ip,
            {
                "ip": ip,
                "edges": {},
                "probes": 0,
                "last_ts": row["ts"],
                "sites": [],
                "probe_path": "",
                "probe_label": "",
            },
        )
        edge = row.get("edge_id") or "module"
        item["edges"][edge] = item["edges"].get(edge, 0) + 1
        site = row.get("site_id") or ""
        if site and site not in item["sites"]:
            item["sites"].append(site)
        marker = row.get("marker")
        if marker:
            item["probes"] += 1
            if item["probe_path"] == "":
                item["probe_path"] = row["path"]
                item["probe_label"] = marker["label"]
    panel = list(grouped.values())
    panel.sort(key=lambda item: (item["probes"], sum(item["edges"].values())), reverse=True)
    return panel[:80]
