import os
import tempfile

# Base de datos aislada para los tests (antes de importar la app)
os.environ["DB_HOST"] = ""
os.environ["SQLITE_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_dashboard_shape(client):
    d = client.get("/api/dashboard").json()
    assert 0 <= d["focus"]["score"] <= 100
    assert d["habits_today"]["total"] == 5
    assert len(d["grid"]["days"]) == 7
    assert d["level"]["level"] >= 1 and 0 <= d["level"]["progress"] <= 100


def test_insights_cross_validated(client):
    ins = client.get("/api/insights").json()
    assert ins["ready"]
    m = ins["metrics"]
    # El modelo debe superar a la línea base (predecir siempre la media)
    assert m["mae"] < m["baseline_mae"]
    assert m["r2"] > 0.3
    # El seed hace que "Meditar" y "Código profundo" sean los hábitos con más efecto
    top2 = {x["habit"] for x in ins["lifts"][:3]}
    assert {"Meditar", "Código profundo"} <= top2
    n = len(ins["correlation"]["labels"])
    assert len(ins["correlation"]["values"]) == n


def test_simulator_responds_to_inputs(client):
    bad = client.post("/api/simulate", json={"sleep": 5, "habits": []}).json()
    good = client.post("/api/simulate", json={"sleep": 8, "habits": ["Meditar", "Ejercicio", "Código profundo"]}).json()
    assert good["prediction"] > bad["prediction"] + 10
    assert good["low"] <= good["prediction"] <= good["high"]


def test_simulator_validation(client):
    assert client.post("/api/simulate", json={"sleep": 30}).status_code == 422


def test_checkin_upserts_today(client):
    assert client.get("/api/checkin").json() is None
    r = client.post("/api/checkin", json={"sleep": 7.5, "productivity": 80})
    assert r.status_code == 200 and r.json()["hrv"] > 0
    r = client.post("/api/checkin", json={"sleep": 6, "productivity": 60})
    assert client.get("/api/checkin").json()["sleep"] == 6


def test_habit_toggle_roundtrip(client):
    h = client.post("/api/habits", json={"name": "Beber agua"}).json()
    assert client.post(f"/api/habits/{h['id']}/toggle").json()["done"] is True
    assert client.post(f"/api/habits/{h['id']}/toggle").json()["done"] is False
    assert client.post(f"/api/habits/{h['id']}/toggle?day=2999-01-01").status_code == 400
    client.delete(f"/api/habits/{h['id']}")


def test_task_crud_and_validation(client):
    assert client.post("/api/tasks", json={"title": ""}).status_code == 422
    assert client.post("/api/tasks", json={"title": "x", "priority": "urgente"}).status_code == 422
    t = client.post("/api/tasks", json={"title": "Probar API", "priority": "alta"}).json()
    assert client.patch(f"/api/tasks/{t['id']}", json={"done": True}).json()["done"] is True
    assert client.delete(f"/api/tasks/{t['id']}").json()["ok"]
    assert client.patch("/api/tasks/99999", json={"done": True}).status_code == 404


def test_heatmap_and_export(client):
    hm = client.get("/api/heatmap?days=30").json()
    assert len(hm) == 30 and hm[-1]["date"]
    ex = client.get("/api/export").json()
    assert {"habits", "habit_logs", "day_metrics"} <= ex.keys()


def test_chat_intents(client):
    ask = lambda q: client.post("/api/chat", json={"message": q}).json()["reply"]  # noqa: E731
    assert "patrón" in ask("¿Qué patrones ves?")
    assert "R²" in ask("¿qué tan preciso es el modelo?")
    assert "días" in ask("mi racha")
