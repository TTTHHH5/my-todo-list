import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

_TEST_DB_PATH = "./test_tetris.db"
_TEST_DB_URL = f"sqlite:///{_TEST_DB_PATH}"
os.environ.setdefault("DATABASE_URL", _TEST_DB_URL)

from backend.main import app
from backend.database import Base, get_db


@pytest.fixture(scope="session")
def client():
    engine = create_engine(_TEST_DB_URL, connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists(_TEST_DB_PATH):
        os.remove(_TEST_DB_PATH)
