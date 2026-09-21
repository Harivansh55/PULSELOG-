from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    email_verified: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
