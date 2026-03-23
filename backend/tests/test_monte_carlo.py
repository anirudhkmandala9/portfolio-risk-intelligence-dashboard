import numpy as np
import pandas as pd

from app.services.monte_carlo import run_monte_carlo


def test_monte_carlo_returns_expected_keys():
    np.random.seed(42)
    returns = pd.DataFrame({
        "AAPL": np.random.normal(0.0008, 0.02, size=252),
        "MSFT": np.random.normal(0.0007, 0.018, size=252),
    })
    weights = np.array([0.6, 0.4])

    result = run_monte_carlo(returns, weights, n_simulations=500, horizon_days=60)

    assert "paths" in result
    assert "statistics" in result
    assert "distribution" in result
    assert result["n_simulations"] == 500
    assert result["horizon_days"] == 60


def test_monte_carlo_statistics_are_finite():
    np.random.seed(0)
    returns = pd.DataFrame({
        "A": np.random.normal(0.0005, 0.015, size=252),
        "B": np.random.normal(0.0003, 0.01, size=252),
    })
    weights = np.array([0.5, 0.5])

    result = run_monte_carlo(returns, weights, n_simulations=1000, horizon_days=252)
    stats = result["statistics"]

    assert np.isfinite(stats["expected_return"])
    assert np.isfinite(stats["mc_var_95"])
    assert 0 <= stats["prob_loss"] <= 1
    assert 0 <= stats["prob_gain_10"] <= 1


def test_monte_carlo_path_lengths():
    np.random.seed(1)
    returns = pd.DataFrame({"X": np.random.normal(0, 0.02, 100)})
    weights = np.array([1.0])

    result = run_monte_carlo(returns, weights, n_simulations=100, horizon_days=30)
    for key in ["p5", "p50", "p95", "mean"]:
        assert len(result["paths"][key]) == 30
