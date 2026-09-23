from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status

from .config import get_settings
from .supabase_client import get_user_client


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str
    role: str


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required")
    return authorization.removeprefix("Bearer ").strip()


async def get_current_user(authorization: str | None = Header(default=None)) -> AuthenticatedUser:
    token = _bearer_token(authorization)
    try:
        response = get_user_client().auth.get_user(token)
        user = response.user
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session") from exc
    if not user or not user.id or not user.email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    settings = get_settings()
    role = "superadmin" if settings.superadmin_email and user.email.lower() == settings.superadmin_email.lower() else "client"
    return AuthenticatedUser(id=user.id, email=user.email, role=role)


async def require_superadmin(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    if user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")
    return user
