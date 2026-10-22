import os

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.db import postgres_ready
from app.http.schemas import HealthOut
from app.observation.clickhouse import ping as clickhouse_ready

router = APIRouter()


def probe(check) -> str:
    try:
        check()
    except Exception:  # noqa: BLE001 — a failed probe is down, whatever the driver raised
        return "down"
    return "ok"


@router.get("/health")
def health() -> JSONResponse:
    postgres = probe(postgres_ready)
    clickhouse = probe(clickhouse_ready)
    ingest = "ok" if os.environ.get("LEDGESEC_INGEST_SECRET", "") else "disabled"
    body = HealthOut(postgres=postgres, clickhouse=clickhouse, ingest=ingest)
    status = 200 if postgres == "ok" and clickhouse == "ok" else 503
    return JSONResponse(body.model_dump(), status_code=status)
