from contextlib import contextmanager

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.orm import Session

from app.codes import Code
from app.observation.markers import RULES, ProbeRule, as_rule, bind_rules, pattern_rows, prepare, reset_rules, rule_id
from app.observation.models import ProbePattern


def load_rules(db: Session) -> tuple[ProbeRule, ...]:
    try:
        rows = db.scalars(
            select(ProbePattern).order_by(ProbePattern.custom.desc(), ProbePattern.created_at, ProbePattern.id)
        ).all()
    except ProgrammingError:
        db.rollback()
        return RULES
    if not rows:
        return RULES
    return tuple(as_rule(row.code, row.label, row.kind, row.pattern) for row in rows)


@contextmanager
def applied_rules(db: Session):
    token = bind_rules(load_rules(db))
    try:
        yield
    finally:
        reset_rules(token)


def list_custom(db: Session) -> list[dict]:
    rows = db.scalars(
        select(ProbePattern).where(ProbePattern.custom.is_(True)).order_by(ProbePattern.created_at, ProbePattern.id)
    ).all()
    return [_public(row) for row in rows]


def add_rule(db: Session, code: str, label: str, kind: str, pattern: str) -> dict:
    try:
        name, text, match, value = prepare(code, label, kind, pattern)
    except ValueError as exc:
        raise ValueError(Code.BAD_RULE) from exc
    row = ProbePattern(id=rule_id(match, value), code=name, label=text, kind=match, pattern=value, custom=True)
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError(Code.EXISTS) from exc
    db.refresh(row)
    return _public(row)


def remove_rule(db: Session, rule_id_value: str) -> None:
    row = db.get(ProbePattern, rule_id_value)
    if row is None or not row.custom:
        raise ValueError(Code.NOT_FOUND)
    db.delete(row)
    db.commit()


def seed_rows() -> list[dict]:
    return pattern_rows()


def _public(row: ProbePattern) -> dict:
    return {"id": row.id, "code": row.code, "label": row.label, "kind": row.kind, "pattern": row.pattern}
