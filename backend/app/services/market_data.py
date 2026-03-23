from __future__ import annotations

import io
import time
from datetime import datetime, timedelta

import pandas as pd
import requests

_cache: dict[str, pd.DataFrame] = {}

PERIOD_DAYS = {
    "6mo": 180,
    "1y": 365,
    "2y": 730,
    "5y": 1825,
}


def _download_stooq(ticker: str, days: int) -> pd.Series | None:
    """Download daily close prices from Stooq (free, no auth, no rate limits)."""
    symbol = f"{ticker.upper()}.US"
    end = datetime.now()
    start = end - timedelta(days=days)
    url = (
        f"https://stooq.com/q/d/l/"
        f"?s={symbol}"
        f"&d1={start.strftime('%Y%m%d')}"
        f"&d2={end.strftime('%Y%m%d')}"
        f"&i=d"
    )
    try:
        r = requests.get(url, timeout=15)
        if r.status_code != 200 or "No data" in r.text or len(r.text) < 50:
            return None
        df = pd.read_csv(io.StringIO(r.text), parse_dates=["Date"], index_col="Date")
        if "Close" not in df.columns or df.empty:
            return None
        return df["Close"].rename(ticker.upper()).sort_index()
    except Exception:
        return None


def fetch_adj_close_prices(
    tickers: list[str],
    period: str = "2y",
) -> pd.DataFrame:
    cleaned = sorted({t.strip().upper() for t in tickers if t and t.strip()})
    if not cleaned:
        return pd.DataFrame()

    key = f"{','.join(cleaned)}:{period}"
    if key in _cache:
        return _cache[key]

    days = PERIOD_DAYS.get(period, 730)
    frames: list[pd.Series] = []

    for ticker in cleaned:
        series = _download_stooq(ticker, days)
        if series is not None and not series.empty:
            frames.append(series)
        time.sleep(0.15)

    if not frames:
        return pd.DataFrame()

    result = pd.concat(frames, axis=1).sort_index().ffill().dropna(how="all")
    _cache[key] = result
    return result
