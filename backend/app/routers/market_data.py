from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.market_data import fetch_adj_close_prices

router = APIRouter(prefix="/market-data", tags=["market-data"])


@router.get("/prices")
def prices(tickers: str = Query(..., description="Comma separated list of tickers"), period: str = "1y") -> dict:
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    df = fetch_adj_close_prices(ticker_list, period=period)
    if df.empty:
        return {"tickers": ticker_list, "rows": []}
    rows = [
        {"date": idx.strftime("%Y-%m-%d"), **{col: float(val) for col, val in row.items()}}
        for idx, row in df.tail(60).iterrows()
    ]
    return {"tickers": list(df.columns), "rows": rows}

