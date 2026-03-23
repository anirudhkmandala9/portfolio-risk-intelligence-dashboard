import numpy as np
import pandas as pd

from app.services.optimization import max_sharpe_weights, min_vol_weights


def _returns_frame() -> pd.DataFrame:
    np.random.seed(42)
    return pd.DataFrame(
        {
            "AAPL": np.random.normal(0.0008, 0.02, size=252),
            "MSFT": np.random.normal(0.0007, 0.018, size=252),
            "TLT": np.random.normal(0.0002, 0.008, size=252),
        }
    )


def test_min_vol_weights_sum_to_one_and_are_bounded():
    returns = _returns_frame()
    weights = min_vol_weights(returns, max_weight=0.6)
    assert np.isclose(weights.sum(), 1.0, atol=1e-6)
    assert (weights >= -1e-8).all()
    assert (weights <= 0.6 + 1e-8).all()


def test_max_sharpe_weights_sum_to_one_and_are_bounded():
    returns = _returns_frame()
    weights = max_sharpe_weights(returns, max_weight=0.6)
    assert np.isclose(weights.sum(), 1.0, atol=1e-6)
    assert (weights >= -1e-8).all()
    assert (weights <= 0.6 + 1e-8).all()

