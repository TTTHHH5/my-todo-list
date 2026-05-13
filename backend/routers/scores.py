from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from .. import models, schemas
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/api/scores", tags=["scores"])


@router.post("", response_model=schemas.ScoreOut)
def create_score(
    body: schemas.ScoreCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = models.GameRecord(
        user_id=current_user.id,
        score=body.score,
        level=body.level,
        lines=body.lines,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/top", response_model=List[schemas.TopScore])
def get_top_scores(db: Session = Depends(get_db)):
    subq = (
        db.query(
            models.GameRecord.user_id,
            func.max(models.GameRecord.score).label("best_score"),
        )
        .group_by(models.GameRecord.user_id)
        .subquery()
    )
    rows = (
        db.query(models.User.username, subq.c.best_score)
        .join(subq, models.User.id == subq.c.user_id)
        .order_by(subq.c.best_score.desc())
        .limit(3)
        .all()
    )
    return [{"rank": i + 1, "username": r.username, "score": r.best_score} for i, r in enumerate(rows)]


@router.get("/me", response_model=List[schemas.ScoreOut])
def get_my_scores(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.GameRecord)
        .filter(models.GameRecord.user_id == current_user.id)
        .order_by(models.GameRecord.played_at.desc())
        .limit(10)
        .all()
    )
