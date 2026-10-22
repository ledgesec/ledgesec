from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.access.service import (
    assign_host,
    create_user,
    host_owner,
    hosts_for,
    list_sites,
    list_users,
    remove_host,
    set_site_enabled,
    sign_in,
)
from app.access.sessions import session_cookie, session_secret
from app.codes import Code
from app.errors import ApiError
from app.http.body import read_body
from app.http.deps import ActorDep, AdminDep, Db
from app.http.schemas import (
    HostOut,
    HostsOut,
    NewHost,
    NewUser,
    OkOut,
    SignIn,
    SiteMonitor,
    SitesOut,
    UserOut,
    UsersOut,
)

router = APIRouter()


@router.post("/v1/session")
async def open_session(request: Request, db: Db) -> JSONResponse:
    if session_secret() == "":
        raise ApiError(503, Code.SESSION_UNCONFIGURED)
    try:
        parsed = SignIn.model_validate_json(await read_body(request))
    except Exception as exc:
        raise ApiError(400, Code.BAD_BODY) from exc
    try:
        user, token = sign_in(db, parsed.email, parsed.password)
    except PermissionError as exc:
        code = str(exc)
        if code == Code.BAD_LOGIN:
            raise ApiError(401, code) from exc
        raise ApiError(503, code) from exc
    except Exception as exc:
        raise ApiError(503, Code.POSTGRES_DOWN) from exc
    body = UserOut.model_validate(user).model_dump()
    return JSONResponse(body, headers={"set-cookie": session_cookie(token)})


@router.post("/v1/logout")
def logout() -> JSONResponse:
    body = OkOut(ok=True).model_dump()
    return JSONResponse(body, headers={"set-cookie": session_cookie("", clear=True)})


@router.get("/v1/session")
def session_view(actor: ActorDep) -> JSONResponse:
    return JSONResponse(UserOut.model_validate(actor.public()).model_dump())


@router.get("/v1/users")
def users(db: Db, _actor: AdminDep) -> JSONResponse:
    try:
        rows = list_users(db)
    except Exception as exc:
        raise ApiError(503, Code.POSTGRES_DOWN) from exc
    return JSONResponse(UsersOut.model_validate({"users": rows}).model_dump())


@router.post("/v1/users")
async def add_user(request: Request, db: Db, _actor: AdminDep) -> JSONResponse:
    try:
        raw = await read_body(request)
        parsed = NewUser.model_validate_json(raw)
    except Exception as exc:
        raise ApiError(400, Code.REJECTED) from exc
    try:
        create_user(db, parsed.email, parsed.password, parsed.site_id)
    except ValueError as exc:
        raise ApiError(400, Code.BAD_USER) from exc
    except Exception as exc:
        raise ApiError(400, Code.REJECTED) from exc
    return JSONResponse(OkOut(ok=True).model_dump(), status_code=201)


@router.get("/v1/hosts")
def hosts(db: Db, actor: ActorDep) -> JSONResponse:
    try:
        rows = hosts_for(db, actor)
    except Exception as exc:
        raise ApiError(503, Code.POSTGRES_DOWN) from exc
    return JSONResponse(HostsOut.model_validate({"hosts": rows}).model_dump())


@router.post("/v1/hosts")
async def add_host(request: Request, db: Db, actor: ActorDep) -> JSONResponse:
    try:
        parsed = NewHost.model_validate_json(await read_body(request))
    except Exception as exc:
        raise ApiError(400, Code.BAD_BODY) from exc
    try:
        row = assign_host(db, actor, parsed.label, parsed.collector, parsed.owner_id)
    except LookupError as exc:
        raise ApiError(404, Code.NOT_FOUND) from exc
    except ValueError as exc:
        code = str(exc)
        allowed = {Code.BAD_HOST, Code.UNAVAILABLE, Code.BAD_OWNER}
        raise ApiError(400, code if code in allowed else Code.REJECTED) from exc
    except Exception as exc:
        raise ApiError(503, Code.POSTGRES_DOWN) from exc
    return JSONResponse(HostOut.model_validate(row).model_dump(), status_code=201)


@router.delete("/v1/hosts/{host_id}")
def drop_host(host_id: str, db: Db, actor: ActorDep) -> JSONResponse:
    try:
        remove_host(db, host_id, host_owner(actor))
    except LookupError as exc:
        raise ApiError(404, Code.NOT_FOUND) from exc
    except ValueError as exc:
        raise ApiError(400, Code.BAD_HOST) from exc
    except Exception as exc:
        raise ApiError(503, Code.POSTGRES_DOWN) from exc
    return JSONResponse(OkOut(ok=True).model_dump())


@router.post("/v1/host-sites")
async def monitor_site(request: Request, db: Db, actor: ActorDep) -> JSONResponse:
    try:
        parsed = SiteMonitor.model_validate_json(await read_body(request))
    except Exception as exc:
        raise ApiError(400, Code.BAD_BODY) from exc
    try:
        set_site_enabled(db, parsed.host_id, parsed.name, parsed.enabled, host_owner(actor))
    except LookupError as exc:
        raise ApiError(404, Code.NOT_FOUND) from exc
    except ValueError as exc:
        raise ApiError(400, Code.BAD_SITE) from exc
    except Exception as exc:
        raise ApiError(503, Code.POSTGRES_DOWN) from exc
    return JSONResponse(OkOut(ok=True).model_dump())


@router.get("/v1/sites")
def sites(db: Db, _actor: AdminDep) -> JSONResponse:
    try:
        rows = list_sites(db)
    except Exception as exc:
        raise ApiError(503, Code.POSTGRES_DOWN) from exc
    return JSONResponse(SitesOut.model_validate({"sites": rows}).model_dump())
