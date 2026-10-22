from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.access.actor import Actor
from app.access.service import actor_from_token
from app.codes import Code
from app.db import get_db
from app.errors import ApiError

Db = Annotated[Session, Depends(get_db)]


def current_actor(request: Request, db: Db) -> Actor:
    actor = actor_from_token(db, request.cookies.get("ledgesec_session", ""))
    if actor is None:
        raise ApiError(401, Code.SIGN_IN)
    return actor


ActorDep = Annotated[Actor, Depends(current_actor)]


def admin_actor(actor: ActorDep) -> Actor:
    if actor.role != "admin":
        raise ApiError(401, Code.SIGN_IN)
    return actor


AdminDep = Annotated[Actor, Depends(admin_actor)]
