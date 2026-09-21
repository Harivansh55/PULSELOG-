from typing import List, Optional
from pydantic import BaseModel


class FeedItem(BaseModel):
    id: str
    url: str
    title: str
    content_html: str
    content_text: Optional[str] = None
    date_published: str
    tags: Optional[List[str]] = None
    _pulselog_markdown: Optional[str] = None


class JSONFeedResponse(BaseModel):
    version: str = "https://jsonfeed.org/version/1.1"
    title: str = "PulseLog — Changelog & Product Updates Hub"
    home_page_url: str
    feed_url: str
    description: Optional[str] = "The latest product announcements, improvements, and fixes."
    items: List[FeedItem]
