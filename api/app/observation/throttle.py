import threading
import time

from app.codes import Code

# One signed-in user. A cabinet tick is a few reads; a tight loop is not.
READS = 15
WINDOW = 1

_lock = threading.Lock()
_hits: dict[str, list[float]] = {}


def clear_reads() -> None:
    with _lock:
        _hits.clear()


def admit(actor_id: str, now: float | None = None) -> None:
    stamp = time.monotonic() if now is None else now
    with _lock:
        recent = [hit for hit in _hits.get(actor_id, []) if stamp - hit < WINDOW]
        if len(recent) >= READS:
            _hits[actor_id] = recent
            raise ValueError(Code.BUSY)
        recent.append(stamp)
        _hits[actor_id] = recent
