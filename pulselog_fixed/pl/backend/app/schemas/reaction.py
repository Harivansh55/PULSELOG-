from typing import Dict, List
from pydantic import BaseModel, field_validator


VALID_REACTION_TYPES = {"heart", "celebrate", "rocket"}


class ReactionToggleRequest(BaseModel):
    reaction_type: str

    @field_validator("reaction_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in VALID_REACTION_TYPES:
            raise ValueError(f"reaction_type must be one of: {', '.join(VALID_REACTION_TYPES)}")
        return v


class ReactionCountsResponse(BaseModel):
    changelog_id: int
    counts: Dict[str, int]
    user_reactions: List[str]
