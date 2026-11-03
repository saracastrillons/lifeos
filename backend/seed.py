import random
from datetime import date, timedelta
from app.database import Base, engine, SessionLocal
from app.models import Habit, HabitLog, Goal, LearningItem, Task, DayMetric, FocusSession


def seed(db, days=180):
    """Genera ~6 meses de historial sintético con relaciones reales que el modelo debe descubrir."""
    if db.query(Habit).count():
        return
    random.seed(7)
    spec = [("Meditar", "#22d3ee", .65), ("Ejercicio", "#a78bfa", .55), ("Leer 30 min", "#f472b6", .6),
            ("Código profundo", "#34d399", .7), ("Sin redes antes de las 12", "#fb923c", .45)]
    hs = [Habit(name=n, color=c) for n, c, _ in spec]
    db.add_all(hs)
    db.flush()
    for i in range(days - 1, -1, -1):
        d = date.today() - timedelta(days=i)
        # La constancia mejora con el tiempo: el usuario "aprende" a usar LifeOS
        boost = 0.12 * (1 - i / days)
        done = [random.random() < p + boost for _, _, p in spec]
        for h, ok in zip(hs, done):
            if ok:
                db.add(HabitLog(habit_id=h.id, date=d, done=True))
        sleep = max(4.5, min(9.5, round(random.gauss(7, .9), 1)))
        hrv = int(55 + (sleep - 7) * 6 + done[0] * 6 + done[1] * 5 + random.gauss(0, 4))
        deep = int(max(20, 90 + done[3] * 70 + done[0] * 35 + done[1] * 25 + (sleep - 7) * 25 + random.gauss(0, 25)))
        prod = min(98, max(25, 45 + done[0] * 11 + done[1] * 9 + done[3] * 10 + done[4] * 3 + (sleep - 7) * 5
                           + (4 if d.weekday() in (1, 2, 3) else -3 if d.weekday() == 6 else 0) + random.gauss(0, 5)))
        if i == 0:
            # Hoy: el check-in (sueño y productividad) lo hace el usuario desde el dashboard
            db.add(DayMetric(date=d, deep_minutes=int(deep * .45)))
        else:
            db.add(DayMetric(date=d, hrv=hrv, sleep=sleep, deep_minutes=deep, productivity=round(prod, 1)))
    t = date.today()
    db.add_all([
        Goal(title="Lanzar mi proyecto personal", category="Carrera", progress=62, target_date=t + timedelta(days=60)),
        Goal(title="Correr 10 km sin parar", category="Salud", progress=45, target_date=t + timedelta(days=45)),
        Goal(title="Ahorrar para el viaje", category="Finanzas", progress=30, target_date=t + timedelta(days=120)),
        Goal(title="Leer 12 libros este año", category="Mente", progress=75, target_date=t + timedelta(days=60)),
        Goal(title="Certificación cloud", category="Carrera", progress=18, target_date=t + timedelta(days=90)),
        LearningItem(title="Machine Learning con Python", category="IA", progress=58, hours=34),
        LearningItem(title="React avanzado", category="Frontend", progress=80, hours=41),
        LearningItem(title="SQL y bases de datos", category="Datos", progress=35, hours=12),
        LearningItem(title="Arquitectura de software", category="Sistemas", progress=22, hours=9),
        Task(title="Terminar el módulo de insights", priority="alta"),
        Task(title="Revisar métricas de la semana", priority="media"),
        Task(title="Planear el sprint de mañana", priority="media"),
        Task(title="Escribir tests del simulador", priority="alta"),
        Task(title="Responder correos pendientes", priority="baja", done=True),
        FocusSession(date=t, minutes=25),
    ])
    db.commit()


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    s = SessionLocal()
    seed(s)
    s.close()
    print("Datos de ejemplo listos.")
