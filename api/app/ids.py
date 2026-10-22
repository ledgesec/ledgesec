import re

SITE_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
EMAIL = re.compile(r"^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}$")
_LABEL = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def site_name(value: str) -> str:
    text = str(value or "").strip().lower().rstrip(".")
    if text.startswith("[") and "]" in text:
        return ""
    if ":" in text:
        text = text.split(":", 1)[0]
    if text == "" or len(text) > 253:
        return ""
    labels = text.split(".")
    if any(_LABEL.match(label) is None for label in labels):
        return ""
    return text
