"""Catalog request and response models (Jacob Bogdany / Slice 1).

Matches the Supabase schema (`locations`, `menu_items`, `modifier_groups`,
`modifier_options`) and aligns with the frontend types in `frontend/src/types/index.ts`
and Vin's checkout rules in `backend/app/services/checkout_rules.py`.
"""

from decimal import Decimal
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

# Money serialized as two-decimal float for JSON responses
Money = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")]

DietaryTag = Literal["vegan", "vegetarian", "gluten-free", "dairy-free", "halal"]


class ModifierOptionOut(BaseModel):
    id: str
    group_id: str
    name: str
    price_delta: Money = Decimal("0.00")
    is_available: bool = True
    sort_order: int = 0


class ModifierGroupOut(BaseModel):
    id: str
    menu_item_id: str
    name: str
    is_required: bool = False
    min_select: int = 0
    max_select: int = 1
    sort_order: int = 0
    options: list[ModifierOptionOut] = Field(default_factory=list)


# Legacy frontend customization shape support
class LegacyCustomizationOption(BaseModel):
    name: str
    price_delta: float


class LegacyCustomizationGroup(BaseModel):
    group_name: str
    required: bool
    max_select: int
    options: list[LegacyCustomizationOption] = Field(default_factory=list)


class MenuItemOut(BaseModel):
    id: str
    location_id: str
    name: str
    description: str = ""
    category: str
    base_price: Money
    dietary_tags: list[str] = Field(default_factory=list)
    is_available: bool = True
    modifier_groups: list[ModifierGroupOut] = Field(default_factory=list)
    # Legacy mirror for backwards compatibility with existing UI
    customization_groups: list[LegacyCustomizationGroup] = Field(default_factory=list)


class LocationOut(BaseModel):
    id: str
    slug: str
    name: str
    building: str
    hours: str  # mapped from db hours_text
    is_open: bool = True
    active_orders_count: int = 0
    estimated_wait_minutes: int = 5


class UpdateAvailabilityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_available: bool


class UpdateAvailabilityResponse(BaseModel):
    id: str
    name: str
    is_available: bool
    message: str
