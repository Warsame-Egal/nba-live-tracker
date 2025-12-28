"""
Basic tests for the main application.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_app_exists():
    """Test that the app instance exists."""
    assert app is not None


def test_app_title():
    """Test that the app has the correct title."""
    assert app.title == "NBA Tracker API"


def test_app_version():
    """Test that the app has the correct version."""
    assert app.version == "1.0.0"
