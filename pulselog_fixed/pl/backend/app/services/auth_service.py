from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Response, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.email_verification import EmailVerificationToken
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import SignupRequest, LoginRequest
from app.security.password import hash_password, verify_password
from app.security.jwt import (
    hash_token,
    generate_secure_token,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str
) -> None:
    """Set HttpOnly, secure (per config), SameSite=Lax authentication cookies."""
    settings = get_settings()

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/"
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear authentication cookies."""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")


class AuthService:
    @staticmethod
    def signup(db: Session, req: SignupRequest) -> Dict[str, Any]:
        existing_user = db.query(User).filter(User.email == req.email.lower()).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists."
            )

        hashed_pw = hash_password(req.password)
        user = User(
            email=req.email.lower(),
            name=req.name.strip(),
            password_hash=hashed_pw,
            role="USER",
            email_verified=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Generate email verification token (expires in 24 hours)
        raw_token = generate_secure_token(32)
        token_h = hash_token(raw_token)
        expires_at = datetime.utcnow() + timedelta(hours=24)

        verification_record = EmailVerificationToken(
            user_id=user.id,
            token_hash=token_h,
            expires_at=expires_at
        )
        db.add(verification_record)
        db.commit()

        # Development simulated verification link
        dev_verification_link = f"/verify-email?token={raw_token}"
        print(f"[DEVELOPMENT EMAIL SIMULATION] Verification link for {user.email}: {dev_verification_link}")

        return {
            "user": user,
            "dev_verification_token": raw_token,
            "dev_verification_link": dev_verification_link
        }

    @staticmethod
    def verify_email(db: Session, raw_token: str) -> User:
        if not raw_token or not raw_token.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token is required."
            )

        token_h = hash_token(raw_token.strip())
        record = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.token_hash == token_h
        ).first()

        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token."
            )

        if record.used_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification token has already been used."
            )

        if record.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification token has expired."
            )

        record.used_at = datetime.utcnow()
        user = db.query(User).filter(User.id == record.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated user account not found."
            )

        user.email_verified = True
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def login(db: Session, req: LoginRequest, response: Response) -> User:
        user = db.query(User).filter(User.email == req.email.lower()).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        # Generate tokens
        access_token = create_access_token(user.id, user.role)
        raw_refresh, refresh_h, expires_at = create_refresh_token(user.id)

        # Store refresh token in DB
        db_token = RefreshToken(
            user_id=user.id,
            token_hash=refresh_h,
            expires_at=expires_at
        )
        db.add(db_token)
        db.commit()

        # Set HttpOnly cookies
        set_auth_cookies(response, access_token, raw_refresh)

        # Return user info only (NEVER return JWT tokens in JSON)
        return user

    @staticmethod
    def refresh_session(db: Session, raw_refresh_token: Optional[str], response: Response) -> User:
        if not raw_refresh_token:
            clear_auth_cookies(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token missing."
            )

        payload = verify_refresh_token(raw_refresh_token)
        if not payload:
            clear_auth_cookies(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token."
            )

        token_h = hash_token(raw_refresh_token)
        db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_h).first()

        if not db_token:
            clear_auth_cookies(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not recognized."
            )

        # REUSE DETECTION: If this token was already revoked, revoke ALL tokens for this user!
        if db_token.revoked_at is not None:
            user_id = db_token.user_id
            db.query(RefreshToken).filter(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None)
            ).update({"revoked_at": datetime.utcnow()})
            db.commit()
            clear_auth_cookies(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Security violation: Revoked refresh token reused. All sessions terminated."
            )

        if db_token.expires_at < datetime.utcnow():
            db_token.revoked_at = datetime.utcnow()
            db.commit()
            clear_auth_cookies(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired."
            )

        user = db.query(User).filter(User.id == db_token.user_id).first()
        if not user:
            clear_auth_cookies(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found."
            )

        # Token rotation:
        # 1. Revoke old refresh token
        db_token.revoked_at = datetime.utcnow()

        # 2. Issue new tokens
        new_access = create_access_token(user.id, user.role)
        new_raw_refresh, new_refresh_h, new_expires = create_refresh_token(user.id)

        # 3. Store new refresh token
        new_db_token = RefreshToken(
            user_id=user.id,
            token_hash=new_refresh_h,
            expires_at=new_expires
        )
        db.add(new_db_token)
        db.commit()

        # 4. Set new HttpOnly cookies
        set_auth_cookies(response, new_access, new_raw_refresh)

        return user

    @staticmethod
    def logout(db: Session, raw_refresh_token: Optional[str], response: Response) -> None:
        if raw_refresh_token:
            token_h = hash_token(raw_refresh_token)
            db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_h).first()
            if db_token and db_token.revoked_at is None:
                db_token.revoked_at = datetime.utcnow()
                db.commit()

        clear_auth_cookies(response)

    @staticmethod
    def forgot_password(db: Session, email: str) -> Dict[str, Any]:
        user = db.query(User).filter(User.email == email.lower()).first()
        # Do not reveal whether email exists (Section 14)
        if not user:
            return {
                "message": "If that email address is in our system, a password reset link has been created.",
                "dev_reset_link": None
            }

        raw_token = generate_secure_token(32)
        token_h = hash_token(raw_token)
        expires_at = datetime.utcnow() + timedelta(hours=1)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_h,
            expires_at=expires_at
        )
        db.add(reset_record)
        db.commit()

        dev_reset_link = f"/reset-password?token={raw_token}"
        print(f"[DEVELOPMENT PASSWORD RESET] Reset link for {user.email}: {dev_reset_link}")

        return {
            "message": "If that email address is in our system, a password reset link has been created.",
            "dev_reset_link": dev_reset_link,
            "dev_token": raw_token
        }

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> None:
        if not token or not token.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token is required."
            )

        token_h = hash_token(token.strip())
        record = db.query(PasswordResetToken).filter(
            PasswordResetToken.token_hash == token_h
        ).first()

        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password reset token."
            )

        if record.used_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset token has already been used."
            )

        if record.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset token has expired."
            )

        user = db.query(User).filter(User.id == record.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        # Hash new password
        user.password_hash = hash_password(new_password)
        record.used_at = datetime.utcnow()

        # Revoke all existing refresh tokens for this user
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": datetime.utcnow()})

        db.commit()
