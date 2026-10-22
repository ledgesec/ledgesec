from datetime import UTC, datetime

from app.codes import Code

MINUTE = 60
HOUR = 60 * MINUTE

# Span, then the bucket. A short window stays on the minute. A longer one steps up.
RATE_WINDOWS = {
    "1h": (1 * HOUR, 1 * MINUTE),
    "3h": (3 * HOUR, 5 * MINUTE),
    "6h": (6 * HOUR, 10 * MINUTE),
    "12h": (12 * HOUR, 15 * MINUTE),
    "24h": (24 * HOUR, 30 * MINUTE),
}
DEFAULT_RATE_WINDOW = "1h"
_SPANS = {span for span, _step in RATE_WINDOWS.values()}
_STEPS = {step for _span, step in RATE_WINDOWS.values()}


def window_of(name: str) -> tuple[str, int, int]:
    pair = RATE_WINDOWS.get(name)
    if pair is None:
        raise ValueError(Code.BAD_WINDOW)
    span, step = pair
    return name, span, step


def known_step(span: int, step: int) -> None:
    if span not in _SPANS or step not in _STEPS:
        raise ValueError(Code.BAD_WINDOW)


def bucket_key(value: str) -> str:
    text = str(value).strip().replace("T", " ").removesuffix("Z")
    dot = text.find(".")
    if dot >= 0:
        text = text[:dot]
    return text[:19]


def fill_rates(found: dict[str, int], span: int, step: int, now: datetime | None = None) -> list[dict]:
    known_step(span, step)
    stamp = now or datetime.now(UTC)
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=UTC)
    epoch = int(stamp.timestamp())
    end = epoch - (epoch % step)
    count = span // step
    points = []
    for index in range(count - 1, -1, -1):
        moment = end - index * step
        key = datetime.fromtimestamp(moment, UTC).strftime("%Y-%m-%d %H:%M:%S")
        requests = int(found.get(key, 0))
        points.append({"at": key, "requests": requests, "rps": round(requests / step, 3)})
    return points


def rates_body(found: dict[str, int], name: str, span: int, step: int, now: datetime | None = None) -> dict:
    return {"window": name, "step": step, "points": fill_rates(found, span, step, now)}
