from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.access.service import (
    Unscoped,
    filter_monitored,
    journal_scope,
    remember_agent,
    shows_ip,
)
from app.codes import Code
from app.errors import ApiError
from app.http.body import read_body
from app.http.deps import ActorDep, AdminDep, Db
from app.http.schemas import AddressesOut, ObservationOut, StoredOut, SummaryOut
from app.observation.addresses import address_panel
from app.observation.ingest import INGEST_BODY_LIMIT, accept_batch, batch_note
from app.observation.service import fetch_events, fetch_summary, insert_observations
from app.observation.summary import summarize

router = APIRouter()


def dump_observation(row: dict, *, include_ip: bool) -> dict:
    data = ObservationOut.model_validate(row).model_dump()
    if not include_ip:
        data.pop("ip", None)
    return data


@router.get("/v1/observations")
def observations(actor: ActorDep) -> JSONResponse:
    try:
        site_id = journal_scope(actor)
    except Unscoped:
        return JSONResponse({"observations": []})
    try:
        rows = fetch_events(40, site_id)
    except Exception as exc:
        raise ApiError(503, Code.CLICKHOUSE_DOWN) from exc
    include_ip = shows_ip(actor)
    body = {"observations": [dump_observation(row, include_ip=include_ip) for row in rows]}
    return JSONResponse(body)


@router.get("/v1/summary")
def summary(actor: ActorDep) -> JSONResponse:
    try:
        site_id = journal_scope(actor)
    except Unscoped:
        return JSONResponse(SummaryOut.model_validate(summarize([])).model_dump())
    try:
        body = SummaryOut.model_validate(fetch_summary(site_id)).model_dump()
    except Exception as exc:
        raise ApiError(503, Code.CLICKHOUSE_DOWN) from exc
    return JSONResponse(body)


@router.get("/v1/addresses")
def addresses(_actor: AdminDep) -> JSONResponse:
    try:
        rows = fetch_events(1000)
    except Exception as exc:
        raise ApiError(503, Code.CLICKHOUSE_DOWN) from exc
    body = AddressesOut.model_validate({"addresses": address_panel(rows)}).model_dump()
    return JSONResponse(body)


@router.post("/v1/observations")
async def ingest(request: Request, db: Db) -> JSONResponse:
    body = await read_body(request, limit=INGEST_BODY_LIMIT)
    mac = (request.headers.get("x-ledgesec-mac") or "").strip().lower()
    try:
        lines = accept_batch(mac, body)
        lines = filter_monitored(db, lines)
        host_id, agent = batch_note(body)
        remember_agent(db, host_id, agent)
        stored = insert_observations(lines)
    except PermissionError as exc:
        raise ApiError(401, str(exc)) from exc
    except ValueError as exc:
        code = str(exc)
        raise ApiError(400, code if code == Code.UNKNOWN_HOST else Code.REJECTED) from exc
    except SQLAlchemyError as exc:
        raise ApiError(503, Code.POSTGRES_DOWN) from exc
    except Exception as exc:
        raise ApiError(400, Code.REJECTED) from exc
    return JSONResponse(StoredOut(stored=stored).model_dump(), status_code=202)
