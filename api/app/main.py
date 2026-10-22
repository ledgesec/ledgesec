import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.codes import Code
from app.db import migrate
from app.errors import ApiError
from app.http.access import router as access_router
from app.http.health import router as health_router
from app.http.observation import router as observation_router


def wait_for_users() -> None:
    last: Exception | None = None
    for _ in range(20):
        try:
            migrate()
            return
        except Exception as exc:  # noqa: BLE001 — postgres may still be starting
            last = exc
            time.sleep(1)
    raise SystemExit(f"postgres schema: {last}")


def create_app(*, prepare: bool = True) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        if prepare:
            wait_for_users()
        yield

    app = FastAPI(title="Ledgesec", lifespan=lifespan)
    app.include_router(health_router)
    app.include_router(access_router)
    app.include_router(observation_router)

    @app.exception_handler(ApiError)
    async def api_error(_request: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            {"error": exc.code},
            status_code=exc.status,
            headers={"Cache-Control": "no-store"},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = Code.NOT_FOUND if exc.status_code == 404 else Code.REJECTED
        return JSONResponse(
            {"error": code},
            status_code=exc.status_code,
            headers={"Cache-Control": "no-store"},
        )

    @app.middleware("http")
    async def no_store(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    return app


app = create_app()
