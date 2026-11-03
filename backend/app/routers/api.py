import math
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db, Base, engine
from ..models import Habit, HabitLog, Goal, LearningItem, Task, FocusSession, DayMetric
from .. import schemas as S
from ..services.analytics import build_insights, chat_reply, simulate as run_simulation, estimate_hrv

router = APIRouter(prefix="/api")
DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]


def row(x):
    return {c.name: getattr(x, c.name) for c in x.__table__.columns}


def habit_rows(db, n=14):
    days = [date.today() - timedelta(days=i) for i in range(n - 1, -1, -1)]
    done = {(l.habit_id, l.date) for l in db.query(HabitLog).filter(HabitLog.date >= days[0])}
    habits = []
    for h in db.query(Habit).order_by(Habit.id):
        flags = [(h.id, d) in done for d in days]
        i = n - 1
        if not flags[i]:
            i -= 1
        s = 0
        while i >= 0 and flags[i]:
            s += 1
            i -= 1
        habits.append({"id": h.id, "name": h.name, "color": h.color, "flags": flags,
                       "streak": s, "rate": round(100 * sum(flags) / n)})
    return {"days": [{"date": d.isoformat(), "label": DAYS[d.weekday()]} for d in days], "habits": habits}


def day_streak(hr):
    n, t = len(hr["days"]), len(hr["habits"]) or 1
    ok = [sum(h["flags"][i] for h in hr["habits"]) / t >= 0.5 for i in range(n)]
    i = n - 1
    if not ok[i]:
        i -= 1
    s = 0
    while i >= 0 and ok[i]:
        s += 1
        i -= 1
    return s


