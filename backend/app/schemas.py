from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field


class HabitIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    color: str = "#22d3ee"


class GoalIn(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    category: str = "General"
    progress: float = Field(default=0, ge=0, le=100)
    target_date: Optional[date] = None


class GoalPatch(BaseModel):
    title: Optional[str] = None
    progress: Optional[float] = Field(default=None, ge=0, le=100)


class LearnIn(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    category: str = "General"
    progress: float = Field(default=0, ge=0, le=100)
    hours: float = 0


class LearnPatch(BaseModel):
    progress: Optional[float] = Field(default=None, ge=0, le=100)
    hours: Optional[float] = None


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    priority: Literal["alta", "media", "baja"] = "media"


class TaskPatch(BaseModel):
    done: Optional[bool] = None


class FocusIn(BaseModel):
    minutes: int = Field(ge=1, le=600)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)


class CheckinIn(BaseModel):
    sleep: float = Field(ge=0, le=14)
    productivity: float = Field(ge=0, le=100)
    hrv: Optional[float] = Field(default=None, ge=10, le=200)


class SimulateIn(BaseModel):
    sleep: float = Field(ge=3, le=12)
    habits: list[str] = []
