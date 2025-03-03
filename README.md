# 🏀 NBA Live Tracker API

A FastAPI backend with a TypeScript, Vite, and React frontend that provides real-time NBA game scores using nba_api.
This API delivers live game data, including scores, game status, and top performers, with fast and scalable updates.

## Clone the Repo

git clone https://github.com/Warsame-Egal/nba-live-tracker.git
cd nba-live-tracker/nba-tracker-api

## Create & Activate Virtual Environment

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

## Tech Stack

Backend (FastAPI)
Python 3.x
FastAPI
nba_api
Pydantic

## Frontend (React)

    React.js
    Tailwind CSS
    Vite – Build tool
