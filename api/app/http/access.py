from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.access.passwords import check_password
from app.access.repository import (
    create_user,
    find_user,
    list_sites,
    list_users,
    public_user,
)
from app.access.sessions import session_cookie, session_secret, sign_session
from app.errors import ApiError
from app.http.body import read_body
from app.http.deps import ActorDep, AdminDep, Db
from app.http.schemas import NewUser, OkOut, SignIn, SitesOut, UserOut, UsersOut

router = APIRouter()


@router.post("/v1/session")
async def sign_in(request: Request, db: Db) -> JSONResponse:
    if session_secret() == "":
        raise ApiError(503, "session_unconfigured")
    try:
        parsed = SignIn.model_validate_json(await read_body(request))
    except Exception as exc:
        raise ApiError(400, "bad_body") from exc
    try:
        row = find_user(db, parsed.email.strip().lower())
    except Exception as exc:
        raise ApiError(503, "postgres_down") from exc
    if row is None or not check_password(parsed.password, row.password_hash):
        raise ApiError(401, "bad_login")
    try:
        token = sign_session(row.id)
    except PermissionError as exc:
        raise ApiError(503, str(exc)) from exc
    body = UserOut.model_validate(public_user(row)).model_dump()
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
        raise ApiError(503, "postgres_down") from exc
    return JSONResponse(UsersOut.model_validate({"users": rows}).model_dump())


@router.post("/v1/users")
async def add_user(request: Request, db: Db, _actor: AdminDep) -> JSONResponse:
    try:
        raw = await read_body(request)
        parsed = NewUser.model_validate_json(raw)
    except Exception as exc:
        raise ApiError(400, "rejected") from exc
    try:
        create_user(db, parsed.email, parsed.password, parsed.site_id)
    except ValueError as exc:
        raise ApiError(400, "bad_user") from exc
    except Exception as exc:
        raise ApiError(400, "rejected") from exc
    return JSONResponse(OkOut(ok=True).model_dump(), status_code=201)


@router.get("/v1/sites")
def sites(db: Db, _actor: AdminDep) -> JSONResponse:
    try:
        rows = list_sites(db)
    except Exception as exc:
        raise ApiError(503, "postgres_down") from exc
    return JSONResponse(SitesOut.model_validate({"sites": rows}).model_dump())
