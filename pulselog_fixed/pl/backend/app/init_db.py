"""
PulseLog Database Initialization Script
Initializes all database tables defined in SQLAlchemy models.
Usage: python -m app.init_db
"""

from app.database import engine, Base
import app.models  # ensure models are registered with Base


def init_database() -> None:
    print("Initializing PulseLog database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")


if __name__ == "__main__":
    init_database()
