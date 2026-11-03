"""Motor analítico de LifeOS: Pandas + scikit-learn sobre tu historial.

- Efecto de cada hábito (lift) y correlaciones de Pearson.
- Random Forest con validación cruzada K-Fold (métricas fuera de muestra, no de entrenamiento).
- Simulador "¿y si…?": predice tu productividad para un escenario hipotético.
- El modelo se cachea y solo se reentrena cuando cambian los datos.
"""
import threading
import unicodedata

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_val_predict
from sqlalchemy import func

from ..models import DayMetric, Habit, HabitLog

WD = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
WD_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
MIN_DAYS = 10

_cache = {"key": None, "value": None}
_lock = threading.Lock()


def _forest(n=200):
    return RandomForestRegressor(n_estimators=n, min_samples_leaf=3, random_state=1)


def data_key(db):
    """Huella barata de los datos: si no cambia, reutilizamos el modelo entrenado."""
    q = lambda col: db.query(col).scalar()  # noqa: E731
    return (q(func.count(HabitLog.id)), q(func.max(HabitLog.id)), q(func.count(Habit.id)), q(func.max(Habit.id)),
            q(func.count(DayMetric.productivity)), q(func.sum(DayMetric.productivity)), q(func.sum(DayMetric.sleep)))


def frame(db):
    rows = [{"date": r.date, "hrv": r.hrv, "sleep": r.sleep, "deep": r.deep_minutes, "score": r.productivity}
            for r in db.query(DayMetric).filter(DayMetric.productivity.isnot(None)).order_by(DayMetric.date)]
    names = [h.name for h in db.query(Habit).order_by(Habit.id)]
    ids = {h.id: h.name for h in db.query(Habit)}
    df = pd.DataFrame(rows)
    if df.empty:
        return df, names
    logs = pd.DataFrame([{"date": l.date, "habit": ids.get(l.habit_id), "done": int(l.done)}
                         for l in db.query(HabitLog)])
    if not logs.empty:
        piv = logs.pivot_table(index="date", columns="habit", values="done", aggfunc="max")
        df = df.merge(piv, left_on="date", right_index=True, how="left")
    for n in names:
        df[n] = df[n].fillna(0) if n in df else 0
    return df.reset_index(drop=True), names


def _compute(db):
    df, names = frame(db)
    if len(df) < MIN_DAYS:
        return {"ready": False, "days": len(df), "needed": MIN_DAYS}
    feats = ["sleep", "hrv"] + names
    X, y = df[feats], df["score"]

    # Efecto de cada hábito: media con hábito vs. sin hábito
    lifts = []
    for n in names:
        if df[n].nunique() > 1:
            on, off = df[df[n] == 1]["score"], df[df[n] == 0]["score"]
            lifts.append({"habit": n, "lift": round(float(on.mean() - off.mean()), 1),
                          "corr": round(float(df[n].corr(df["score"])), 2),
                          "rate": round(float(df[n].mean()) * 100)})
    lifts.sort(key=lambda x: -x["lift"])

    df["wd"] = pd.to_datetime(df["date"]).dt.day_of_week
    g = df.groupby("wd")["score"].mean()
    weekdays = [{"day": WD_SHORT[i], "score": round(float(g.get(i, 0)), 1)} for i in range(7)]
    best_i = max(range(7), key=lambda i: weekdays[i]["score"])

    # Modelo + validación cruzada: métricas honestas sobre días que el modelo no vio
    model = _forest().fit(X, y)
    folds = KFold(n_splits=5, shuffle=True, random_state=1)
    oof = cross_val_predict(_forest(120), X, y, cv=folds)
    metrics = {
        "r2": round(float(r2_score(y, oof)), 2),
        "mae": round(float(mean_absolute_error(y, oof)), 1),
        "baseline_mae": round(float(np.mean(np.abs(y - y.mean()))), 1),
        "n_days": int(len(df)), "n_features": len(feats), "folds": 5,
    }
    imp = sorted([{"feature": _label(f), "weight": round(float(w) * 100, 1)}
                  for f, w in zip(feats, model.feature_importances_)], key=lambda x: -x["weight"])

    recent = df.tail(7)
    pred = float(model.predict(X.tail(7).mean().to_frame().T)[0])

    # Matriz de correlación (Pearson) entre todas las variables
    cols = feats + ["score"]
    corr = df[cols].astype(float).corr().fillna(0).round(2)

    # Tendencia: media móvil de 7 días
    roll = df["score"].rolling(7, min_periods=1).mean()
    trend = [{"label": f"{d.day}/{d.month}", "score": round(float(s), 1), "avg": round(float(a), 1)}
             for d, s, a in zip(df["date"].tail(60), df["score"].tail(60), roll.tail(60))]

    hrv_fit = np.polyfit(df["sleep"], df["hrv"], 1) if df["sleep"].nunique() > 1 else (0, float(df["hrv"].mean()))
    top = lifts[0] if lifts else None
    return {
        "ready": True,
        "lifts": lifts,
        "weekdays": weekdays,
        "best_day": WD[best_i],
        "importance": imp,
        "prediction": round(pred),
        "model_fit": round(max(metrics["r2"], 0) * 100),
        "metrics": metrics,
        "sleep_corr": round(float(df["sleep"].corr(df["score"])), 2),
        "avg_score": round(float(df["score"].mean()), 1),
        "correlation": {"labels": [_label(c) for c in cols], "values": corr.values.tolist()},
        "scatter": [{"sleep": float(s), "score": float(p)} for s, p in zip(df["sleep"], df["score"])],
        "trend": trend,
        "baseline": {"sleep": round(float(recent["sleep"].mean()), 1),
                     "habits": {n: bool(recent[n].mean() >= 0.5) for n in names}},
        "headline": (f"Los días que haces «{top['habit']}» tu productividad sube {top['lift']} puntos."
                     if top else "Registra más hábitos para descubrir patrones."),
        "_model": model, "_feats": feats, "_names": names, "_hrv_fit": [float(v) for v in hrv_fit],
    }


