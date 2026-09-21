from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.changelog import Changelog
from app.schemas.feed import JSONFeedResponse, FeedItem
from app.utils.sanitize import render_markdown_to_safe_html

router = APIRouter(prefix="/api/v1/changelog", tags=["Feed"])


@router.get("/feed", response_model=JSONFeedResponse)
def get_json_feed(request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    base_url = str(request.base_url).rstrip("/")
    frontend_url = settings.FRONTEND_URL.rstrip("/")

    items = (
        db.query(Changelog)
        .filter(Changelog.status == "Published")
        .order_by(Changelog.published_at.desc())
        .all()
    )

    feed_items = []
    for item in items:
        html = render_markdown_to_safe_html(item.content_markdown)
        date_str = item.published_at.isoformat() + "Z" if item.published_at else item.created_at.isoformat() + "Z"
        feed_items.append(
            FeedItem(
                id=str(item.id),
                url=f"{frontend_url}/#changelog-{item.slug}",
                title=item.title,
                content_html=html,
                content_text=item.content_markdown[:300] + ("..." if len(item.content_markdown) > 300 else ""),
                date_published=date_str,
                tags=[item.category],
                _pulselog_markdown=item.content_markdown
            )
        )

    return JSONFeedResponse(
        version="https://jsonfeed.org/version/1.1",
        title="PulseLog — Changelog & Product Updates Hub",
        home_page_url=frontend_url,
        feed_url=f"{base_url}/api/v1/changelog/feed",
        description="The latest product announcements, improvements, and fixes.",
        items=feed_items
    )
