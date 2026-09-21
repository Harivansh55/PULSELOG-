from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user_optional
from app.models.user import User
from app.schemas.changelog import ChangelogPublicResponse
from app.services.changelog_service import ChangelogService

router = APIRouter(prefix="/api/v1/changelog", tags=["Public Changelog"])


@router.get("", response_model=dict)
def get_changelog_timeline(
    request: Request,
    category: Optional[str] = Query(None, description="Category filter (All, New, Improved, Fixed)"),
    search: Optional[str] = Query(None, description="Search term across title and content"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    items = ChangelogService.get_public_timeline(
        db=db,
        category=category,
        search=search,
        current_user_id=user_id
    )
    return {
        "success": True,
        "data": items
    }


@router.get("/by-slug/{slug}")
def get_changelog_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    item = ChangelogService.get_public_by_slug(db, slug, current_user_id=user_id)
    return {
        "success": True,
        "data": item
    }
