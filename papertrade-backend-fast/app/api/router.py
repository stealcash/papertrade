from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.engine.backtest import BacktestEngine
from pydantic import BaseModel
from typing import List

router = APIRouter()

class BacktestRequest(BaseModel):
    run_id: int
    stock_ids: List[int]

@router.post("/compute/backtest")
async def run_backtest(
    request: BacktestRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    engine = BacktestEngine(db, request.run_id)
    # We run it in background to return early
    background_tasks.add_task(engine.execute, request.stock_ids)
    return {"message": "Backtest initiated", "run_id": request.run_id}

# Placeholder for Option Backtest
@router.post("/compute/option-backtest")
async def run_option_backtest(
    request: BacktestRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    from app.engine.option_backtest import OptionBacktestEngine
    engine = OptionBacktestEngine(db, request.run_id)
    background_tasks.add_task(engine.execute)
    return {"message": "Option Backtest initiated", "run_id": request.run_id}
