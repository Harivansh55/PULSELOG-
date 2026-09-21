from typing import Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.changelog import Changelog
from app.models.reaction import Reaction


VALID_REACTIONS = {"heart", "celebrate", "rocket"}


class ReactionService:
    @staticmethod
    def toggle_reaction(
        db: Session,
        changelog_id: int,
        user_id: int,
        reaction_type: str
    ) -> Dict[str, Any]:
        if reaction_type not in VALID_REACTIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid reaction type. Allowed: {', '.join(VALID_REACTIONS)}"
            )

        changelog = db.query(Changelog).filter(Changelog.id == changelog_id).first()
        if not changelog:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Changelog not found."
            )

        # Check existing reaction
        existing = db.query(Reaction).filter(
            Reaction.changelog_id == changelog_id,
            Reaction.user_id == user_id,
            Reaction.reaction_type == reaction_type
        ).first()

        if existing:
            # Remove / toggle off
            db.delete(existing)
            db.commit()
            action = "removed"
        else:
            # Add / toggle on
            new_reaction = Reaction(
                changelog_id=changelog_id,
                user_id=user_id,
                reaction_type=reaction_type
            )
            db.add(new_reaction)
            db.commit()
            action = "added"

        # Fetch updated counts
        counts = {"heart": 0, "celebrate": 0, "rocket": 0}
        grouped = (
            db.query(Reaction.reaction_type, func.count(Reaction.id))
            .filter(Reaction.changelog_id == changelog_id)
            .group_by(Reaction.reaction_type)
            .all()
        )
        for r_type, count in grouped:
            if r_type in counts:
                counts[r_type] = count

        # Fetch current user reactions for this changelog
        user_reactions = [
            r[0] for r in
            db.query(Reaction.reaction_type)
            .filter(Reaction.changelog_id == changelog_id, Reaction.user_id == user_id)
            .all()
        ]

        return {
            "action": action,
            "changelog_id": changelog_id,
            "counts": counts,
            "user_reactions": user_reactions
        }