def level_info(db):
    """Gamificación: cada acción suma XP; el nivel crece con la raíz cuadrada (cada nivel cuesta más)."""
    logs = db.query(func.count(HabitLog.id)).scalar() or 0
    focus = db.query(func.coalesce(func.sum(FocusSession.minutes), 0)).scalar()
    deep = db.query(func.coalesce(func.sum(DayMetric.deep_minutes), 0)).scalar()
    tasks = db.query(func.count(Task.id)).filter(Task.done.is_(True)).scalar() or 0
    xp = int(logs * 10 + focus + deep // 4 + tasks * 25)
    level = int(math.sqrt(xp / 120)) + 1
    lo, hi = 120 * (level - 1) ** 2, 120 * level ** 2
    return {"xp": xp, "level": level, "progress": round(100 * (xp - lo) / (hi - lo)), "next": hi - xp}


def focus_today(db):
    today = db.get(DayMetric, date.today())
    extra = db.query(func.coalesce(func.sum(FocusSession.minutes), 0)).filter(FocusSession.date == date.today()).scalar()
    return ((today.deep_minutes or 0) if today else 0) + extra


def _avg(xs):
    return sum(xs) / len(xs) if xs else None


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    hr = habit_rows(db, 60)
    total = len(hr["habits"]) or 1
    done_today = sum(h["flags"][-1] for h in hr["habits"])
    metrics = db.query(DayMetric).order_by(DayMetric.date.desc()).limit(14).all()[::-1]
    today = db.get(DayMetric, date.today())
    deep = focus_today(db)
    score = round(35 + 35 * done_today / total + 30 * min(deep / 240, 1))
    tasks = [row(t) for t in db.query(Task).order_by(Task.done, Task.id)]
    ins = build_insights(db)
    scored = [m.productivity for m in metrics if m.productivity is not None]
    this_w, prev_w = _avg(scored[-7:]), _avg(scored[-14:-7])
    daily_rate = [round(100 * sum(h["flags"][i] for h in hr["habits"]) / total) for i in range(len(hr["days"]))]
    return {
        "focus": {"score": score, "deep_minutes": deep,
                  "flow": "Alto" if score >= 75 else "Medio" if score >= 50 else "Bajo"},
        "streak": day_streak(hr),
        "habits_today": {"done": done_today, "total": total},
        "grid": {"days": hr["days"][-7:], "habits": [{**h, "flags": h["flags"][-7:]} for h in hr["habits"]]},
        "biometrics": [{"label": f"{m.date.day}/{m.date.month}", "hrv": m.hrv, "sleep": m.sleep} for m in metrics],
        "goals": [row(g) for g in db.query(Goal).order_by(Goal.id)][:4],
        "tasks": tasks,
        "checkin": row(today) if today and today.productivity is not None else None,
        "week": {"avg": round(this_w, 1) if this_w is not None else None,
                 "delta": round(this_w - prev_w, 1) if this_w is not None and prev_w is not None else None},
        "sparks": {"productivity": scored[-14:], "deep": [m.deep_minutes or 0 for m in metrics],
                   "habits": daily_rate[-14:]},
        "level": level_info(db),
        "insight": {"headline": ins.get("headline"), "prediction": ins.get("prediction")},
    }


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    return {"level": level_info(db), "streak": day_streak(habit_rows(db, 60))}


@router.get("/heatmap")
def heatmap(days: int = Query(182, ge=7, le=366), db: Session = Depends(get_db)):
    start = date.today() - timedelta(days=days - 1)
    metrics = {m.date: m for m in db.query(DayMetric).filter(DayMetric.date >= start)}
    total = db.query(func.count(Habit.id)).scalar() or 1
    per_day = dict(db.query(HabitLog.date, func.count(HabitLog.id))
                   .filter(HabitLog.date >= start).group_by(HabitLog.date).all())
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        m = metrics.get(d)
        out.append({"date": d.isoformat(), "score": m.productivity if m else None,
                    "habits": round(100 * per_day.get(d, 0) / total), "sleep": m.sleep if m else None})
    return out


@router.get("/habits")
def habits(days: int = Query(14, ge=1, le=366), db: Session = Depends(get_db)):
    return habit_rows(db, days)


@router.post("/habits")
def add_habit(body: S.HabitIn, db: Session = Depends(get_db)):
    h = Habit(**body.model_dump())
    db.add(h)
    db.commit()
    return row(h)


@router.post("/habits/{hid}/toggle")
def toggle(hid: int, day: Optional[date] = None, db: Session = Depends(get_db)):
    day = day or date.today()
    if day > date.today():
        raise HTTPException(400, "No puedes registrar días futuros")
    if not db.get(Habit, hid):
        raise HTTPException(404, "Hábito no encontrado")
    log = db.query(HabitLog).filter_by(habit_id=hid, date=day).first()
    if log:
        db.delete(log)
    else:
        db.add(HabitLog(habit_id=hid, date=day, done=True))
    db.commit()
    return {"ok": True, "done": not log}


@router.delete("/habits/{hid}")
def del_habit(hid: int, db: Session = Depends(get_db)):
    db.query(HabitLog).filter_by(habit_id=hid).delete()
    db.query(Habit).filter_by(id=hid).delete()
    db.commit()
    return {"ok": True}


def crud(path, Model, Create, Patch):
    @router.get(f"/{path}")
    def lst(db: Session = Depends(get_db)):
        return [row(x) for x in db.query(Model).order_by(Model.id)]

    @router.post(f"/{path}")
    def create(body: Create, db: Session = Depends(get_db)):
        x = Model(**body.model_dump())
        db.add(x)
        db.commit()
        return row(x)

    @router.patch(f"/{path}/{{item_id}}")
    def patch(item_id: int, body: Patch, db: Session = Depends(get_db)):
        x = db.get(Model, item_id)
        if not x:
            raise HTTPException(404, "No encontrado")
        for k, v in body.model_dump(exclude_none=True).items():
            setattr(x, k, v)
        db.commit()
        return row(x)

    @router.delete(f"/{path}/{{item_id}}")
    def delete(item_id: int, db: Session = Depends(get_db)):
        db.query(Model).filter_by(id=item_id).delete()
        db.commit()
        return {"ok": True}


crud("goals", Goal, S.GoalIn, S.GoalPatch)
crud("learning", LearningItem, S.LearnIn, S.LearnPatch)
crud("tasks", Task, S.TaskIn, S.TaskPatch)


@router.post("/focus")
def focus(body: S.FocusIn, db: Session = Depends(get_db)):
    db.add(FocusSession(minutes=body.minutes))
    db.commit()
    return {"ok": True, "today": focus_today(db)}


@router.get("/checkin")
def get_checkin(db: Session = Depends(get_db)):
    m = db.get(DayMetric, date.today())
    return row(m) if m and m.productivity is not None else None


@router.post("/checkin")
def checkin(body: S.CheckinIn, db: Session = Depends(get_db)):
    hrv = body.hrv if body.hrv is not None else round(estimate_hrv(db, body.sleep))
    m = db.get(DayMetric, date.today())
    if not m:
        m = DayMetric(date=date.today(), deep_minutes=0)
        db.add(m)
    m.sleep, m.productivity, m.hrv = body.sleep, body.productivity, hrv
    db.commit()
    return row(m)


@router.get("/insights")
def insights(db: Session = Depends(get_db)):
    return build_insights(db)


@router.post("/simulate")
def simulate(body: S.SimulateIn, db: Session = Depends(get_db)):
    return run_simulation(db, body.sleep, body.habits)


@router.post("/chat")
def chat(body: S.ChatIn, db: Session = Depends(get_db)):
    return {"reply": chat_reply(body.message, db, day_streak(habit_rows(db, 60)))}


@router.get("/export")
def export(db: Session = Depends(get_db)):
    tables = {"habits": Habit, "habit_logs": HabitLog, "goals": Goal, "learning": LearningItem,
              "tasks": Task, "focus_sessions": FocusSession, "day_metrics": DayMetric}
    return {"app": "LifeOS", "exported_at": date.today().isoformat(),
            **{k: [row(x) for x in db.query(M)] for k, M in tables.items()}}


@router.post("/demo/reset")
def reset_demo(db: Session = Depends(get_db)):
    """Restaura los datos de demostración (útil para enseñar el proyecto)."""
    from seed import seed
    db.close()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    seed(db)
    return {"ok": True}
