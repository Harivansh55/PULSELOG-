from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UnreadCountResponse(BaseModel):
    unread_count: int
    last_viewed_at: Optional[datetime] = None


class MarkViewedResponse(BaseModel):
    success: bool
    marked_at: datetime
    unread_count: int
