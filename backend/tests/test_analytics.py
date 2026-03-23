import numpy as np
import pandas as pd

from app.services.analytics import annualized_return, annualized_volatility, max_drawdown, sharpe_ratio
from app.services.risk import expected_shortfall, historical_var, parametric_var


def test_annualized_metrics_are_finite():
    returns = pd.Series(np.random.normal(0.0005, 0.01, size=252))
    ann_ret = annualized_return(returns)
    ann_vol = annualized_volatility(returns)
    sr = sharpe_ratio(returns)

    assert np.isfinite(ann_ret)
    assert ann_vol > 0
    assert np.isfinite(sr)


def test_drawdown_non_positive():
    returns = pd.Series([0.01, -0.03, 0.02, -0.01, 0.005])
    dd = max_drawdown(returns)
    assert dd <= 0


def test_var_and_es_positive():
    returns = pd.Series(np.random.normal(0.0003, 0.012, size=300))
    h_var = historical_var(returns, 0.95)
    p_var = parametric_var(returns, 0.95)
    es = expected_shortfall(returns, 0.95)

    assert h_var >= 0
    assert p_var >= 0
    assert es >= 0

