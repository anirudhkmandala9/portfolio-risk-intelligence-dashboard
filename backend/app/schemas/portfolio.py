from pydantic import BaseModel, Field


class HoldingCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    shares: float = Field(0.0, ge=0.0)
    weight: float = Field(0.0, ge=0.0, le=1.0)
    purchase_price: float = Field(0.0, ge=0.0)
    asset_class: str = Field(default="Equity", min_length=1, max_length=50)
    sector: str = Field(default="Unknown", min_length=1, max_length=80)


class HoldingRead(HoldingCreate):
    id: int
    portfolio_id: int

    class Config:
        from_attributes = True


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    benchmark_ticker: str = Field(default="SPY", min_length=1, max_length=20)
    holdings: list[HoldingCreate] = Field(default_factory=list)


class PortfolioRead(BaseModel):
    id: int
    name: str
    benchmark_ticker: str
    holdings: list[HoldingRead] = Field(default_factory=list)

    class Config:
        from_attributes = True

