from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_current_user
from app.models.user import User
from app.schemas.notification import UnreadCountResponse, MarkViewedResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user)
):
    res = NotificationService.get_unread_count(db, current_user.id)
    return {
        "success": True,
        "data": UnreadCountResponse(
            unread_count=res["unread_count"],
            last_viewed_at=res["last_viewed_at"]
        )
    }


@router.post("/mark-viewed")
def mark_viewed(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user)
):
    res = NotificationService.mark_all_viewed(db, current_user.id)
    return {
        "success": True,
        "data": MarkViewedResponse(
            success=True,
            marked_at=res["marked_at"],
            unread_count=res["unread_count"]
        )
    }
