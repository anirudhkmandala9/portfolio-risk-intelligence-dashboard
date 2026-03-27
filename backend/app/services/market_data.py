from __future__ import annotations

import io
import logging
import time
from datetime import datetime, timedelta

import pandas as pd
import requests

logger = logging.getLogger(__name__)

_cache: dict[str, pd.DataFrame] = {}

PERIOD_DAYS = {
    "6mo": 180,
    "1y": 365,
    "2y": 730,
    "5y": 1825,
}

# Stooq often throttles or blocks the default Python UA from cloud/datacenter IPs (e.g. Render).
_STOOQ_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/csv,*/*",
}


def _download_stooq(ticker: str, days: int, *, retries: int = 3) -> pd.Series | None:
    """Download daily close prices from Stooq (free, no auth)."""
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

    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=30, headers=_STOOQ_HEADERS)
            if r.status_code != 200:
                logger.warning("Stooq HTTP %s for %s", r.status_code, symbol)
                time.sleep(0.5 * (attempt + 1))
                continue
            text = r.text
            if "No data" in text or len(text) < 50:
                logger.warning("Stooq empty/no data for %s", symbol)
                return None
            df = pd.read_csv(io.StringIO(text), parse_dates=["Date"], index_col="Date")
            if "Close" not in df.columns or df.empty:
                return None
            return df["Close"].rename(ticker.upper()).sort_index()
        except Exception as e:
            last_err = e
            logger.warning("Stooq fetch attempt %s failed for %s: %s", attempt + 1, symbol, e)
            time.sleep(0.6 * (attempt + 1))

    if last_err:
        logger.error("Stooq failed for %s after %s tries: %s", symbol, retries, last_err)
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
        # Stooq is friendlier with a small gap between symbols (cloud IPs get rate-limited easily)
        time.sleep(0.35)

    if not frames:
        return pd.DataFrame()

    result = pd.concat(frames, axis=1).sort_index().ffill().dropna(how="all")
    _cache[key] = result
    return result
