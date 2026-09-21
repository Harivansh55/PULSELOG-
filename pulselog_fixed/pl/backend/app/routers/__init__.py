from app.routers.auth import router as auth_router
from app.routers.changelog import router as changelog_router
from app.routers.admin import router as admin_router
from app.routers.reactions import router as reactions_router
from app.routers.notifications import router as notifications_router
from app.routers.upload import router as upload_router
from app.routers.feed import router as feed_router

__all__ = [
    "auth_router",
    "changelog_router",
    "admin_router",
    "reactions_router",
    "notifications_router",
    "upload_router",
    "feed_router",
]
