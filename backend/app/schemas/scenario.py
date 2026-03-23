from pydantic import BaseModel, Field


class ScenarioShock(BaseModel):
    label: str = Field(..., min_length=2, max_length=80)
    ticker: str | None = None
    sector: str | None = None
    shock_pct: float


class ScenarioRequest(BaseModel):
    shocks: list[ScenarioShock]


class ScenarioImpactItem(BaseModel):
    label: str
    impact_pct: float


class ScenarioResponse(BaseModel):
    portfolio_id: int
    impacts: list[ScenarioImpactItem]

