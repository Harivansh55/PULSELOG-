import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Set test environment variables before importing app
os.environ["DATABASE_URL"] = "sqlite:///./test_pulselog.db"
os.environ["JWT_ACCESS_SECRET"] = "test_access_secret_for_pulselog_testing_1234567890"
os.environ["JWT_REFRESH_SECRET"] = "test_refresh_secret_for_pulselog_testing_0987654321"
os.environ["COOKIE_SECURE"] = "false"
os.environ["UPLOAD_DIR"] = "test_uploads"

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.security.password import hash_password

TEST_DATABASE_URL = "sqlite:///./test_pulselog.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_pulselog.db"):
        try:
            os.remove("./test_pulselog.db")
        except Exception:
            pass
    if os.path.exists("test_uploads"):
        import shutil
        shutil.rmtree("test_uploads", ignore_errors=True)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Override get_db in app
    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    yield session

    session.close()
    transaction.rollback()
    connection.close()
    app.dependency_overrides.clear()


@pytest.fixture
def client(db: Session) -> TestClient:
    return TestClient(app)


@pytest.fixture
def test_user(db: Session) -> User:
    user = User(
        email="testuser@pulselog.dev",
        name="Test User",
        password_hash=hash_password("Password123!"),
        role="USER",
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db: Session) -> User:
    admin = User(
        email="adminuser@pulselog.dev",
        name="Admin User",
        password_hash=hash_password("AdminPass123!"),
        role="ADMIN",
        email_verified=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin
