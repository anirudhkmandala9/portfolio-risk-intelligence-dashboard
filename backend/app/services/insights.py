from __future__ import annotations

import numpy as np
import pandas as pd

from app.services import analytics as an
from app.services import risk as rk


def generate_insights(
    portfolio_returns: pd.Series,
    benchmark_returns: pd.Series,
    weights: pd.Series,
    sector_weights: pd.Series,
    asset_returns: pd.DataFrame,
) -> list[str]:
    """Generate rules-based text insights about the portfolio."""
    insights: list[str] = []

    # Concentration
    top = weights.idxmax()
    top_pct = weights.max() * 100
    if top_pct > 30:
        insights.append(
            f"High concentration: {top} represents {top_pct:.1f}% of portfolio value."
        )
    if len(weights) <= 3:
        insights.append(
            "Low diversification: portfolio holds only "
            f"{len(weights)} asset{'s' if len(weights) > 1 else ''}."
        )

    # Sector tilt
    if not sector_weights.empty:
        top_sector = sector_weights.idxmax()
        top_sector_pct = sector_weights.max() * 100
        if top_sector_pct > 40:
            insights.append(
                f"Sector tilt: {top_sector_pct:.0f}% of the portfolio is in {top_sector}."
            )

    # Performance vs benchmark
    beta, alpha = an.beta_alpha(portfolio_returns, benchmark_returns)
    if alpha > 0.02:
        insights.append(
            f"Positive alpha of {alpha:.2%} — the portfolio outperformed on a risk-adjusted basis."
        )
    elif alpha < -0.02:
        insights.append(
            f"Negative alpha of {alpha:.2%} — the portfolio underperformed on a risk-adjusted basis."
        )

    # Drawdown
    mdd = an.max_drawdown(portfolio_returns)
    bm_mdd = an.max_drawdown(benchmark_returns)
    if mdd < bm_mdd:
        insights.append(
            f"Drawdown is worse than the benchmark ({mdd:.2%} vs {bm_mdd:.2%})."
        )
    elif mdd > bm_mdd * 0.8:
        insights.append(
            f"Max drawdown ({mdd:.2%}) is comparable to the benchmark ({bm_mdd:.2%})."
        )
    else:
        insights.append(
            f"Shallower drawdown than benchmark ({mdd:.2%} vs {bm_mdd:.2%})."
        )

    # Volatility
    vol = an.annualized_volatility(portfolio_returns)
    bm_vol = an.annualized_volatility(benchmark_returns)
    if vol > bm_vol * 1.2:
        insights.append(
            f"Portfolio is significantly more volatile than the benchmark "
            f"({vol:.2%} vs {bm_vol:.2%} annualized)."
        )

    # Risk contribution
    if not asset_returns.empty and len(weights) > 1:
        cov = asset_returns.cov() * 252
        common = [c for c in weights.index if c in cov.columns]
        if len(common) > 1:
            w = weights[common].values.astype(float)
            port_var = float(w @ cov.loc[common, common].values @ w)
            if port_var > 0:
                marginal = cov.loc[common, common].values @ w
                rc = w * marginal / port_var
                rc_series = pd.Series(rc, index=common)
                top_rc = rc_series.idxmax()
                top_rc_pct = rc_series.max() * 100
                if top_rc_pct > 30:
                    insights.append(
                        f"{top_rc} contributes {top_rc_pct:.0f}% of total portfolio risk."
                    )

    # Sharpe
    sr = an.sharpe_ratio(portfolio_returns)
    if sr > 1.0:
        insights.append(f"Strong risk-adjusted performance with a Sharpe ratio of {sr:.2f}.")
    elif sr < 0:
        insights.append(f"Negative Sharpe ratio ({sr:.2f}) — returns do not compensate for risk taken.")

    return insights
