from __future__ import annotations

import csv
import io

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.analytics import _get_portfolio_holdings, _portfolio_returns
from app.services import analytics as analytics_service
from app.services.risk import (
    downside_deviation,
    expected_shortfall,
    historical_var,
    parametric_var,
)
from app.services.market_data import fetch_adj_close_prices

router = APIRouter(prefix="/export", tags=["export"])


def _build_analytics_rows(
    portfolio_id: int, db: Session
) -> tuple[str, list[dict[str, str]]]:
    """Compute all analytics and return portfolio name + rows of key-value data."""
    portfolio, holdings = _get_portfolio_holdings(portfolio_id, db)
    p_ret, b_ret = _portfolio_returns(holdings, portfolio.benchmark_ticker)

    beta, alpha = analytics_service.beta_alpha(p_ret, b_ret)
    mdd = analytics_service.max_drawdown(p_ret)
    ann_ret = analytics_service.annualized_return(p_ret)
    ann_vol = analytics_service.annualized_volatility(p_ret)

    rows: list[dict[str, str]] = []

    rows.append({"Section": "Performance", "Metric": "Cumulative Return", "Value": f"{float((1 + p_ret).prod() - 1):.4%}"})
    rows.append({"Section": "Performance", "Metric": "Annualized Return", "Value": f"{ann_ret:.4%}"})
    rows.append({"Section": "Performance", "Metric": "Annualized Volatility", "Value": f"{ann_vol:.4%}"})
    rows.append({"Section": "Performance", "Metric": "Sharpe Ratio", "Value": f"{analytics_service.sharpe_ratio(p_ret):.4f}"})
    rows.append({"Section": "Performance", "Metric": "Sortino Ratio", "Value": f"{analytics_service.sortino_ratio(p_ret):.4f}"})
    rows.append({"Section": "Performance", "Metric": "Max Drawdown", "Value": f"{mdd:.4%}"})
    rows.append({"Section": "Performance", "Metric": "Calmar Ratio", "Value": f"{(ann_ret / abs(mdd)) if mdd < 0 else 0:.4f}"})
    rows.append({"Section": "Performance", "Metric": "Beta", "Value": f"{beta:.4f}"})
    rows.append({"Section": "Performance", "Metric": "Alpha", "Value": f"{alpha:.4f}"})
    rows.append({"Section": "Performance", "Metric": "Tracking Error", "Value": f"{analytics_service.tracking_error(p_ret, b_ret):.4%}"})
    rows.append({"Section": "Performance", "Metric": "Information Ratio", "Value": f"{analytics_service.info_ratio(p_ret, b_ret):.4f}"})

    rows.append({"Section": "Risk", "Metric": "Historical VaR (95%)", "Value": f"{historical_var(p_ret, 0.95):.4%}"})
    rows.append({"Section": "Risk", "Metric": "Parametric VaR (95%)", "Value": f"{parametric_var(p_ret, 0.95):.4%}"})
    rows.append({"Section": "Risk", "Metric": "Expected Shortfall (95%)", "Value": f"{expected_shortfall(p_ret, 0.95):.4%}"})
    rows.append({"Section": "Risk", "Metric": "Downside Deviation", "Value": f"{downside_deviation(p_ret):.4%}"})

    # Holdings
    for h in holdings:
        rows.append({
            "Section": "Holdings",
            "Metric": h.ticker,
            "Value": f"Shares: {h.shares}, Price: {h.purchase_price}, Sector: {h.sector}",
        })

    return portfolio.name, rows


@router.get("/{portfolio_id}/csv")
def export_csv(portfolio_id: int, db: Session = Depends(get_db)):
    """Export full analytics report as CSV."""
    name, rows = _build_analytics_rows(portfolio_id, db)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["Section", "Metric", "Value"])
    writer.writeheader()
    writer.writerows(rows)

    output.seek(0)
    filename = f"{name.replace(' ', '_')}_analytics.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{portfolio_id}/holdings-csv")
def export_holdings_csv(portfolio_id: int, db: Session = Depends(get_db)):
    """Export portfolio holdings as CSV."""
    _, holdings = _get_portfolio_holdings(portfolio_id, db)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["ticker", "shares", "purchase_price", "asset_class", "sector"])
    writer.writeheader()
    for h in holdings:
        writer.writerow({
            "ticker": h.ticker,
            "shares": h.shares,
            "purchase_price": h.purchase_price,
            "asset_class": h.asset_class,
            "sector": h.sector,
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="holdings.csv"'},
    )
