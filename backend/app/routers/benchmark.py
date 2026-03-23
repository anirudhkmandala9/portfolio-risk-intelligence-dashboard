from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.analytics import _get_portfolio_holdings, _portfolio_returns

router = APIRouter(prefix="/benchmark", tags=["benchmark"])


@router.get("/{portfolio_id}")
def benchmark_comparison(portfolio_id: int, db: Session = Depends(get_db)) -> dict:
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    p_ret, b_ret = _portfolio_returns(holdings, portfolio.benchmark_ticker)
    aligned = pd.concat([p_ret.rename("portfolio"), b_ret.rename("benchmark")], axis=1).dropna()

    active = aligned["portfolio"] - aligned["benchmark"]
    upside_mask = aligned["benchmark"] > 0
    downside_mask = aligned["benchmark"] < 0

    upside_capture = (
        (aligned.loc[upside_mask, "portfolio"].mean() / aligned.loc[upside_mask, "benchmark"].mean())
        if upside_mask.any()
        else 0.0
    )
    downside_capture = (
        (aligned.loc[downside_mask, "portfolio"].mean() / aligned.loc[downside_mask, "benchmark"].mean())
        if downside_mask.any()
        else 0.0
    )

    return {
        "portfolio_id": portfolio_id,
        "benchmark": portfolio.benchmark_ticker,
        "active_return_annualized": float(active.mean() * 252),
        "active_risk_annualized": float(active.std(ddof=1) * (252 ** 0.5)),
        "upside_capture": float(upside_capture),
        "downside_capture": float(downside_capture),
    }

