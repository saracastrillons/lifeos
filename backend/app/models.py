from datetime import date
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey
from .database import Base


class Habit(Base):
    __tablename__ = "habits"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    color = Column(String(20), default="#22d3ee")


class HabitLog(Base):
    __tablename__ = "habit_logs"
    id = Column(Integer, primary_key=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), index=True)
    date = Column(Date, default=date.today, index=True)
    done = Column(Boolean, default=True)


class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True)
    title = Column(String(150), nullable=False)
    category = Column(String(60), default="General")
    progress = Column(Float, default=0)
    target_date = Column(Date, nullable=True)


class LearningItem(Base):
    __tablename__ = "learning"
    id = Column(Integer, primary_key=True)
    title = Column(String(150), nullable=False)
    category = Column(String(60), default="General")
    progress = Column(Float, default=0)
    hours = Column(Float, default=0)


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    title = Column(String(150), nullable=False)
    done = Column(Boolean, default=False)
    priority = Column(String(20), default="media")


class FocusSession(Base):
    __tablename__ = "focus_sessions"
    id = Column(Integer, primary_key=True)
    date = Column(Date, default=date.today)
    minutes = Column(Integer, default=25)


class DayMetric(Base):
    __tablename__ = "day_metrics"
    date = Column(Date, primary_key=True)
    hrv = Column(Float)
    sleep = Column(Float)
    deep_minutes = Column(Integer)
    productivity = Column(Float)