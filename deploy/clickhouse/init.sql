CREATE TABLE IF NOT EXISTS ledgesec.events (
    ts DateTime64(3, 'UTC'),
    site_id LowCardinality(String),
    host_id LowCardinality(String),
    edge_id LowCardinality(String),
    decision LowCardinality(String),
    reason LowCardinality(String),
    policy_version UInt32,
    snapshot_gen UInt64,
    snapshot_age_ms UInt32,
    route_group LowCardinality(String),
    path String,
    ip IPv6,
    country LowCardinality(String),
    had_session UInt8,
    client_class LowCardinality(String),
    ja4 String,
    sampled UInt8,
    request_time_ms UInt32,
    method LowCardinality(String) DEFAULT '',
    status UInt16 DEFAULT 0,
    ua String DEFAULT '',
    bytes_sent UInt64 DEFAULT 0,
    protocol LowCardinality(String) DEFAULT '',
    tls LowCardinality(String) DEFAULT ''
)
ENGINE = MergeTree
PARTITION BY toYYYYMMDD(ts)
ORDER BY (site_id, ts)
TTL toDateTime(ts) + INTERVAL 3 YEAR;

CREATE TABLE IF NOT EXISTS ledgesec.events_minute (
    minute DateTime('UTC'),
    site_id LowCardinality(String),
    decision LowCardinality(String),
    reason LowCardinality(String),
    rows UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(minute)
ORDER BY (site_id, minute, decision, reason)
TTL minute + INTERVAL 3 YEAR;

CREATE MATERIALIZED VIEW IF NOT EXISTS ledgesec.events_minute_mv
TO ledgesec.events_minute
AS
SELECT
    toStartOfMinute(ts) AS minute,
    site_id,
    decision,
    reason,
    count() AS rows
FROM ledgesec.events
GROUP BY minute, site_id, decision, reason;
