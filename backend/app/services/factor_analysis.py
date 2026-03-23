from __future__ import annotations

import io
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import requests
import statsmodels.api as sm


_FF_CACHE: pd.DataFrame | None = None


def _fetch_ff_factors(days: int = 1500) -> pd.DataFrame:
    """Fetch Fama-French 3-factor daily data from Kenneth French's data library."""
    global _FF_CACHE
    if _FF_CACHE is not None and len(_FF_CACHE) > 100:
        return _FF_CACHE

    url = (
        "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/"
        "ftp/F-F_Research_Data_Factors_daily_CSV.zip"
    )
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()

        import zipfile
        with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
            csv_name = [n for n in zf.namelist() if n.endswith(".CSV") or n.endswith(".csv")][0]
            raw = zf.read(csv_name).decode("utf-8")

        lines = raw.strip().split("\n")
        start_idx = None
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped and stripped[0].isdigit() and len(stripped.split(",")[0].strip()) == 8:
                start_idx = i
                break

        if start_idx is None:
            return pd.DataFrame()

        data_lines = []
        for line in lines[start_idx:]:
            stripped = line.strip()
            if not stripped or not stripped[0].isdigit():
                break
            data_lines.append(stripped)

        header = "Date,Mkt-RF,SMB,HML,RF\n"
        csv_str = header + "\n".join(data_lines)
        df = pd.read_csv(io.StringIO(csv_str))
        df["Date"] = pd.to_datetime(df["Date"], format="%Y%m%d")
        df = df.set_index("Date").sort_index()

        for col in ["Mkt-RF", "SMB", "HML", "RF"]:
            df[col] = pd.to_numeric(df[col], errors="coerce") / 100.0

        cutoff = datetime.now() - timedelta(days=days)
        df = df[df.index >= pd.Timestamp(cutoff)]
        _FF_CACHE = df
        return df

    except Exception:
        return pd.DataFrame()


def fama_french_regression(
    portfolio_returns: pd.Series,
) -> dict:
    """Run Fama-French 3-factor regression on portfolio returns.

    Returns factor loadings (beta_mkt, beta_smb, beta_hml),
    alpha, R-squared, and factor contribution breakdown.
    """
    ff = _fetch_ff_factors()
    if ff.empty:
        return {"error": "Could not fetch Fama-French factor data."}

    aligned = pd.concat(
        [portfolio_returns.rename("port"), ff],
        axis=1,
    ).dropna()

    if len(aligned) < 60:
        return {"error": "Insufficient overlapping data for factor regression."}

    y = aligned["port"] - aligned["RF"]
    X = aligned[["Mkt-RF", "SMB", "HML"]]
    X = sm.add_constant(X)

    model = sm.OLS(y, X).fit()

    alpha_ann = float(model.params.get("const", 0)) * 252
    beta_mkt = float(model.params.get("Mkt-RF", 0))
    beta_smb = float(model.params.get("SMB", 0))
    beta_hml = float(model.params.get("HML", 0))

    mean_mkt = float(aligned["Mkt-RF"].mean()) * 252
    mean_smb = float(aligned["SMB"].mean()) * 252
    mean_hml = float(aligned["HML"].mean()) * 252
    mean_rf = float(aligned["RF"].mean()) * 252

    contrib_mkt = beta_mkt * mean_mkt
    contrib_smb = beta_smb * mean_smb
    contrib_hml = beta_hml * mean_hml

    total_return = float(aligned["port"].mean()) * 252

    residual_vol = float(np.std(model.resid, ddof=1) * np.sqrt(252))

    return {
        "alpha_annualized": round(alpha_ann, 5),
        "beta_market": round(beta_mkt, 4),
        "beta_smb": round(beta_smb, 4),
        "beta_hml": round(beta_hml, 4),
        "r_squared": round(float(model.rsquared), 4),
        "adj_r_squared": round(float(model.rsquared_adj), 4),
        "residual_volatility": round(residual_vol, 5),
        "factor_contributions": {
            "market": round(contrib_mkt, 5),
            "smb": round(contrib_smb, 5),
            "hml": round(contrib_hml, 5),
            "alpha": round(alpha_ann, 5),
            "risk_free": round(mean_rf, 5),
            "total_explained": round(contrib_mkt + contrib_smb + contrib_hml + alpha_ann + mean_rf, 5),
            "actual_return": round(total_return, 5),
        },
        "observations": len(aligned),
        "p_values": {
            "alpha": round(float(model.pvalues.get("const", 1)), 4),
            "market": round(float(model.pvalues.get("Mkt-RF", 1)), 4),
            "smb": round(float(model.pvalues.get("SMB", 1)), 4),
            "hml": round(float(model.pvalues.get("HML", 1)), 4),
        },
    }
