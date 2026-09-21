from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    LoginResponse,
    GenericApiResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.dependencies.auth import require_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    result = AuthService.signup(db, req)
    user = result["user"]
    return {
        "success": True,
        "message": "User registered successfully. Please verify your email.",
        "data": {
            "user": UserResponse.model_validate(user),
            "dev_verification_token": result["dev_verification_token"],
            "dev_verification_link": result["dev_verification_link"],
        }
    }


@router.get("/verify-email")
def verify_email(token: str = Query(..., description="Email verification token"), db: Session = Depends(get_db)):
    user = AuthService.verify_email(db, token)
    return {
        "success": True,
        "message": "Email verified successfully.",
        "data": {
            "user": UserResponse.model_validate(user)
        }
    }


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = AuthService.login(db, req, response)
    # Important: Response MUST NEVER contain JWT values
    return LoginResponse(
        success=True,
        message="Login successful",
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get("refresh_token")
    user = AuthService.refresh_session(db, raw_refresh, response)
    return {
        "success": True,
        "message": "Session refreshed successfully",
        "data": {
            "user": UserResponse.model_validate(user)
        }
    }


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get("refresh_token")
    AuthService.logout(db, raw_refresh, response)
    return {
        "success": True,
        "message": "Logged out successfully"
    }


@router.get("/me")
def get_current_user_profile(current_user: User = Depends(require_current_user)):
    return {
        "success": True,
        "data": {
            "user": UserResponse.model_validate(current_user)
        }
    }


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    res = AuthService.forgot_password(db, req.email)
    return {
        "success": True,
        "message": res["message"],
        "data": {
            "dev_reset_link": res.get("dev_reset_link"),
            "dev_token": res.get("dev_token")
        }
    }


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService.reset_password(db, req.token, req.new_password)
    return {
        "success": True,
        "message": "Password reset successful. You can now log in with your new password."
    }
