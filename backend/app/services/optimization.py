from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.optimize import minimize


def _bounds(n_assets: int, max_weight: float) -> list[tuple[float, float]]:
    return [(0.0, max_weight) for _ in range(n_assets)]


def _sum_to_one_constraint():
    return {"type": "eq", "fun": lambda w: np.sum(w) - 1}


def min_vol_weights(returns: pd.DataFrame, max_weight: float = 0.4) -> np.ndarray:
    cov = returns.cov().values * 252
    n = cov.shape[0]
    init = np.full(n, 1 / n)

    def objective(w: np.ndarray) -> float:
        return float(np.sqrt(w.T @ cov @ w))

    result = minimize(
        objective,
        init,
        method="SLSQP",
        bounds=_bounds(n, max_weight),
        constraints=[_sum_to_one_constraint()],
    )
    return result.x if result.success else init


def max_sharpe_weights(returns: pd.DataFrame, risk_free_rate: float = 0.02, max_weight: float = 0.4) -> np.ndarray:
    mean = returns.mean().values * 252
    cov = returns.cov().values * 252
    n = cov.shape[0]
    init = np.full(n, 1 / n)

    def objective(w: np.ndarray) -> float:
        port_ret = w @ mean
        port_vol = np.sqrt(w.T @ cov @ w)
        if port_vol <= 0:
            return 1e6
        return float(-((port_ret - risk_free_rate) / port_vol))

    result = minimize(
        objective,
        init,
        method="SLSQP",
        bounds=_bounds(n, max_weight),
        constraints=[_sum_to_one_constraint()],
    )
    return result.x if result.success else init


def current_weights_from_holdings(values: pd.Series) -> pd.Series:
    total = values.sum()
    if total <= 0:
        return pd.Series(np.full(len(values), 1 / len(values)), index=values.index)
    return values / total

