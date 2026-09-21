from datetime import datetime
from typing import Optional, Dict, List
from pydantic import BaseModel, ConfigDict, field_validator


VALID_CATEGORIES = {"New", "Improved", "Fixed"}
VALID_STATUSES = {"Draft", "Published"}


class ChangelogBase(BaseModel):
    title: str
    slug: Optional[str] = None
    content_markdown: str
    category: str
    cover_image: Optional[str] = None
    status: str = "Draft"
    published_at: Optional[datetime] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title is required")
        return v

    @field_validator("content_markdown")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Content is required")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(VALID_CATEGORIES)}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}")
        return v


class ChangelogCreate(ChangelogBase):
    pass


class ChangelogUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content_markdown: Optional[str] = None
    category: Optional[str] = None
    cover_image: Optional[str] = None
    status: Optional[str] = None
    published_at: Optional[datetime] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(VALID_CATEGORIES)}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}")
        return v


class ChangelogAdminResponse(BaseModel):
    id: int
    title: str
    slug: str
    content_markdown: str
    category: str
    cover_image: Optional[str] = None
    status: str
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChangelogPublicResponse(BaseModel):
    id: int
    title: str
    slug: str
    content_markdown: str
    category: str
    cover_image: Optional[str] = None
    published_at: Optional[datetime] = None
    reactions: Dict[str, int] = {"heart": 0, "celebrate": 0, "rocket": 0}
    user_reactions: List[str] = []

    model_config = ConfigDict(from_attributes=True)
