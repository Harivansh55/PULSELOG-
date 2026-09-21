from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.changelog import (
    ChangelogCreate,
    ChangelogUpdate,
    ChangelogAdminResponse,
)
from app.services.changelog_service import ChangelogService

router = APIRouter(
    prefix="/api/v1/admin/changelogs",
    tags=["Admin Changelogs"],
    dependencies=[Depends(require_admin)]
)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_changelog(
    req: ChangelogCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    item = ChangelogService.create(db, req)
    return {
        "success": True,
        "message": "Changelog created successfully",
        "data": ChangelogAdminResponse.model_validate(item)
    }


@router.get("")
def get_admin_changelogs(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    items = ChangelogService.get_all_admin(db)
    return {
        "success": True,
        "data": [ChangelogAdminResponse.model_validate(i) for i in items]
    }


@router.get("/{id}")
def get_admin_changelog(
    id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    item = ChangelogService.get_by_id(db, id)
    return {
        "success": True,
        "data": ChangelogAdminResponse.model_validate(item)
    }


@router.put("/{id}")
def update_changelog(
    id: int,
    req: ChangelogUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    item = ChangelogService.update(db, id, req)
    return {
        "success": True,
        "message": "Changelog updated successfully",
        "data": ChangelogAdminResponse.model_validate(item)
    }


@router.delete("/{id}")
def delete_changelog(
    id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    ChangelogService.delete(db, id)
    return {
        "success": True,
        "message": f"Changelog with ID {id} deleted successfully."
    }
