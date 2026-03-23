from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.analytics import _get_portfolio_holdings, _portfolio_returns
from app.services.market_data import fetch_adj_close_prices
from app.services.insights import generate_insights
from app.services.optimization import min_vol_weights, max_sharpe_weights
from app.services.monte_carlo import run_monte_carlo
from app.services.factor_analysis import fama_french_regression

router = APIRouter(prefix="/charts", tags=["charts"])


def _weights_and_asset_returns(holdings, benchmark_ticker: str):
    tickers = [h.ticker for h in holdings]
    prices = fetch_adj_close_prices(tickers=tickers + [benchmark_ticker], period="2y")
    asset_prices = prices[[c for c in prices.columns if c != benchmark_ticker]].dropna(how="all")
    latest = asset_prices.iloc[-1]
    values = {}
    for h in holdings:
        px = float(latest.get(h.ticker, h.purchase_price))
        values[h.ticker] = max(h.shares * px, 0.0)
    total = sum(values.values())
    if total <= 0:
        weights = pd.Series([1 / len(holdings)] * len(holdings), index=tickers)
    else:
        weights = pd.Series({k: v / total for k, v in values.items()})
    asset_returns = asset_prices.pct_change().dropna()
    sector_weights = pd.Series({h.sector: 0.0 for h in holdings})
    for h in holdings:
        sector_weights[h.sector] += weights.get(h.ticker, 0.0)
    return weights, asset_returns, sector_weights


@router.get("/{portfolio_id}/cumulative")
def cumulative_returns(portfolio_id: int, db: Session = Depends(get_db)) -> dict:
    """Cumulative return series for portfolio vs benchmark."""
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    p_ret, b_ret = _portfolio_returns(holdings, portfolio.benchmark_ticker)
    aligned = pd.concat([p_ret.rename("portfolio"), b_ret.rename("benchmark")], axis=1).dropna()
    cum_p = ((1 + aligned["portfolio"]).cumprod() - 1)
    cum_b = ((1 + aligned["benchmark"]).cumprod() - 1)
    dates = [d.strftime("%Y-%m-%d") for d in cum_p.index]
    return {
        "dates": dates,
        "portfolio": [round(float(v), 5) for v in cum_p.values],
        "benchmark": [round(float(v), 5) for v in cum_b.values],
    }


@router.get("/{portfolio_id}/drawdown")
def drawdown_series(portfolio_id: int, db: Session = Depends(get_db)) -> dict:
    """Drawdown curve for the portfolio."""
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    p_ret, _ = _portfolio_returns(holdings, portfolio.benchmark_ticker)
    wealth = (1 + p_ret).cumprod()
    peak = wealth.cummax()
    dd = (wealth / peak) - 1
    dates = [d.strftime("%Y-%m-%d") for d in dd.index]
    return {
        "dates": dates,
        "drawdown": [round(float(v), 5) for v in dd.values],
    }


@router.get("/{portfolio_id}/correlation")
def correlation_matrix(portfolio_id: int, db: Session = Depends(get_db)) -> dict:
    """Correlation matrix across portfolio assets."""
    _, holdings = _get_portfolio_holdings(portfolio_id, db)
    tickers = [h.ticker for h in holdings]
    prices = fetch_adj_close_prices(tickers=tickers, period="2y")
    if prices.empty:
        return {"tickers": tickers, "matrix": []}
    returns = prices.pct_change().dropna()
    corr = returns.corr()
    return {
        "tickers": list(corr.columns),
        "matrix": [[round(float(corr.iloc[i, j]), 4) for j in range(len(corr.columns))] for i in range(len(corr.index))],
    }


@router.get("/{portfolio_id}/rolling")
def rolling_metrics(portfolio_id: int, window: int = 30, db: Session = Depends(get_db)) -> dict:
    """Rolling volatility and rolling beta."""
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    p_ret, b_ret = _portfolio_returns(holdings, portfolio.benchmark_ticker)
    aligned = pd.concat([p_ret.rename("p"), b_ret.rename("b")], axis=1).dropna()

    rolling_vol = aligned["p"].rolling(window).std() * np.sqrt(252)
    rolling_vol = rolling_vol.dropna()

    def _rolling_beta(df, w):
        betas = []
        dates = []
        for i in range(w, len(df)):
            chunk = df.iloc[i - w : i]
            cov = np.cov(chunk["p"], chunk["b"])
            var_b = cov[1, 1]
            beta = cov[0, 1] / var_b if var_b > 0 else 0.0
            betas.append(round(float(beta), 4))
            dates.append(df.index[i].strftime("%Y-%m-%d"))
        return dates, betas

    beta_dates, beta_values = _rolling_beta(aligned, window)

    return {
        "volatility": {
            "dates": [d.strftime("%Y-%m-%d") for d in rolling_vol.index],
            "values": [round(float(v), 5) for v in rolling_vol.values],
        },
        "beta": {
            "dates": beta_dates,
            "values": beta_values,
        },
    }


