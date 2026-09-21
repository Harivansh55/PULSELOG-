import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import jwt
from app.config import get_settings

ALGORITHM = "HS256"


def hash_token(token: str) -> str:
    """Compute SHA-256 hash of a raw token for safe database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_secure_token(nbytes: int = 32) -> str:
    """Generate a high-entropy URL-safe token."""
    return secrets.token_urlsafe(nbytes)


def create_access_token(user_id: int, role: str) -> str:
    """Create a short-lived access JWT."""
    settings = get_settings()
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_ACCESS_SECRET, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    """
    Create a secure refresh token.
    Returns (raw_jwt_token, token_hash, expires_at).
    """
    settings = get_settings()
    now = datetime.utcnow()
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    raw_token_id = secrets.token_urlsafe(32)
    payload = {
        "sub": str(user_id),
        "jti": raw_token_id,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token_str = jwt.encode(payload, settings.JWT_REFRESH_SECRET, algorithm=ALGORITHM)
    token_h = hash_token(token_str)
    return token_str, token_h, expires_at


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode an access JWT. Returns payload if valid, else None."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.JWT_ACCESS_SECRET,
            algorithms=[ALGORITHM]
        )
        if payload.get("type") != "access":
            return None
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a refresh JWT. Returns payload if valid, else None."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.JWT_REFRESH_SECRET,
            algorithms=[ALGORITHM]
        )
        if payload.get("type") != "refresh":
            return None
        return payload
    except (jwt.PyJWTError, Exception):
        return None
