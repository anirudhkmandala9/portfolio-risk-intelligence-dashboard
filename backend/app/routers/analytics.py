from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.holding import Holding
from app.models.portfolio import Portfolio
from app.schemas.analytics import AllocationItem, AllocationResponse, AnalyticsResponse, MetricItem
from app.services import analytics as analytics_service
from app.services.market_data import fetch_adj_close_prices

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _get_portfolio_holdings(portfolio_id: int, db: Session) -> tuple[Portfolio, list[Holding]]:
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found.")
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()
    if not holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings.")
    return portfolio, holdings


def _portfolio_returns(holdings: list[Holding], benchmark_ticker: str) -> tuple[pd.Series, pd.Series]:
    tickers = [h.ticker for h in holdings] + [benchmark_ticker]
    prices = fetch_adj_close_prices(tickers=tickers, period="2y")
    if prices.empty:
        raise HTTPException(status_code=400, detail="Could not fetch market data. Check tickers.")

    asset_prices = prices[[c for c in prices.columns if c != benchmark_ticker]].dropna(how="all")
    benchmark_prices = prices[benchmark_ticker].dropna()
    if asset_prices.empty or benchmark_prices.empty:
        raise HTTPException(status_code=400, detail="Insufficient price history for analysis.")

    latest_prices = asset_prices.iloc[-1]
    values = {}
    for h in holdings:
        px = float(latest_prices.get(h.ticker, np.nan))
        if np.isnan(px):
            px = h.purchase_price
        values[h.ticker] = max(h.shares * px, 0.0)
    total_value = sum(values.values())
    if total_value <= 0:
        weights = pd.Series([1 / len(holdings)] * len(holdings), index=[h.ticker for h in holdings])
    else:
        weights = pd.Series({k: v / total_value for k, v in values.items()})

    asset_returns = asset_prices.pct_change().dropna()
    common_cols = [c for c in weights.index if c in asset_returns.columns]
    if not common_cols:
        raise HTTPException(status_code=400, detail="No common returns series for holdings.")
    portfolio_returns = asset_returns[common_cols].mul(weights[common_cols], axis=1).sum(axis=1)
    benchmark_returns = benchmark_prices.pct_change().dropna()
    return portfolio_returns, benchmark_returns


@router.get("/{portfolio_id}/performance", response_model=AnalyticsResponse)
def portfolio_performance(portfolio_id: int, db: Session = Depends(get_db)) -> AnalyticsResponse:
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    p_ret, b_ret = _portfolio_returns(holdings, portfolio.benchmark_ticker)

    beta, alpha = analytics_service.beta_alpha(p_ret, b_ret)
    mdd = analytics_service.max_drawdown(p_ret)
    ann_ret = analytics_service.annualized_return(p_ret)

    metrics = [
        MetricItem(key="cumulative_return", value=float((1 + p_ret).prod() - 1)),
        MetricItem(key="annualized_return", value=ann_ret),
        MetricItem(key="annualized_volatility", value=analytics_service.annualized_volatility(p_ret)),
        MetricItem(key="sharpe_ratio", value=analytics_service.sharpe_ratio(p_ret)),
        MetricItem(key="sortino_ratio", value=analytics_service.sortino_ratio(p_ret)),
        MetricItem(key="max_drawdown", value=mdd),
        MetricItem(key="calmar_ratio", value=float(ann_ret / abs(mdd)) if mdd < 0 else 0.0),
        MetricItem(key="beta", value=beta),
        MetricItem(key="alpha", value=alpha),
        MetricItem(key="tracking_error", value=analytics_service.tracking_error(p_ret, b_ret)),
        MetricItem(key="information_ratio", value=analytics_service.info_ratio(p_ret, b_ret)),
    ]
    return AnalyticsResponse(portfolio_id=portfolio_id, metrics=metrics)


@router.get("/{portfolio_id}/allocation", response_model=AllocationResponse)
def allocation_breakdown(portfolio_id: int, db: Session = Depends(get_db)) -> AllocationResponse:
    _, holdings = _get_portfolio_holdings(portfolio_id, db)
    df = pd.DataFrame(
        [
            {
                "ticker": h.ticker,
                "sector": h.sector,
                "value": max(h.shares * h.purchase_price, 0.0),
            }
            for h in holdings
        ]
    )
    total = df["value"].sum()
    if total <= 0:
        df["weight"] = 1 / len(df)
    else:
        df["weight"] = df["value"] / total

    by_asset = [AllocationItem(name=r["ticker"], weight=float(r["weight"])) for _, r in df.iterrows()]
    sector_df = df.groupby("sector", as_index=False)["weight"].sum().sort_values("weight", ascending=False)
    by_sector = [AllocationItem(name=r["sector"], weight=float(r["weight"])) for _, r in sector_df.iterrows()]

    hhi = float(np.square(df["weight"]).sum())
    diversification_score = float(max(0.0, 1 - hhi))
    return AllocationResponse(
        portfolio_id=portfolio_id,
        by_asset=by_asset,
        by_sector=by_sector,
        hhi=hhi,
        diversification_score=diversification_score,
    )

