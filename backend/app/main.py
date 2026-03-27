from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, engine
from app.routers.analytics import router as analytics_router
from app.routers.benchmark import router as benchmark_router
from app.routers.market_data import router as market_data_router
from app.routers.optimization import router as optimization_router
from app.routers.portfolio import router as portfolio_router
from app.routers.risk import router as risk_router
from app.routers.scenarios import router as scenarios_router
from app.routers.charts import router as charts_router
from app.routers.export import router as export_router
from app import models  # noqa: F401


settings = get_settings()

app = FastAPI(
    title="Portfolio Risk Intelligence Dashboard API",
    description="Backend API for portfolio analytics and risk intelligence.",
    version="0.1.0",
)

origins = list(settings.allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(portfolio_router)
app.include_router(market_data_router)
app.include_router(analytics_router)
app.include_router(risk_router)
app.include_router(benchmark_router)
app.include_router(scenarios_router)
app.include_router(optimization_router)
app.include_router(charts_router)
app.include_router(export_router)


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    """Root URL — avoids 404 on load balancer / platform probes that hit `/`."""

    return {"service": "portfolio-risk-api", "status": "ok"}


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    """Lightweight health check endpoint."""

    return {"status": "ok"}

