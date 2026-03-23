from pydantic import BaseModel


class RiskResponse(BaseModel):
    portfolio_id: int
    historical_var_95: float
    parametric_var_95: float
    expected_shortfall_95: float
    downside_deviation: float
    max_drawdown: float
    worst_days: list[float]

