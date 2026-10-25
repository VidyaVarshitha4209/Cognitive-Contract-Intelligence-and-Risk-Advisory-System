import os
import tempfile
from pathlib import Path

# Use a throw-away database for tests (must be set BEFORE the app is imported)
_tmp = Path(tempfile.mkdtemp()) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.as_posix()}"
os.environ["AI_PROVIDER"] = "none"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
