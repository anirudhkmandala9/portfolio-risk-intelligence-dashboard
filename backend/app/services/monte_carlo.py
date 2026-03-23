from __future__ import annotations

import numpy as np
import pandas as pd


def run_monte_carlo(
    returns: pd.DataFrame,
    weights: np.ndarray,
    n_simulations: int = 5000,
    horizon_days: int = 252,
) -> dict:
    """Simulate future portfolio paths using geometric Brownian motion.

    Parameters
    ----------
    returns : pd.DataFrame
        Historical daily returns for each asset.
    weights : np.ndarray
        Current portfolio weights aligned with returns columns.
    n_simulations : int
        Number of simulation paths.
    horizon_days : int
        Trading days to project forward.

    Returns
    -------
    dict with simulation statistics and path percentiles.
    """
    port_returns = returns.values @ weights
    mu = float(np.mean(port_returns))
    sigma = float(np.std(port_returns, ddof=1))

    rng = np.random.default_rng(seed=42)
    sims = rng.normal(mu, sigma, size=(n_simulations, horizon_days))
    cum_paths = np.cumprod(1 + sims, axis=1)

    final_values = cum_paths[:, -1]

    percentiles = [5, 10, 25, 50, 75, 90, 95]
    path_percentiles: dict[str, list[float]] = {}
    for p in percentiles:
        path = np.percentile(cum_paths, p, axis=0)
        path_percentiles[f"p{p}"] = [round(float(v), 5) for v in path]

    mean_path = np.mean(cum_paths, axis=0)
    path_percentiles["mean"] = [round(float(v), 5) for v in mean_path]

    prob_loss = float(np.mean(final_values < 1.0))
    prob_gain_10 = float(np.mean(final_values > 1.10))
    prob_gain_20 = float(np.mean(final_values > 1.20))

    expected_return = float(np.mean(final_values) - 1)
    mc_var_95 = float(1 - np.percentile(final_values, 5))
    mc_cvar_95 = float(1 - np.mean(final_values[final_values <= np.percentile(final_values, 5)]))

    return {
        "n_simulations": n_simulations,
        "horizon_days": horizon_days,
        "paths": path_percentiles,
        "statistics": {
            "expected_return": round(expected_return, 5),
            "median_return": round(float(np.median(final_values) - 1), 5),
            "best_case": round(float(np.max(final_values) - 1), 5),
            "worst_case": round(float(np.min(final_values) - 1), 5),
            "mc_var_95": round(mc_var_95, 5),
            "mc_cvar_95": round(mc_cvar_95, 5),
            "prob_loss": round(prob_loss, 4),
            "prob_gain_10": round(prob_gain_10, 4),
            "prob_gain_20": round(prob_gain_20, 4),
            "std_final": round(float(np.std(final_values)), 5),
        },
        "distribution": {
            "bins": _histogram_bins(final_values, n_bins=40),
        },
    }


def _histogram_bins(values: np.ndarray, n_bins: int = 40) -> list[dict]:
    counts, edges = np.histogram(values, bins=n_bins)
    return [
        {
            "x": round(float((edges[i] + edges[i + 1]) / 2 - 1) * 100, 2),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]
