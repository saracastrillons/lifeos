#!/usr/bin/env bash
(cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8010) &
(cd frontend && npm install && npm run dev) &
wait
