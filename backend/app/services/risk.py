from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import norm


def historical_var(returns: pd.Series, confidence: float = 0.95) -> float:
    if returns.empty:
        return 0.0
    percentile = np.percentile(returns, (1 - confidence) * 100)
    return float(-percentile)


def parametric_var(returns: pd.Series, confidence: float = 0.95) -> float:
    if returns.empty:
        return 0.0
    mu = float(returns.mean())
    sigma = float(returns.std(ddof=1))
    z = float(norm.ppf(1 - confidence))
    return float(-(mu + z * sigma))


def expected_shortfall(returns: pd.Series, confidence: float = 0.95) -> float:
    if returns.empty:
        return 0.0
    var_cutoff = np.percentile(returns, (1 - confidence) * 100)
    tail = returns[returns <= var_cutoff]
    if tail.empty:
        return 0.0
    return float(-tail.mean())


def downside_deviation(returns: pd.Series, mar: float = 0.0) -> float:
    downside = returns[returns < mar] - mar
    if downside.empty:
        return 0.0
    return float(np.sqrt(np.mean(np.square(downside))) * np.sqrt(252))

