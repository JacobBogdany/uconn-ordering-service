from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.schemas import DemoLoginRequest, DemoLoginResponse
from app.security.demo_sessions import issue_demo_session

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/login", response_model=DemoLoginResponse)
def login_as_demo_persona(payload: DemoLoginRequest) -> DemoLoginResponse:
    settings = get_settings()
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="Demo login is disabled.")
    if len(settings.demo_session_secret.strip()) < 32:
        raise HTTPException(status_code=503, detail="Set a private demo signing secret with at least 32 characters.")
    try:
        token, user_id, role, expires_at = issue_demo_session(payload.persona)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    display_name = "Demo Student" if payload.persona == "student" else "Demo Operator"
    return DemoLoginResponse(
        access_token=token,
        persona=payload.persona,
        role=role,
        user_id=user_id,
        display_name=display_name,
        expires_at=expires_at,
    )
