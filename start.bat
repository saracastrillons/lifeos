@echo off
cd /d "%~dp0"
echo Iniciando LifeOS...

rem Usa el lanzador "py" si existe (evita el acceso directo roto de la Microsoft Store)
set "PY=python"
where py >nul 2>nul && set "PY=py -3"

cd backend
start "LifeOS Backend" cmd /k "(if not exist .venv\Scripts\python.exe %PY% -m venv .venv) && .venv\Scripts\python -m pip install -q -r requirements.txt && .venv\Scripts\python -m uvicorn app.main:app --reload --port 8010"
cd ..\frontend
start "LifeOS Frontend" cmd /k "(if not exist node_modules npm install) && npm run dev"
cd ..
echo Abre http://localhost:5180 cuando ambas ventanas esten listas.
