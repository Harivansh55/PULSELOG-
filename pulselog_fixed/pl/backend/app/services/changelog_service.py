from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.changelog import Changelog
from app.models.reaction import Reaction
from app.schemas.changelog import ChangelogCreate, ChangelogUpdate
from app.utils.slug import get_unique_slug


class ChangelogService:
    @staticmethod
    def get_reaction_counts_and_user_reactions(
        db: Session,
        changelog_ids: List[int],
        user_id: Optional[int] = None
    ) -> tuple[Dict[int, Dict[str, int]], Dict[int, List[str]]]:
        """Fetch reaction counts and active user reactions for a list of changelog IDs."""
        counts_map: Dict[int, Dict[str, int]] = {
            cid: {"heart": 0, "celebrate": 0, "rocket": 0} for cid in changelog_ids
        }
        user_reactions_map: Dict[int, List[str]] = {cid: [] for cid in changelog_ids}

        if not changelog_ids:
            return counts_map, user_reactions_map

        # Aggregated reaction counts
        reaction_counts = (
            db.query(
                Reaction.changelog_id,
                Reaction.reaction_type,
                func.count(Reaction.id).label("count")
            )
            .filter(Reaction.changelog_id.in_(changelog_ids))
            .group_by(Reaction.changelog_id, Reaction.reaction_type)
            .all()
        )

        for cid, r_type, count in reaction_counts:
            if cid in counts_map and r_type in counts_map[cid]:
                counts_map[cid][r_type] = count

        # User's own reactions
        if user_id:
            user_reacts = (
                db.query(Reaction.changelog_id, Reaction.reaction_type)
                .filter(
                    Reaction.changelog_id.in_(changelog_ids),
                    Reaction.user_id == user_id
                )
                .all()
            )
            for cid, r_type in user_reacts:
                if cid in user_reactions_map:
                    user_reactions_map[cid].append(r_type)

        return counts_map, user_reactions_map

    @staticmethod
    def create(db: Session, data: ChangelogCreate) -> Changelog:
        slug = data.slug.strip() if data.slug else get_unique_slug(db, data.title)
        # Ensure slug uniqueness
        slug = get_unique_slug(db, slug)

        published_at = None
        if data.status == "Published":
            published_at = data.published_at or datetime.utcnow()

        changelog = Changelog(
            title=data.title.strip(),
            slug=slug,
            content_markdown=data.content_markdown,
            category=data.category,
            cover_image=data.cover_image,
            status=data.status,
            published_at=published_at,
        )
        db.add(changelog)
        db.commit()
        db.refresh(changelog)
        return changelog

    @staticmethod
    def get_all_admin(db: Session) -> List[Changelog]:
        return db.query(Changelog).order_by(Changelog.created_at.desc()).all()

    @staticmethod
    def get_by_id(db: Session, changelog_id: int) -> Changelog:
        item = db.query(Changelog).filter(Changelog.id == changelog_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Changelog with ID {changelog_id} not found."
            )
        return item

    @staticmethod
    def update(db: Session, changelog_id: int, data: ChangelogUpdate) -> Changelog:
        item = ChangelogService.get_by_id(db, changelog_id)

        update_data = data.model_dump(exclude_unset=True)

        if "title" in update_data and update_data["title"]:
            item.title = update_data["title"].strip()

        if "slug" in update_data and update_data["slug"]:
            item.slug = get_unique_slug(db, update_data["slug"], exclude_id=item.id)

        if "content_markdown" in update_data:
            item.content_markdown = update_data["content_markdown"]

        if "category" in update_data:
            item.category = update_data["category"]

        if "cover_image" in update_data:
            item.cover_image = update_data["cover_image"]

        if "status" in update_data:
            new_status = update_data["status"]
            if new_status == "Published" and item.status != "Published":
                item.published_at = update_data.get("published_at") or datetime.utcnow()
            elif new_status == "Draft":
                item.published_at = None
            item.status = new_status

        if "published_at" in update_data and update_data["published_at"] is not None:
            item.published_at = update_data["published_at"]

        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete(db: Session, changelog_id: int) -> None:
        item = ChangelogService.get_by_id(db, changelog_id)
        db.delete(item)
        db.commit()

    @staticmethod
    def get_public_timeline(
        db: Session,
        category: Optional[str] = None,
        search: Optional[str] = None,
        current_user_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(Changelog).filter(Changelog.status == "Published")

        if category and category.lower() != "all":
            query = query.filter(func.lower(Changelog.category) == category.lower())

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                func.lower(Changelog.title).like(term) |
                func.lower(Changelog.content_markdown).like(term)
            )

        items = query.order_by(Changelog.published_at.desc()).all()
        ids = [item.id for item in items]
        counts_map, user_reactions_map = ChangelogService.get_reaction_counts_and_user_reactions(
            db, ids, current_user_id
        )

        results = []
        for item in items:
            results.append({
                "id": item.id,
                "title": item.title,
                "slug": item.slug,
                "content_markdown": item.content_markdown,
                "category": item.category,
                "cover_image": item.cover_image,
                "published_at": item.published_at,
                "reactions": counts_map.get(item.id, {"heart": 0, "celebrate": 0, "rocket": 0}),
                "user_reactions": user_reactions_map.get(item.id, [])
            })
        return results

    @staticmethod
    def get_public_by_slug(
        db: Session,
        slug: str,
        current_user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        item = db.query(Changelog).filter(
            Changelog.slug == slug,
            Changelog.status == "Published"
        ).first()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Changelog not found."
            )

        counts_map, user_reactions_map = ChangelogService.get_reaction_counts_and_user_reactions(
            db, [item.id], current_user_id
        )

        return {
            "id": item.id,
            "title": item.title,
            "slug": item.slug,
            "content_markdown": item.content_markdown,
            "category": item.category,
            "cover_image": item.cover_image,
            "published_at": item.published_at,
            "reactions": counts_map.get(item.id, {"heart": 0, "celebrate": 0, "rocket": 0}),
            "user_reactions": user_reactions_map.get(item.id, [])
        }
