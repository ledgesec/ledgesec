from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.access.actor import Actor
from app.errors import ApiError
from app.http.body import read_body
from app.http.deps import ActorDep, AdminDep
from app.http.schemas import AddressesOut, ObservationOut, StoredOut, SummaryOut
from app.ids import SITE_ID
from app.observation.addresses import address_panel
from app.observation.ingest import INGEST_BODY_LIMIT, accept_batch
from app.observation.journal import fetch_events, fetch_summary, insert_observations
from app.observation.summary import summarize

router = APIRouter()


class Unscoped(Exception):
    pass


def scoped_site(actor: Actor) -> str | None:
    if actor.role == "admin":
        return None
    if not SITE_ID.match(actor.site_id or ""):
        raise Unscoped()
    return actor.site_id


def dump_observation(row: dict, *, include_ip: bool) -> dict:
    data = ObservationOut.model_validate(row).model_dump()
    if not include_ip:
        data.pop("ip", None)
    return data


@router.get("/v1/observations")
def observations(actor: ActorDep) -> JSONResponse:
    try:
        site_id = scoped_site(actor)
    except Unscoped:
        return JSONResponse({"observations": []})
    try:
        rows = fetch_events(40, site_id)
    except Exception as exc:
        raise ApiError(503, "clickhouse_down") from exc
    include_ip = actor.role == "admin"
    body = {"observations": [dump_observation(row, include_ip=include_ip) for row in rows]}
    return JSONResponse(body)


@router.get("/v1/summary")
def summary(actor: ActorDep) -> JSONResponse:
    try:
        site_id = scoped_site(actor)
    except Unscoped:
        return JSONResponse(SummaryOut.model_validate(summarize([])).model_dump())
    try:
        body = SummaryOut.model_validate(fetch_summary(site_id)).model_dump()
    except Exception as exc:
        raise ApiError(503, "clickhouse_down") from exc
    return JSONResponse(body)


@router.get("/v1/addresses")
def addresses(_actor: AdminDep) -> JSONResponse:
    try:
        rows = fetch_events(1000)
    except Exception as exc:
        raise ApiError(503, "clickhouse_down") from exc
    body = AddressesOut.model_validate({"addresses": address_panel(rows)}).model_dump()
    return JSONResponse(body)


@router.post("/v1/observations")
async def ingest(request: Request) -> JSONResponse:
    body = await read_body(request, limit=INGEST_BODY_LIMIT)
    mac = (request.headers.get("x-ledgesec-mac") or "").strip().lower()
    try:
        lines = accept_batch(mac, body)
        stored = insert_observations(lines)
    except PermissionError as exc:
        raise ApiError(401, str(exc)) from exc
    except Exception as exc:
        raise ApiError(400, "rejected") from exc
    return JSONResponse(StoredOut(stored=stored).model_dump(), status_code=202)
