# 🏀 NBA Live Tracker API

A FastAPI backend that provides **real-time NBA game scores** using `nba_api`.  
This API fetches **live scores**, **health status**, and **API documentation links**.

## Setup & Installation

## Clone the Repo

git clone https://github.com/Warsame-Egal/nba-live-tracker.git
cd nba-live-tracker/nba-tracker-api

## Create & Activate Virtual Environment

python -m venv venv
venv\Scripts\activate

## Install Dependencies

pip install -r requirements.txt

## Run the API

uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

## Test API

Main Page: http://localhost:8000/
Live Scores: http://localhost:8000/live_scores
Health Check: http://localhost:8000/health
Swagger Docs: http://localhost:8000/docs
ReDoc Docs: http://localhost:8000/redoc
