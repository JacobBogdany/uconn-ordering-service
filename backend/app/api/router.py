from fastapi import APIRouter

from app.api.routes import catalog, checkout, demo, health, orders

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(demo.router)
api_router.include_router(catalog.router)
api_router.include_router(checkout.router)
api_router.include_router(orders.router)
