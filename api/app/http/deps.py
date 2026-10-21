from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.access.actor import Actor
from app.access.sessions import open_session
from app.db import get_db
from app.errors import ApiError

Db = Annotated[Session, Depends(get_db)]


def current_actor(request: Request, db: Db) -> Actor:
    actor = open_session(request.cookies.get("ledgesec_session", ""), db)
    if actor is None:
        raise ApiError(401, "sign_in")
    return actor


ActorDep = Annotated[Actor, Depends(current_actor)]


def admin_actor(actor: ActorDep) -> Actor:
    if actor.role != "admin":
        raise ApiError(401, "sign_in")
    return actor


AdminDep = Annotated[Actor, Depends(admin_actor)]
