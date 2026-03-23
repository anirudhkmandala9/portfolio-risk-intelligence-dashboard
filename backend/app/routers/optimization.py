from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.optimization import OptimizationResponse, WeightRecommendation
from app.services.market_data import fetch_adj_close_prices
from app.services.optimization import current_weights_from_holdings, max_sharpe_weights, min_vol_weights
from app.routers.analytics import _get_portfolio_holdings

router = APIRouter(prefix="/optimization", tags=["optimization"])


@router.get("/{portfolio_id}", response_model=OptimizationResponse)
def optimize_portfolio(portfolio_id: int, db: Session = Depends(get_db)) -> OptimizationResponse:
    _, holdings = _get_portfolio_holdings(portfolio_id, db)
    tickers = [h.ticker for h in holdings]
    prices = fetch_adj_close_prices(tickers=tickers, period="2y")
    if prices.empty:
        recs = [
            WeightRecommendation(
                ticker=h.ticker,
                current_weight=1 / len(holdings),
                min_vol_weight=1 / len(holdings),
                max_sharpe_weight=1 / len(holdings),
            )
            for h in holdings
        ]
        return OptimizationResponse(portfolio_id=portfolio_id, recommendations=recs)

    returns = prices.pct_change().dropna()
    returns = returns[[c for c in tickers if c in returns.columns]]
    if returns.empty:
        recs = [
            WeightRecommendation(
                ticker=h.ticker,
                current_weight=1 / len(holdings),
                min_vol_weight=1 / len(holdings),
                max_sharpe_weight=1 / len(holdings),
            )
            for h in holdings
        ]
        return OptimizationResponse(portfolio_id=portfolio_id, recommendations=recs)

    values = pd.Series({h.ticker: max(h.shares * h.purchase_price, 0.0) for h in holdings})
    current = current_weights_from_holdings(values.reindex(returns.columns).fillna(0.0))

    min_vol = min_vol_weights(returns, max_weight=0.5)
    max_sh = max_sharpe_weights(returns, max_weight=0.5)

    recs = []
    for i, ticker in enumerate(returns.columns):
        recs.append(
            WeightRecommendation(
                ticker=ticker,
                current_weight=float(current.get(ticker, 0.0)),
                min_vol_weight=float(min_vol[i]),
                max_sharpe_weight=float(max_sh[i]),
            )
        )
    return OptimizationResponse(portfolio_id=portfolio_id, recommendations=recs)

