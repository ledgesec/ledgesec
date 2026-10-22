from typing import Literal

from pydantic import BaseModel, field_validator


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    site_id: str


class UsersOut(BaseModel):
    users: list[UserOut]


class SiteOut(BaseModel):
    id: str
    domain: str
    origin_url: str
    dry_run: bool


class SitesOut(BaseModel):
    sites: list[SiteOut]


class MarkerOut(BaseModel):
    code: str
    label: str


class ProbeRuleIn(BaseModel):
    code: str = ""
    label: str
    kind: str
    pattern: str


class ProbeRuleOut(BaseModel):
    id: str
    code: str
    label: str
    kind: str
    pattern: str


class ProbeRulesOut(BaseModel):
    rules: list[ProbeRuleOut]


class ObservationOut(BaseModel):
    ts: str
    site_id: str
    edge_id: str
    route_group: str
    path: str
    decision: str
    reason: str
    ip: str | None = None
    country: str = ""
    request_time_ms: int = 0
    method: str = ""
    status: int = 0
    ua: str = ""
    bytes_sent: int = 0
    protocol: str = ""
    tls: str = ""
    marker: MarkerOut | None = None


class AddressOut(BaseModel):
    ip: str
    edges: dict[str, int]
    probes: int
    last_ts: str
    sites: list[str]
    probe_path: str
    probe_label: str
    country: str = ""
    ua: str = ""
    paths: list[str] = []
    requests: int = 0


class AddressesOut(BaseModel):
    addresses: list[AddressOut]
    next: str | None = None
    prev: str | None = None


class EdgeCount(BaseModel):
    id: str
    requests: int
    probes: int = 0


class SiteCount(BaseModel):
    name: str
    requests: int
    probes: int


class SlowPath(BaseModel):
    path: str
    label: str = ""
    requests: int
    avg_ms: int
    max_ms: int


class HourCount(BaseModel):
    hour: str
    requests: int
    probes: int


class MarkerCount(BaseModel):
    path: str
    label: str
    count: int


class DomainRate(BaseModel):
    name: str
    requests: int
    rps: float


class CountryCount(BaseModel):
    code: str
    requests: int


class RatePoint(BaseModel):
    at: str
    requests: int
    rps: float


class RatesOut(BaseModel):
    window: Literal["1h", "3h", "6h", "12h", "24h"]
    step: int
    points: list[RatePoint]


class SummaryOut(BaseModel):
    window: Literal["24h"]
    requests: int
    probes: int
    sites: int
    edges: list[EdgeCount]
    hours: list[HourCount]
    markers: list[MarkerCount]
    by_site: list[SiteCount] = []
    slow: list[SlowPath] = []
    rps: float = 0
    domains: list[DomainRate] = []
    countries: list[CountryCount] = []


class HealthOut(BaseModel):
    postgres: Literal["ok", "down"]
    clickhouse: Literal["ok", "down"]
    ingest: Literal["ok", "disabled"]


class StoredOut(BaseModel):
    stored: int


class OkOut(BaseModel):
    ok: bool


class SignIn(BaseModel):
    email: str = ""
    password: str = ""

    @field_validator("email", "password", mode="before")
    @classmethod
    def as_text(cls, value: object) -> str:
        if value is None:
            return ""
        return str(value)


class HostSiteOut(BaseModel):
    name: str
    enabled: bool


class HostOut(BaseModel):
    id: str
    label: str
    collector: str
    agent_version: str = ""
    owner_email: str = ""
    ingest_secret: str = ""
    sites: list[HostSiteOut]


class HostsOut(BaseModel):
    hosts: list[HostOut]


class NewHost(BaseModel):
    label: str = ""
    collector: str = ""
    owner_id: str = ""

    @field_validator("label", "collector", "owner_id", mode="before")
    @classmethod
    def as_text(cls, value: object) -> str:
        if value is None:
            return ""
        return str(value)


class SiteMonitor(BaseModel):
    host_id: str = ""
    name: str = ""
    enabled: bool

    @field_validator("host_id", "name", mode="before")
    @classmethod
    def as_text(cls, value: object) -> str:
        if value is None:
            return ""
        return str(value)


class NewUser(BaseModel):
    email: str = ""
    password: str = ""
    site_id: str = ""

    @field_validator("email", "password", "site_id", mode="before")
    @classmethod
    def as_text(cls, value: object) -> str:
        if value is None:
            return ""
        return str(value)
