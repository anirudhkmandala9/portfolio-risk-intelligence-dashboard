from __future__ import annotations

import numpy as np
import pandas as pd


def annualized_return(returns: pd.Series) -> float:
    if returns.empty:
        return 0.0
    cumulative = float((1 + returns).prod())
    years = max(len(returns) / 252.0, 1 / 252.0)
    return float(cumulative ** (1 / years) - 1)


def annualized_volatility(returns: pd.Series) -> float:
    if returns.empty:
        return 0.0
    return float(returns.std(ddof=1) * np.sqrt(252))


def sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.02) -> float:
    vol = annualized_volatility(returns)
    if vol <= 0:
        return 0.0
    return float((annualized_return(returns) - risk_free_rate) / vol)


def sortino_ratio(returns: pd.Series, risk_free_rate: float = 0.02) -> float:
    downside = returns[returns < 0]
    if downside.empty:
        return 0.0
    downside_std = float(downside.std(ddof=1) * np.sqrt(252))
    if downside_std <= 0:
        return 0.0
    return float((annualized_return(returns) - risk_free_rate) / downside_std)


def max_drawdown(returns: pd.Series) -> float:
    if returns.empty:
        return 0.0
    wealth = (1 + returns).cumprod()
    peaks = wealth.cummax()
    drawdown = (wealth / peaks) - 1
    return float(drawdown.min())


def tracking_error(portfolio: pd.Series, benchmark: pd.Series) -> float:
    aligned = pd.concat([portfolio, benchmark], axis=1).dropna()
    if aligned.empty:
        return 0.0
    active = aligned.iloc[:, 0] - aligned.iloc[:, 1]
    return float(active.std(ddof=1) * np.sqrt(252))


def info_ratio(portfolio: pd.Series, benchmark: pd.Series) -> float:
    aligned = pd.concat([portfolio, benchmark], axis=1).dropna()
    if aligned.empty:
        return 0.0
    active = aligned.iloc[:, 0] - aligned.iloc[:, 1]
    te = active.std(ddof=1) * np.sqrt(252)
    if te <= 0:
        return 0.0
    return float((active.mean() * 252) / te)


def beta_alpha(portfolio: pd.Series, benchmark: pd.Series, risk_free_rate: float = 0.02) -> tuple[float, float]:
    aligned = pd.concat([portfolio, benchmark], axis=1).dropna()
    if aligned.empty:
        return 0.0, 0.0
    p = aligned.iloc[:, 0]
    b = aligned.iloc[:, 1]
    var_b = float(np.var(b, ddof=1))
    if var_b <= 0:
        return 0.0, 0.0
    cov = float(np.cov(p, b, ddof=1)[0, 1])
    beta = cov / var_b
    alpha = (p.mean() - (risk_free_rate / 252) - beta * (b.mean() - (risk_free_rate / 252))) * 252
    return float(beta), float(alpha)

