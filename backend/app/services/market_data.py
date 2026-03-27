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

# Yahoo Finance JSON chart API — often works on cloud hosts (Render) when yfinance fails.
_YAHOO_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json,text/plain,*/*",
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


def _download_yahoo_chart(ticker: str, period: str) -> pd.Series | None:
    """Adjusted closes via Yahoo's public chart endpoint (requests + JSON). Reliable on servers."""
    sym = ticker.strip().upper()
    if not sym:
        return None
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{sym}"
    params = {"interval": "1d", "range": period}
    try:
        r = requests.get(url, params=params, headers=_YAHOO_HEADERS, timeout=45)
        if r.status_code != 200:
            logger.warning("Yahoo chart HTTP %s for %s", r.status_code, sym)
            return None
        payload = r.json()
        chart = payload.get("chart") or {}
        if chart.get("error"):
            logger.warning("Yahoo chart error for %s: %s", sym, chart["error"])
            return None
        results = chart.get("result") or []
        if not results:
            return None
        res = results[0]
        ts = res.get("timestamp") or []
        if not ts:
            return None
        indicators = res.get("indicators") or {}
        adj_block = indicators.get("adjclose") or []
        closes: list | None = None
        if adj_block and adj_block[0].get("adjclose"):
            closes = adj_block[0]["adjclose"]
        if not closes:
            quotes = indicators.get("quote") or []
            if quotes:
                closes = quotes[0].get("close")
        if not closes or len(closes) != len(ts):
            return None
        idx = pd.to_datetime(ts, unit="s", utc=True).tz_convert(None)
        s = pd.to_numeric(pd.Series(closes, index=idx), errors="coerce")
        s = s.dropna()
        if s.empty:
            return None
        return s.rename(sym).sort_index()
    except Exception as e:
        logger.warning("Yahoo chart fetch failed for %s: %s", sym, e)
        return None


def _download_yahoo_chart_batch(tickers: list[str], period: str) -> pd.DataFrame | None:
    frames: list[pd.Series] = []
    for t in tickers:
        s = _download_yahoo_chart(t, period)
        if s is not None and not s.empty:
            frames.append(s)
        time.sleep(0.12)
    if not frames:
        return None
    return pd.concat(frames, axis=1).sort_index()


def _download_yfinance(ticker: str, days: int) -> pd.Series | None:
    """Fallback when Stooq fails from cloud IPs (e.g. Render). Uses Yahoo via yfinance."""
    try:
        import yfinance as yf
    except ImportError:
        return None
    try:
        period_map = {180: "6mo", 365: "1y", 730: "2y", 1825: "5y"}
        period = period_map.get(days, "2y")
        hist = yf.Ticker(ticker).history(period=period, auto_adjust=True)
        if hist is None or hist.empty:
            return None
        close_col = "Close" if "Close" in hist.columns else hist.columns[0]
        s = hist[close_col].astype(float).rename(ticker.upper()).sort_index()
        return s
    except Exception as e:
        logger.warning("yfinance fallback failed for %s: %s", ticker, e)
        return None


def _download_yfinance_batch(tickers: list[str], days: int) -> pd.DataFrame | None:
    """One Yahoo request for all symbols — often succeeds when per-ticker calls fail on cloud hosts."""
    try:
        import yfinance as yf
    except ImportError:
        return None
    if not tickers:
        return None
    period_map = {180: "6mo", 365: "1y", 730: "2y", 1825: "5y"}
    period = period_map.get(days, "2y")
    try:
        raw = yf.download(
            list(tickers),
            period=period,
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=False,
        )
        if raw.empty or "Close" not in raw.columns:
            return None
        close = raw["Close"]
        if isinstance(close, pd.Series):
            col = (
                str(close.name).upper()
                if close.name is not None
                else tickers[0].upper()
            )
            out = pd.DataFrame({col: close.astype(float)})
        else:
            out = close.astype(float).copy()
            out.columns = [str(c).upper() for c in out.columns]
        return out.sort_index()
    except Exception as e:
        logger.warning("yfinance batch fallback failed: %s", e)
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
        if series is None or series.empty:
            logger.info("Stooq miss for %s; trying Yahoo chart API", ticker)
            series = _download_yahoo_chart(ticker, period)
        if series is None or series.empty:
            logger.info("Yahoo chart miss for %s; trying yfinance fallback", ticker)
            series = _download_yfinance(ticker, days)
            time.sleep(0.2)
        if series is not None and not series.empty:
            frames.append(series)
        time.sleep(0.25)

    if not frames:
        batch = _download_yahoo_chart_batch(cleaned, period)
        if batch is not None and not batch.empty:
            cols = [c for c in cleaned if c in batch.columns]
            if cols:
                result = batch[cols].sort_index().ffill().dropna(how="all")
                _cache[key] = result
                return result
        batch = _download_yfinance_batch(cleaned, days)
        if batch is not None and not batch.empty:
            cols = [c for c in cleaned if c in batch.columns]
            if cols:
                result = batch[cols].sort_index().ffill().dropna(how="all")
                _cache[key] = result
                return result
        return pd.DataFrame()

    result = pd.concat(frames, axis=1).sort_index().ffill().dropna(how="all")
    _cache[key] = result
    return result
