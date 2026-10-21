from fastapi import Request

from app.errors import ApiError


async def read_body(request: Request, limit: int = 65536) -> bytes:
    try:
        length = int(request.headers.get("content-length", "0") or "0")
    except ValueError as exc:
        raise ApiError(400, "bad_body") from exc
    if length <= 0 or length > limit:
        raise ApiError(400, "bad_body")
    body = await request.body()
    if len(body) > limit:
        raise ApiError(400, "bad_body")
    return body
