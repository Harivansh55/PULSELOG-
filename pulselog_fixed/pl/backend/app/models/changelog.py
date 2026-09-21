from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Changelog(Base):
    __tablename__ = "changelogs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    content_markdown = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # "New", "Improved", "Fixed"
    cover_image = Column(String(500), nullable=True)
    status = Column(String(50), default="Draft", nullable=False)  # "Draft", "Published"
    published_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    reactions = relationship("Reaction", back_populates="changelog", cascade="all, delete-orphan")
