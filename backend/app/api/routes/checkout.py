"""Balance and checkout endpoints are owned by the checkout slice (Vin)."""

from fastapi import APIRouter

router = APIRouter(tags=["checkout"])
