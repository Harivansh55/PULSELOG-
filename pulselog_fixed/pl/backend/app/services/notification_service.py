from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.changelog import Changelog
from app.models.notification import UserChangelogView


class NotificationService:
    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> Dict[str, Any]:
        view_record = db.query(UserChangelogView).filter(
            UserChangelogView.user_id == user_id
        ).first()

        query = db.query(Changelog).filter(Changelog.status == "Published")

        if view_record and view_record.last_viewed_changelog_date:
            query = query.filter(
                Changelog.published_at > view_record.last_viewed_changelog_date
            )

        unread_count = query.count()
        last_viewed_at = view_record.last_viewed_changelog_date if view_record else None

        return {
            "unread_count": unread_count,
            "last_viewed_at": last_viewed_at
        }

    @staticmethod
    def mark_all_viewed(db: Session, user_id: int) -> Dict[str, Any]:
        view_record = db.query(UserChangelogView).filter(
            UserChangelogView.user_id == user_id
        ).first()

        now = datetime.utcnow()
        if view_record:
            view_record.last_viewed_changelog_date = now
            view_record.updated_at = now
        else:
            view_record = UserChangelogView(
                user_id=user_id,
                last_viewed_changelog_date=now,
                updated_at=now
            )
            db.add(view_record)

        db.commit()
        return {
            "success": True,
            "marked_at": now,
            "unread_count": 0
        }
