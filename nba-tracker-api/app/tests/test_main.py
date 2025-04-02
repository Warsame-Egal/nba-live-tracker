# app/tests/test_main.py
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_player():
    response = client.get("/api/v1/player/1641842")
    assert response.status_code == 200
