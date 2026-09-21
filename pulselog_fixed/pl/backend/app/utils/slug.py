import re
import unicodedata
from sqlalchemy.orm import Session
from app.models.changelog import Changelog


def slugify(text: str) -> str:
    """Generate a clean URL-friendly slug from text."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    slug = re.sub(r"[-\s]+", "-", text)
    return slug or "changelog"


def get_unique_slug(db: Session, title: str, exclude_id: int = None) -> str:
    """Generate a unique slug, appending a counter if needed."""
    base_slug = slugify(title)
    slug = base_slug
    counter = 1

    while True:
        query = db.query(Changelog).filter(Changelog.slug == slug)
        if exclude_id is not None:
            query = query.filter(Changelog.id != exclude_id)
        existing = query.first()
        if not existing:
            return slug
        counter += 1
        slug = f"{base_slug}-{counter}"
