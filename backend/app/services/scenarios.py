from __future__ import annotations

import pandas as pd

from app.schemas.scenario import ScenarioShock


def run_scenario_impacts(
    holdings: pd.DataFrame,
    shocks: list[ScenarioShock],
) -> dict[str, float]:
    if holdings.empty:
        return {}

    holdings = holdings.copy()
    holdings["position_value"] = holdings["shares"] * holdings["purchase_price"]
    portfolio_value = holdings["position_value"].sum()
    if portfolio_value <= 0:
        return {shock.label: 0.0 for shock in shocks}

    impacts: dict[str, float] = {}
    for shock in shocks:
        impacted = holdings
        if shock.ticker:
            impacted = impacted[impacted["ticker"].str.upper() == shock.ticker.upper()]
        if shock.sector:
            impacted = impacted[impacted["sector"].str.lower() == shock.sector.lower()]
        impacted_value = impacted["position_value"].sum()
        impact_pct = (impacted_value / portfolio_value) * shock.shock_pct
        impacts[shock.label] = float(impact_pct)
    return impacts

