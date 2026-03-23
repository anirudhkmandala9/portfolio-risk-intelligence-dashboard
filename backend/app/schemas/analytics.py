from pydantic import BaseModel


class MetricItem(BaseModel):
    key: str
    value: float


class AnalyticsResponse(BaseModel):
    portfolio_id: int
    metrics: list[MetricItem]


class AllocationItem(BaseModel):
    name: str
    weight: float


class AllocationResponse(BaseModel):
    portfolio_id: int
    by_asset: list[AllocationItem]
    by_sector: list[AllocationItem]
    hhi: float
    diversification_score: float

