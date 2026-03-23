from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.scenario import ScenarioRequest, ScenarioResponse, ScenarioImpactItem
from app.services.scenarios import run_scenario_impacts
from app.routers.analytics import _get_portfolio_holdings

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.post("/{portfolio_id}", response_model=ScenarioResponse)
def run_scenarios(
    portfolio_id: int,
    payload: ScenarioRequest,
    db: Session = Depends(get_db),
) -> ScenarioResponse:
    _, holdings = _get_portfolio_holdings(portfolio_id, db)
    holdings_df = pd.DataFrame(
        [
            {
                "ticker": h.ticker,
                "shares": h.shares,
                "purchase_price": h.purchase_price,
                "sector": h.sector,
            }
            for h in holdings
        ]
    )
    impacts = run_scenario_impacts(holdings_df, payload.shocks)
    impact_items = [ScenarioImpactItem(label=k, impact_pct=v) for k, v in impacts.items()]
    return ScenarioResponse(portfolio_id=portfolio_id, impacts=impact_items)

