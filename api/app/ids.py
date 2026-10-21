import re

SITE_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
EMAIL = re.compile(r"^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}$")
