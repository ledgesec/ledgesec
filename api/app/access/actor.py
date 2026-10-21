from dataclasses import dataclass


@dataclass(frozen=True)
class Actor:
    id: str
    email: str
    role: str
    site_id: str

    def public(self) -> dict:
        return {"id": self.id, "email": self.email, "role": self.role, "site_id": self.site_id}
