from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.risk import RiskResponse
from app.services import analytics as analytics_service
from app.services import risk as risk_service
from app.routers.analytics import _get_portfolio_holdings, _portfolio_returns

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/{portfolio_id}", response_model=RiskResponse)
def risk_snapshot(portfolio_id: int, db: Session = Depends(get_db)) -> RiskResponse:
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    p_ret, _ = _portfolio_returns(holdings, portfolio.benchmark_ticker)
    return RiskResponse(
        portfolio_id=portfolio_id,
        historical_var_95=risk_service.historical_var(p_ret, confidence=0.95),
        parametric_var_95=risk_service.parametric_var(p_ret, confidence=0.95),
        expected_shortfall_95=risk_service.expected_shortfall(p_ret, confidence=0.95),
        downside_deviation=risk_service.downside_deviation(p_ret),
        max_drawdown=analytics_service.max_drawdown(p_ret),
        worst_days=[float(x) for x in p_ret.nsmallest(5).tolist()],
    )

