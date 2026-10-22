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
    marker: MarkerOut | None = None


class AddressOut(BaseModel):
    ip: str
    edges: dict[str, int]
    probes: int
    last_ts: str
    sites: list[str]
    probe_path: str
    probe_label: str


class AddressesOut(BaseModel):
    addresses: list[AddressOut]


class EdgeCount(BaseModel):
    id: str
    requests: int


class HourCount(BaseModel):
    hour: str
    requests: int
    probes: int


class MarkerCount(BaseModel):
    path: str
    label: str
    count: int


class SummaryOut(BaseModel):
    window: Literal["24h"]
    requests: int
    probes: int
    sites: int
    edges: list[EdgeCount]
    hours: list[HourCount]
    markers: list[MarkerCount]


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
    sites: list[HostSiteOut]


class HostsOut(BaseModel):
    hosts: list[HostOut]


class NewHost(BaseModel):
    label: str = ""
    collector: str = ""

    @field_validator("label", "collector", mode="before")
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
