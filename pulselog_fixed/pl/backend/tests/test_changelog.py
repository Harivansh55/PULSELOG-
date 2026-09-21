from io import BytesIO
from fastapi.testclient import TestClient
from app.models.user import User


def test_17_18_19_admin_crud(client: TestClient, admin_user: User):
    client.post("/api/v1/auth/login", json={
        "email": admin_user.email,
        "password": "AdminPass123!"
    })

    # 17. Create changelog
    create_res = client.post("/api/v1/admin/changelogs", json={
        "title": "Release v1.0.0",
        "category": "New",
        "status": "Draft",
        "content_markdown": "Initial release notes."
    })
    assert create_res.status_code == 201
    created_id = create_res.json()["data"]["id"]
    assert create_res.json()["data"]["slug"] == "release-v100"

    # 18. Update changelog
    update_res = client.put(f"/api/v1/admin/changelogs/{created_id}", json={
        "title": "Release v1.0.1 Patch",
        "status": "Published"
    })
    assert update_res.status_code == 200
    assert update_res.json()["data"]["title"] == "Release v1.0.1 Patch"
    assert update_res.json()["data"]["status"] == "Published"
    assert update_res.json()["data"]["published_at"] is not None

    # 19. Delete changelog
    del_res = client.delete(f"/api/v1/admin/changelogs/{created_id}")
    assert del_res.status_code == 200

    get_res = client.get(f"/api/v1/admin/changelogs/{created_id}")
    assert get_res.status_code == 404


def test_20_21_draft_and_published_visibility(client: TestClient, admin_user: User):
    client.post("/api/v1/auth/login", json={
        "email": admin_user.email,
        "password": "AdminPass123!"
    })

    # Create Draft
    client.post("/api/v1/admin/changelogs", json={
        "title": "Secret Feature In Progress",
        "category": "New",
        "status": "Draft",
        "content_markdown": "Super secret details."
    })

    # Create Published
    client.post("/api/v1/admin/changelogs", json={
        "title": "Live Public Announcement",
        "category": "New",
        "status": "Published",
        "content_markdown": "Everyone can see this."
    })

    # Public client
    public_client = TestClient(client.app)
    timeline_res = public_client.get("/api/v1/changelog")
    assert timeline_res.status_code == 200
    items = timeline_res.json()["data"]

    titles = [item["title"] for item in items]
    # 20. Draft not visible publicly
    assert "Secret Feature In Progress" not in titles
    # 21. Published changelog visible
    assert "Live Public Announcement" in titles


def test_22_23_search_and_category_filter(client: TestClient, admin_user: User):
    client.post("/api/v1/auth/login", json={
        "email": admin_user.email,
        "password": "AdminPass123!"
    })

    client.post("/api/v1/admin/changelogs", json={
        "title": "Authentication Microservice Overhaul",
        "category": "Improved",
        "status": "Published",
        "content_markdown": "We migrated the authentication backend to Python FastAPI."
    })
    client.post("/api/v1/admin/changelogs", json={
        "title": "Payment Webhook Timeout Fix",
        "category": "Fixed",
        "status": "Published",
        "content_markdown": "Fixed 504 errors on stripe checkout callbacks."
    })

    # 22. Search
    public_client = TestClient(client.app)
    search_res = public_client.get("/api/v1/changelog?search=authentication")
    assert search_res.status_code == 200
    search_titles = [i["title"] for i in search_res.json()["data"]]
    assert "Authentication Microservice Overhaul" in search_titles
    assert "Payment Webhook Timeout Fix" not in search_titles

    # 23. Category filter
    fixed_res = public_client.get("/api/v1/changelog?category=Fixed")
    assert fixed_res.status_code == 200
    fixed_titles = [i["title"] for i in fixed_res.json()["data"]]
    assert "Payment Webhook Timeout Fix" in fixed_titles
    assert "Authentication Microservice Overhaul" not in fixed_titles


