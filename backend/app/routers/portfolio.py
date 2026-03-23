from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.holding import Holding
from app.models.portfolio import Portfolio
from app.schemas.portfolio import HoldingCreate, HoldingRead, PortfolioCreate, PortfolioRead

router = APIRouter(prefix="/portfolios", tags=["portfolio"])


def _normalize_holding(item: HoldingCreate) -> HoldingCreate:
    ticker = item.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker cannot be empty.")
    return HoldingCreate(
        ticker=ticker,
        shares=item.shares,
        weight=item.weight,
        purchase_price=item.purchase_price,
        asset_class=item.asset_class,
        sector=item.sector,
    )


@router.post("", response_model=PortfolioRead)
def create_portfolio(payload: PortfolioCreate, db: Session = Depends(get_db)) -> Portfolio:
    portfolio = Portfolio(
        name=payload.name.strip(),
        benchmark_ticker=payload.benchmark_ticker.strip().upper(),
    )
    db.add(portfolio)
    db.flush()

    for holding_payload in payload.holdings:
        h = _normalize_holding(holding_payload)
        db.add(
            Holding(
                portfolio_id=portfolio.id,
                ticker=h.ticker,
                shares=h.shares,
                weight=h.weight,
                purchase_price=h.purchase_price,
                asset_class=h.asset_class,
                sector=h.sector,
            )
        )

    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.get("", response_model=list[PortfolioRead])
def list_portfolios(db: Session = Depends(get_db)) -> list[Portfolio]:
    return db.query(Portfolio).order_by(Portfolio.created_at.desc()).all()


@router.get("/{portfolio_id}/holdings", response_model=list[HoldingRead])
def get_holdings(portfolio_id: int, db: Session = Depends(get_db)) -> list[Holding]:
    exists = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Portfolio not found.")
    return db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()


@router.post("/{portfolio_id}/holdings/upload", response_model=list[HoldingRead])
async def upload_holdings_csv(
    portfolio_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> list[Holding]:
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found.")
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be CSV.")

    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    required = {"ticker", "shares", "purchase_price"}
    if not required.issubset(set(df.columns.str.lower())):
        raise HTTPException(status_code=400, detail="CSV must include ticker, shares, purchase_price.")

    normalized_columns = {c.lower(): c for c in df.columns}
    db.query(Holding).filter(Holding.portfolio_id == portfolio_id).delete()

    for _, row in df.iterrows():
        ticker = str(row[normalized_columns["ticker"]]).strip().upper()
        if not ticker:
            continue
        shares = float(row[normalized_columns["shares"]])
        purchase_price = float(row[normalized_columns["purchase_price"]])
        weight = float(row[normalized_columns.get("weight", normalized_columns["shares"])]) if "weight" in normalized_columns else 0.0
        asset_class = str(row[normalized_columns["asset_class"]]) if "asset_class" in normalized_columns else "Equity"
        sector = str(row[normalized_columns["sector"]]) if "sector" in normalized_columns else "Unknown"
        db.add(
            Holding(
                portfolio_id=portfolio_id,
                ticker=ticker,
                shares=max(shares, 0.0),
                weight=max(weight, 0.0),
                purchase_price=max(purchase_price, 0.0),
                asset_class=asset_class,
                sector=sector,
            )
        )

    db.commit()
    return db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()

