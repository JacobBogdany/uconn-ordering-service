from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings
from app.security.demo_sessions import verify_demo_session

bearer_scheme = HTTPBearer(auto_error=False)


def require_demo_identity(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if not get_settings().demo_mode:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Demo sessions are disabled.")
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer session required.")
    identity = verify_demo_session(credentials.credentials)
    if identity is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired demo session.")
    return identity


def require_operator(identity: dict[str, Any] = Depends(require_demo_identity)) -> dict[str, Any]:
    if identity.get("role") != "staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operator access required.")
    return identity
