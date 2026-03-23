from pydantic import BaseModel


class WeightRecommendation(BaseModel):
    ticker: str
    current_weight: float
    min_vol_weight: float
    max_sharpe_weight: float


class OptimizationResponse(BaseModel):
    portfolio_id: int
    recommendations: list[WeightRecommendation]

