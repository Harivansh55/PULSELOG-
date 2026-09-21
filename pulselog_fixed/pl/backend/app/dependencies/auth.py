from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.security.jwt import verify_access_token


def get_token_from_request(request: Request) -> Optional[str]:
    """Retrieve access token from the HttpOnly cookie (cookies only)."""
    return request.cookies.get("access_token")


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Return current authenticated user if valid token exists, else None."""
    token = get_token_from_request(request)
    if not token:
        return None

    payload = verify_access_token(token)
    if not payload:
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id = int(user_id_str)
    except ValueError:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


def require_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """Require an authenticated user; raises 401 Unauthorized if missing/invalid."""
    user = get_current_user_optional(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing or invalid access session."
        )
    return user


def require_admin(
    current_user: User = Depends(require_current_user)
) -> User:
    """Require user with ADMIN role; raises 403 Forbidden if normal USER."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrative privileges required."
        )
    return current_user
