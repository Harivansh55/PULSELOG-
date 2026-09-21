from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    changelog_id = Column(Integer, ForeignKey("changelogs.id", ondelete="CASCADE"), nullable=False, index=True)
    reaction_type = Column(String(50), nullable=False)  # "heart", "celebrate", "rocket"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="reactions")
    changelog = relationship("Changelog", back_populates="reactions")

    __table_args__ = (
        UniqueConstraint("user_id", "changelog_id", "reaction_type", name="uq_user_changelog_reaction"),
    )
