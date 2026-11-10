from datetime import UTC, datetime, timedelta
from typing import Any

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import get_settings
from app.schemas import AppRole, DemoPersona

DEMO_SESSION_SALT = "huskybite.demo-session.v1"


def _serializer() -> URLSafeTimedSerializer:
    secret = get_settings().demo_session_secret
    if not secret:
        raise RuntimeError("DEMO_SESSION_SECRET must be configured when demo mode is enabled.")
    return URLSafeTimedSerializer(secret_key=secret, salt=DEMO_SESSION_SALT)


def issue_demo_session(persona: DemoPersona) -> tuple[str, str, AppRole, datetime]:
    settings = get_settings()
    if persona == "student":
        user_id = settings.demo_student_user_id
        role: AppRole = "student"
        display_name = "Demo Student"
    else:
        user_id = settings.demo_operator_user_id
        role = "staff"
        display_name = "Demo Operator"

    expires_at = datetime.now(UTC) + timedelta(minutes=settings.demo_session_ttl_minutes)
    token = _serializer().dumps(
        {
            "sub": user_id,
            "persona": persona,
            "role": role,
            "display_name": display_name,
            "exp": int(expires_at.timestamp()),
            "token_type": "demo",
        }
    )
    return token, user_id, role, expires_at


def verify_demo_session(token: str) -> dict[str, Any] | None:
    settings = get_settings()
    if not settings.demo_mode:
        return None
    try:
        claims = _serializer().loads(
            token,
            max_age=settings.demo_session_ttl_minutes * 60,
        )
    except (BadSignature, SignatureExpired, RuntimeError):
        return None

    if claims.get("token_type") != "demo" or claims.get("role") not in {"student", "staff"}:
        return None
    expected_role = "staff" if claims.get("sub") == settings.demo_operator_user_id else "student"
    expected_persona = "operator" if expected_role == "staff" else "student"
    if claims.get("sub") not in {settings.demo_student_user_id, settings.demo_operator_user_id}:
        return None
    if claims.get("role") != expected_role or claims.get("persona") != expected_persona:
        return None
    return claims
