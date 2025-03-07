# 🏀 NBA Live Tracker API

A FastAPI backend with a TypeScript, Vite, and React frontend that provides real-time NBA game scores using nba_api.
This API delivers live game data, including scores, game status, and top performers, with fast and scalable updates.

## Create & Activate Virtual Environment

    cd nba-live-tracker/nba-tracker-api
    python -m venv venv
    venv\Scripts\activate

## Install Dependencies

    pip install -r requirements.txt

## Run the API

    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

## API

Main Page: http://localhost:8000/
Health Check: http://localhost:8000/api/v1/health
Swagger Docs: http://localhost:8000/docs
ReDoc Docs: http://localhost:8000/redoc

# Endpoints

Scoreboard: http://localhost:8000/api/v1/scoreboard
A Game http://127.0.0.1:8000/api/v1/scoreboard/game/gameid
A Team http://localhost:8000/api/v1/scoreboard/team/teamid
Health Check: http://localhost:8000/api/v1/health

## Tech Stack

## Backend (FastAPI)

    Python 3.x
    FastAPI
    nba_api
    Pydantic

## Frontend (React)

    React.js
    Tailwind CSS
    Vite
