from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


DemoPersona = Literal["student", "operator"]
AppRole = Literal["student", "staff"]


class DemoLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    persona: DemoPersona


class DemoLoginResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    persona: DemoPersona
    role: AppRole
    user_id: str
    display_name: str
    expires_at: datetime


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "HuskyBite API"
    supabase_configured: bool = Field(
        description="True when both Supabase URL and server-side service key are configured."
    )
