from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.contact.service import (
    CONTACT_BODY_LIMIT,
    admit_contact,
    format_note,
    parse_note,
    post_telegram,
)
from app.http.body import read_body

router = APIRouter()


@router.post("/v1/contact")
async def contact(request: Request) -> JSONResponse:
    raw = await read_body(request, CONTACT_BODY_LIMIT)
    note = parse_note(raw)
    ip = request.client.host if request.client else ""
    admit_contact(ip)
    post_telegram(format_note(note))
    return JSONResponse({"sent": True})
