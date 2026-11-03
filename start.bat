@echo off
echo Iniciando LifeOS...
start "LifeOS Backend" cmd /k "cd backend && (if not exist .venv python -m venv .venv) && .venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8010"
start "LifeOS Frontend" cmd /k "cd frontend && npm install && npm run dev"
echo Abre http://localhost:5180
