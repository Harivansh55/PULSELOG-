from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.refresh_token import RefreshToken


def test_1_signup(client: TestClient):
    res = client.post("/api/v1/auth/signup", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "StrongPassword123!"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == "jane@example.com"
    assert "dev_verification_token" in data["data"]


def test_2_duplicate_signup(client: TestClient):
    # First signup
    client.post("/api/v1/auth/signup", json={
        "name": "Alex Smith",
        "email": "alex@example.com",
        "password": "StrongPassword123!"
    })
    # Second duplicate signup
    res = client.post("/api/v1/auth/signup", json={
        "name": "Alex Duplicate",
        "email": "alex@example.com",
        "password": "AnotherPassword123!"
    })
    assert res.status_code == 409
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONFLICT"


def test_3_email_verification(client: TestClient):
    signup_res = client.post("/api/v1/auth/signup", json={
        "name": "Verify Me",
        "email": "verify@example.com",
        "password": "StrongPassword123!"
    })
    token = signup_res.json()["data"]["dev_verification_token"]

    res = client.get(f"/api/v1/auth/verify-email?token={token}")
    assert res.status_code == 200
    assert res.json()["data"]["user"]["email_verified"] is True

    # Token cannot be reused
    res_reused = client.get(f"/api/v1/auth/verify-email?token={token}")
    assert res_reused.status_code == 400


def test_4_5_6_7_8_login_and_cookies(client: TestClient, test_user: User):
    # Test 5: Invalid login
    res_invalid = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "WrongPassword!"
    })
    assert res_invalid.status_code == 401

    # Test 4: Valid login
    res_valid = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    })
    assert res_valid.status_code == 200
    data = res_valid.json()

    # Test 6: Login response MUST NOT contain JWT
    assert "access_token" not in data
    assert "refresh_token" not in data
    assert "token" not in data
    assert "jwt" not in data
    assert data["user"]["email"] == test_user.email

    # Test 7 & 8: Access & refresh cookies are HttpOnly
    cookies = res_valid.cookies
    assert "access_token" in cookies
    assert "refresh_token" in cookies

    # Check Set-Cookie headers contain HttpOnly
    set_cookie_headers = [v for k, v in res_valid.headers.items() if k.lower() == "set-cookie"]
    cookie_str = "; ".join(set_cookie_headers).lower()
    assert "httponly" in cookie_str


def test_9_current_user(client: TestClient, test_user: User):
    # Unauthenticated
    res_unauth = client.get("/api/v1/auth/me")
    assert res_unauth.status_code == 401

    # Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200

    # Get /me with cookies sent automatically by testclient session
    res_me = client.get("/api/v1/auth/me")
    assert res_me.status_code == 200
    assert res_me.json()["data"]["user"]["id"] == test_user.id


def test_10_11_refresh_and_rotation(client: TestClient, test_user: User, db: Session):
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    })
    initial_refresh = client.cookies.get("refresh_token")

    # Refresh
    refresh_res = client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200
    data = refresh_res.json()
    assert "access_token" not in data
    assert "refresh_token" not in data

    new_refresh = client.cookies.get("refresh_token")
    # Token rotation: new refresh token must differ
    assert new_refresh != initial_refresh


def test_12_refresh_reuse_detection(client: TestClient, test_user: User, db: Session):
    # 1. Login
    client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    })
    old_refresh = client.cookies.get("refresh_token")

    # 2. Rotate once
    client.post("/api/v1/auth/refresh")

    # 3. Simulate attacker using the old already-revoked refresh token
    attacker_client = TestClient(client.app)
    attacker_client.cookies.set("refresh_token", old_refresh)

    res_reuse = attacker_client.post("/api/v1/auth/refresh")
    # Must trigger security violation
    assert res_reuse.status_code == 401
    assert "reused" in res_reuse.json()["error"]["message"].lower()

    # Verify all tokens for this user were revoked
    active_tokens = db.query(RefreshToken).filter(
        RefreshToken.user_id == test_user.id,
        RefreshToken.revoked_at.is_(None)
    ).count()
    assert active_tokens == 0


def test_13_logout(client: TestClient, test_user: User):
    client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    })
    assert client.get("/api/v1/auth/me").status_code == 200

    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Next request should be unauthenticated
    assert client.get("/api/v1/auth/me").status_code == 401


def test_14_15_forgot_and_reset_password(client: TestClient, test_user: User):
    # Forgot password
    forgot_res = client.post("/api/v1/auth/forgot-password", json={
        "email": test_user.email
    })
    assert forgot_res.status_code == 200
    token = forgot_res.json()["data"]["dev_token"]

    # Reset password
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "BrandNewPassword123!"
    })
    assert reset_res.status_code == 200

    # Old password no longer works
    assert client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    }).status_code == 401

    # New password works
    assert client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "BrandNewPassword123!"
    }).status_code == 200


def test_16_admin_authorization(client: TestClient, test_user: User, admin_user: User):
    # 1. Normal user calling admin API -> 403 Forbidden
    client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    })
    res_normal = client.get("/api/v1/admin/changelogs")
    assert res_normal.status_code == 403
    assert res_normal.json()["error"]["code"] == "FORBIDDEN"

    # 2. Admin user calling admin API -> 200 OK
    client.post("/api/v1/auth/login", json={
        "email": admin_user.email,
        "password": "AdminPass123!"
    })
    res_admin = client.get("/api/v1/admin/changelogs")
    assert res_admin.status_code == 200