def _label(f):
    return {"sleep": "Sueño", "hrv": "HRV", "score": "Productividad"}.get(f, f)


def _model_bundle(db):
    key = data_key(db)
    with _lock:
        if _cache["key"] != key:
            _cache["value"] = _compute(db)
            _cache["key"] = key
        return _cache["value"]


def build_insights(db):
    return {k: v for k, v in _model_bundle(db).items() if not k.startswith("_")}


def simulate(db, sleep, habits):
    """Predicción para un día hipotético: X horas de sueño + un conjunto de hábitos."""
    b = _model_bundle(db)
    if not b["ready"]:
        return {"ready": False}
    slope, icpt = b["_hrv_fit"]
    hrv = slope * sleep + icpt
    chosen = set(habits)
    row = {"sleep": sleep, "hrv": hrv, **{n: int(n in chosen) for n in b["_names"]}}
    x = pd.DataFrame([row])[b["_feats"]]
    trees = np.array([t.predict(x.values)[0] for t in b["_model"].estimators_])
    return {"ready": True, "prediction": round(float(trees.mean()), 1),
            "low": round(float(np.percentile(trees, 10)), 1), "high": round(float(np.percentile(trees, 90)), 1),
            "hrv": round(hrv), "vs_avg": round(float(trees.mean()) - b["avg_score"], 1)}


def estimate_hrv(db, sleep):
    b = _model_bundle(db)
    if not b.get("ready"):
        return 55 + (sleep - 7) * 6
    slope, icpt = b["_hrv_fit"]
    return slope * sleep + icpt


def _norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def chat_reply(msg, db, streak=0):
    m = _norm(msg)
    ins = build_insights(db)
    has = lambda *k: any(x in m for x in k)  # noqa: E731
    if not ins["ready"]:
        return f"Aún necesito al menos {MIN_DAYS} días de datos para encontrar patrones (llevas {ins['days']})."
    lifts = ins["lifts"]
    top = lifts[0] if lifts else None
    if has("hola", "buenas", "hey"):
        return "¡Hola! Pregúntame por tus patrones, tu mejor día, tu sueño o qué pasaría si cambias un hábito."
    if has("patr", "insight", "descubr", "relacion", "correl"):
        if not top:
            return "Todavía no hay suficiente variación en tus hábitos para medir su efecto."
        second = lifts[1] if len(lifts) > 1 else None
        extra = f" Después le sigue **{second['habit']}** (+{second['lift']})." if second else ""
        worst = lifts[-1] if len(lifts) > 2 and lifts[-1]["lift"] < 1 else None
        tail = f" En cambio, **{worst['habit']}** apenas mueve la aguja ({worst['lift']:+})." if worst else ""
        return f"El patrón más fuerte: **{top['habit']}** eleva tu productividad **{top['lift']} puntos**.{extra}{tail}"
    if has("dorm", "suen", "descans"):
        c = ins["sleep_corr"]
        level = "fuerte" if abs(c) > .5 else "moderada" if abs(c) > .25 else "débil"
        return (f"La correlación entre sueño y productividad es **{c}** ({level}). Esta semana promedias "
                f"**{ins['baseline']['sleep']} h**. Apunta a 7–8 h para mantener tu HRV alto.")
    if has("manana", "predic", "proyec", "futuro"):
        mt = ins["metrics"]
        return (f"Con tus últimos 7 días, el modelo proyecta **{ins['prediction']}/100** para mañana "
                f"(error medio en validación cruzada: ±{mt['mae']} puntos).")
    if has("modelo", "precision", "confia", "error"):
        mt = ins["metrics"]
        return (f"Uso un Random Forest validado con {mt['folds']}-fold cross-validation sobre {mt['n_days']} días: "
                f"R² = **{mt['r2']}**, MAE = **{mt['mae']}** puntos (adivinar la media daría {mt['baseline_mae']}).")
    if has("racha", "constan"):
        return (f"Llevas **{streak} días** seguidos cumpliendo al menos la mitad de tus hábitos."
                + (" ¡No rompas la cadena!" if streak else " Hoy es buen día para empezar una nueva."))
    if has("consejo", "recomien", "mejorar", "deberia", "que hago"):
        if not top:
            return "Registra tus hábitos unos días más y te diré cuál priorizar."
        low = min(lifts[:3], key=lambda x: x["rate"])
        return (f"Prioriza **{low['habit']}**: suma +{low['lift']} puntos cuando lo haces, pero solo lo cumples "
                f"el {low['rate']}% de los días. Es tu palanca con más margen.")
    if has("dia", "cuando", "semana"):
        return f"Tu día más productivo suele ser el **{ins['best_day']}**. Reserva ahí tu trabajo más exigente."
    if has("habit", "pesa", "importa", "influ"):
        w = ins["importance"][0]
        return f"Lo que más pesa en tu rendimiento es **{w['feature']}** ({w['weight']}% de influencia en el modelo)."
    if has("promedio", "media", "resumen"):
        return (f"Tu productividad media es **{ins['avg_score']}/100**. Mejor día: {ins['best_day']}. "
                f"Hábito estrella: {top['habit'] if top else '—'}.")
    return ("Puedo contarte tus **patrones**, proyectar **mañana**, darte un **consejo**, decirte tu **mejor día**, "
            "analizar tu **sueño** o explicarte cómo funciona el **modelo**. ¿Qué quieres ver?")
