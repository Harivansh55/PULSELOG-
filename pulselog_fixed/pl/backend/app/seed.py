"""
PulseLog Database Seeder
Seeds development admin, user, and sample changelogs (both Published and Draft).
Usage: python -m app.seed
"""

from datetime import datetime, timedelta
from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.changelog import Changelog
from app.models.reaction import Reaction
from app.models.notification import UserChangelogView
from app.security.password import hash_password
from app.utils.slug import get_unique_slug


def seed_database() -> None:
    print("Seeding PulseLog development database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Development Admin
        admin = db.query(User).filter(User.email == "admin@pulselog.dev").first()
        if not admin:
            admin = User(
                email="admin@pulselog.dev",
                name="PulseLog Admin",
                password_hash=hash_password("AdminPass123!"),
                role="ADMIN",
                email_verified=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("  Created dev admin: admin@pulselog.dev (Password: AdminPass123!)")
        else:
            print("  Dev admin already exists: admin@pulselog.dev")

        # 2. Development User
        user = db.query(User).filter(User.email == "user@pulselog.dev").first()
        if not user:
            user = User(
                email="user@pulselog.dev",
                name="Taylor Swift",
                password_hash=hash_password("UserPass123!"),
                role="USER",
                email_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("  Created dev user: user@pulselog.dev (Password: UserPass123!)")
        else:
            print("  Dev user already exists: user@pulselog.dev")

        # 3. Sample Changelogs
        sample_logs = [
            {
                "title": "v2.4.0 — High-Performance Search and Markdown Publishing Engine",
                "category": "New",
                "status": "Published",
                "published_offset_days": 1,
                "cover_image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&auto=format&fit=crop&q=80",
                "content_markdown": """### Elevating the Changelog Experience

We are thrilled to launch PulseLog v2.4.0, introducing a ground-up rebuilt publishing studio and lightning-fast search capabilities across all product releases.

#### What's New:
* **Instant Sub-50ms Search:** Real-time query matching across release notes, titles, and release tags.
* **Side-by-Side Markdown Studio:** Compose formatted updates with instant live rendering.
* **Interactive Reactions:** Share your excitement with ❤️, 🎉, and 🚀 directly on updates.
* **Open Standard JSON Feed 1.1:** Subscribe through modern feed readers and automated webhooks.

```json
{
  "status": "published",
  "version": "2.4.0",
  "engine": "PulseLog Core"
}
```

Try filtering by category above or click the What's New bell to see unread updates!
"""
            },
            {
                "title": "v2.3.2 — Optimized Image Delivery and Dark Mode Polish",
                "category": "Improved",
                "status": "Published",
                "published_offset_days": 3,
                "cover_image": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&auto=format&fit=crop&q=80",
                "content_markdown": """### Performance & Typography Enhancements

In this release, we focused on UI fluidity, crisp layout math, and image caching:

* **Next-Gen Image Pipeline:** Full support for WEBP and lossless PNG compression under 5MB with magic-byte security checks.
* **Refined Typography Scale:** Switched to high-contrast typographic pairings with generous whitespace for effortless scanning.
* **Accessible Focus Rings:** Enhanced keyboard navigation throughout modal overlays and reaction buttons.

> *Craft is the difference between an application people tolerate and one people love using.*
"""
            },
            {
                "title": "v2.3.1 — Fixed Token Refresh Race Condition & Session Edge Cases",
                "category": "Fixed",
                "status": "Published",
                "published_offset_days": 6,
                "cover_image": None,
                "content_markdown": """### Security & Reliability Fixes

This maintenance release patches session edge cases reported by community members:

1. **Token Refresh Synchronization:** Resolved potential race conditions when multiple parallel tabs refresh expired access tokens simultaneously.
2. **Reuse Detection Hardening:** Immediate automatic revocation of all user sessions whenever a stale or revoked refresh token is detected.
3. **Drawer Badge Synchronization:** Fixed accurate database-driven unread counts when marking changelogs as read.
"""
            },
            {
                "title": "v2.5.0 — Upcoming Webhook Dispatcher and RSS/JSON Automations",
                "category": "New",
                "status": "Draft",
                "published_offset_days": None,
                "cover_image": None,
                "content_markdown": """### Internal Draft: Webhook Dispatcher

*Note: This is a draft changelog visible only in the Admin Dashboard!*

We are preparing automated webhook triggers to ping Slack, Discord, and custom REST targets whenever a changelog is transitioned from `Draft` to `Published`.
"""
            }
        ]

        for item in sample_logs:
            existing = db.query(Changelog).filter(Changelog.title == item["title"]).first()
            if not existing:
                slug = get_unique_slug(db, item["title"])
                pub_date = None
                if item["status"] == "Published":
                    pub_date = datetime.utcnow() - timedelta(days=item["published_offset_days"])

                log_entry = Changelog(
                    title=item["title"],
                    slug=slug,
                    content_markdown=item["content_markdown"],
                    category=item["category"],
                    cover_image=item["cover_image"],
                    status=item["status"],
                    published_at=pub_date
                )
                db.add(log_entry)
                db.commit()
                db.refresh(log_entry)

                # Add sample reactions if published
                if item["status"] == "Published":
                    db.add(Reaction(user_id=admin.id, changelog_id=log_entry.id, reaction_type="heart"))
                    db.add(Reaction(user_id=admin.id, changelog_id=log_entry.id, reaction_type="rocket"))
                    db.add(Reaction(user_id=user.id, changelog_id=log_entry.id, reaction_type="celebrate"))
                    db.commit()

                print(f"  Created sample changelog: {item['title']} [{item['status']}]")

        # Set user unread view date to 2 days ago so they have 1 unread notification
        view = db.query(UserChangelogView).filter(UserChangelogView.user_id == user.id).first()
        if not view:
            db.add(UserChangelogView(
                user_id=user.id,
                last_viewed_changelog_date=datetime.utcnow() - timedelta(days=2)
            ))
            db.commit()

        print("Database seed completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
