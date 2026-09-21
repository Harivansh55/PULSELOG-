from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_current_user
from app.models.user import User
from app.schemas.reaction import ReactionToggleRequest
from app.services.reaction_service import ReactionService

router = APIRouter(prefix="/api/v1/changelog", tags=["Reactions"])


@router.post("/{id}/reaction")
def toggle_reaction(
    id: int,
    req: ReactionToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user)
):
    result = ReactionService.toggle_reaction(
        db=db,
        changelog_id=id,
        user_id=current_user.id,
        reaction_type=req.reaction_type
    )
    return {
        "success": True,
        "data": result
    }
