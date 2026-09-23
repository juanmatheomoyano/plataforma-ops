import uuid

from pydantic import BaseModel, computed_field

from .models import LEGACY_ROLE_MAPPING, UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    full_name: str | None
    role: UserRole
    roles: list[str] | None = None

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def effective_roles(self) -> list[str]:
        """Roles v2 efectivos — usa `roles` si está seteado, sino mapping legacy."""
        if self.roles:
            return list(self.roles)
        return LEGACY_ROLE_MAPPING.get(self.role.value, [self.role.value])


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str
