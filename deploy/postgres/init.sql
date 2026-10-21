CREATE TABLE sites (
    id text PRIMARY KEY,
    domain text NOT NULL UNIQUE,
    origin_url text NOT NULL,
    origin_host text NOT NULL,
    origin_tls boolean NOT NULL DEFAULT true,
    verify_origin_tls boolean NOT NULL DEFAULT true,
    dry_run boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role text NOT NULL,
    site_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cert_state (
    site_id text PRIMARY KEY REFERENCES sites (id),
    status text NOT NULL,
    not_after timestamptz
);
