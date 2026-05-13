from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class ScoreCreate(BaseModel):
    score: int = Field(ge=0)
    level: int = Field(ge=1)
    lines: int = Field(ge=0)


class ScoreOut(BaseModel):
    id: int
    score: int
    level: int
    lines: int
    played_at: datetime

    model_config = {"from_attributes": True}


class TopScore(BaseModel):
    rank: int
    username: str
    score: int