def test_24_25_26_reactions(client: TestClient, admin_user: User, test_user: User):
    # Setup published changelog
    client.post("/api/v1/auth/login", json={
        "email": admin_user.email,
        "password": "AdminPass123!"
    })
    create_res = client.post("/api/v1/admin/changelogs", json={
        "title": "Cool Feature for Reactions",
        "category": "New",
        "status": "Published",
        "content_markdown": "Give us your reactions!"
    })
    cid = create_res.json()["data"]["id"]

    # Login as normal user
    client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    })

    # 24. React with heart
    react_res = client.post(f"/api/v1/changelog/{cid}/reaction", json={"reaction_type": "heart"})
    assert react_res.status_code == 200
    data = react_res.json()["data"]
    assert data["action"] == "added"
    assert data["counts"]["heart"] == 1
    assert "heart" in data["user_reactions"]

    # 25. Duplicate reaction toggles off / prevents duplicates
    react_toggle = client.post(f"/api/v1/changelog/{cid}/reaction", json={"reaction_type": "heart"})
    assert react_toggle.status_code == 200
    data_toggle = react_toggle.json()["data"]
    # 26. Reaction removed
    assert data_toggle["action"] == "removed"
    assert data_toggle["counts"]["heart"] == 0
    assert "heart" not in data_toggle["user_reactions"]


def test_27_28_notifications(client: TestClient, admin_user: User, test_user: User):
    # User logs in
    client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    })

    # 28. Mark viewed sets baseline
    mark_res = client.post("/api/v1/notifications/mark-viewed")
    assert mark_res.status_code == 200
    assert mark_res.json()["data"]["unread_count"] == 0

    # Admin publishes a new changelog
    admin_client = TestClient(client.app)
    admin_client.post("/api/v1/auth/login", json={
        "email": admin_user.email,
        "password": "AdminPass123!"
    })
    admin_client.post("/api/v1/admin/changelogs", json={
        "title": "Brand New Notification Update",
        "category": "New",
        "status": "Published",
        "content_markdown": "Fresh unread item."
    })

    # 27. Unread count increments
    unread_res = client.get("/api/v1/notifications/unread-count")
    assert unread_res.status_code == 200
    assert unread_res.json()["data"]["unread_count"] >= 1


def test_29_json_feed(client: TestClient, admin_user: User):
    client.post("/api/v1/auth/login", json={
        "email": admin_user.email,
        "password": "AdminPass123!"
    })
    client.post("/api/v1/admin/changelogs", json={
        "title": "JSON Feed Verified Release",
        "category": "New",
        "status": "Published",
        "content_markdown": "# Markdown Heading\n\nContent for **JSON Feed 1.1**."
    })

    feed_res = client.get("/api/v1/changelog/feed")
    assert feed_res.status_code == 200
    feed = feed_res.json()
    assert feed["version"] == "https://jsonfeed.org/version/1.1"
    assert "title" in feed
    assert "items" in feed
    assert len(feed["items"]) > 0

    item = next(i for i in feed["items"] if i["title"] == "JSON Feed Verified Release")
    assert "content_html" in item
    assert "<h1>" in item["content_html"] or "<h1" in item["content_html"]


def test_30_upload_validation(client: TestClient, admin_user: User):
    client.post("/api/v1/auth/login", json={
        "email": admin_user.email,
        "password": "AdminPass123!"
    })

    # 1. Invalid signature (plain text disguised as jpg)
    fake_file = BytesIO(b"Not an image header at all")
    res_invalid = client.post(
        "/api/v1/admin/upload",
        files={"file": ("fake.jpg", fake_file, "image/jpeg")}
    )
    assert res_invalid.status_code == 400

    # 2. Valid PNG (valid PNG magic bytes)
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    valid_png = BytesIO(png_bytes)
    res_valid = client.post(
        "/api/v1/admin/upload",
        files={"file": ("test.png", valid_png, "image/png")}
    )
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert data["success"] is True
    assert data["data"]["url"].startswith("/uploads/")