@router.get("/{portfolio_id}/risk-contribution")
def risk_contribution(portfolio_id: int, db: Session = Depends(get_db)) -> dict:
    """Risk contribution by holding."""
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    weights, asset_returns, _ = _weights_and_asset_returns(holdings, portfolio.benchmark_ticker)

    cov = asset_returns.cov().values * 252
    common = [c for c in weights.index if c in asset_returns.columns]
    if len(common) < 2:
        return {"tickers": [h.ticker for h in holdings], "contributions": [1.0 / len(holdings)] * len(holdings)}

    w = weights[common].values.astype(float)
    port_var = float(w @ cov @ w)
    if port_var <= 0:
        return {"tickers": common, "contributions": [1.0 / len(common)] * len(common)}

    marginal = cov @ w
    rc = w * marginal / port_var
    return {
        "tickers": common,
        "contributions": [round(float(v), 5) for v in rc],
    }


@router.get("/{portfolio_id}/insights")
def portfolio_insights(portfolio_id: int, db: Session = Depends(get_db)) -> dict:
    """Rules-based text insights about the portfolio."""
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    p_ret, b_ret = _portfolio_returns(holdings, portfolio.benchmark_ticker)
    weights, asset_returns, sector_weights = _weights_and_asset_returns(holdings, portfolio.benchmark_ticker)
    texts = generate_insights(p_ret, b_ret, weights, sector_weights, asset_returns)
    return {"portfolio_id": portfolio_id, "insights": texts}


@router.get("/{portfolio_id}/efficient-frontier")
def efficient_frontier(portfolio_id: int, n_points: int = 30, db: Session = Depends(get_db)) -> dict:
    """Compute efficient frontier scatter points."""
    _, holdings = _get_portfolio_holdings(portfolio_id, db)
    tickers = [h.ticker for h in holdings]
    prices = fetch_adj_close_prices(tickers=tickers, period="2y")
    if prices.empty:
        return {"points": []}
    returns = prices.pct_change().dropna()
    returns = returns[[c for c in tickers if c in returns.columns]]
    if returns.empty or returns.shape[1] < 2:
        return {"points": []}

    mean_ret = returns.mean().values * 252
    cov_mat = returns.cov().values * 252
    n = len(tickers)

    target_returns = np.linspace(float(mean_ret.min()), float(mean_ret.max()), n_points)
    points = []

    from scipy.optimize import minimize

    for target in target_returns:
        constraints = [
            {"type": "eq", "fun": lambda w: np.sum(w) - 1},
            {"type": "eq", "fun": lambda w, t=target: w @ mean_ret - t},
        ]
        bounds = [(0, 0.5)] * n
        init = np.full(n, 1 / n)
        result = minimize(
            lambda w: float(np.sqrt(w @ cov_mat @ w)),
            init,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
        )
        if result.success:
            vol = float(np.sqrt(result.x @ cov_mat @ result.x))
            ret = float(result.x @ mean_ret)
            points.append({"volatility": round(vol, 5), "return": round(ret, 5)})

    # Current portfolio point
    values = pd.Series({h.ticker: max(h.shares * h.purchase_price, 0.0) for h in holdings})
    total = values.sum()
    if total > 0:
        cur_w = (values / total).reindex(returns.columns).fillna(0).values
        cur_vol = float(np.sqrt(cur_w @ cov_mat @ cur_w))
        cur_ret = float(cur_w @ mean_ret)
    else:
        cur_vol = 0.0
        cur_ret = 0.0

    # Min vol + max sharpe points
    mv = min_vol_weights(returns, max_weight=0.5)
    ms = max_sharpe_weights(returns, max_weight=0.5)
    mv_vol = float(np.sqrt(mv @ cov_mat @ mv))
    mv_ret = float(mv @ mean_ret)
    ms_vol = float(np.sqrt(ms @ cov_mat @ ms))
    ms_ret = float(ms @ mean_ret)

    return {
        "frontier": points,
        "current": {"volatility": round(cur_vol, 5), "return": round(cur_ret, 5)},
        "min_vol": {"volatility": round(mv_vol, 5), "return": round(mv_ret, 5)},
        "max_sharpe": {"volatility": round(ms_vol, 5), "return": round(ms_ret, 5)},
    }


@router.get("/{portfolio_id}/monte-carlo")
def monte_carlo_simulation(
    portfolio_id: int,
    n_simulations: int = 5000,
    horizon_days: int = 252,
    db: Session = Depends(get_db),
) -> dict:
    """Run Monte Carlo simulation on the portfolio."""
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    weights, asset_returns, _ = _weights_and_asset_returns(holdings, portfolio.benchmark_ticker)

    common = [c for c in weights.index if c in asset_returns.columns]
    if len(common) < 1:
        return {"error": "No common return data for holdings."}

    w = weights[common].values.astype(float)
    w = w / w.sum()
    rets = asset_returns[common]

    return run_monte_carlo(rets, w, n_simulations=n_simulations, horizon_days=horizon_days)


@router.get("/{portfolio_id}/factor-analysis")
def factor_analysis(portfolio_id: int, db: Session = Depends(get_db)) -> dict:
    """Fama-French 3-factor regression on the portfolio."""
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    p_ret, _ = _portfolio_returns(holdings, portfolio.benchmark_ticker)
    return fama_french_regression(p_ret)
