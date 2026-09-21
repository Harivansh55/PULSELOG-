import os
import uuid
from fastapi import UploadFile, HTTPException, status
from app.config import get_settings

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAGIC_BYTES = {
    b"\xff\xd8\xff": ".jpg",
    b"\x89PNG\r\n\x1a\n": ".png",
}


def validate_magic_bytes(header: bytes) -> str:
    """Validate file signatures for JPEG, PNG, WEBP."""
    if header.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP":
        return ".webp"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid file signature. Only valid JPEG, PNG, and WEBP images are allowed."
    )


class UploadService:
    @staticmethod
    async def save_image(file: UploadFile) -> str:
        settings = get_settings()
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        # Read file content
        content = await file.read()

        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )

        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        # Validate MIME type
        content_type = (file.content_type or "").lower()
        if content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported MIME type: {content_type}. Allowed: JPEG, PNG, WEBP."
            )

        # Validate Magic bytes
        detected_ext = validate_magic_bytes(content[:16])

        # Generate secure random filename
        filename = f"{uuid.uuid4().hex}{detected_ext}"

        # Ensure upload dir exists
        upload_dir = settings.UPLOAD_DIR
        os.makedirs(upload_dir, exist_ok=True)

        target_path = os.path.join(upload_dir, filename)
        with open(target_path, "wb") as f:
            f.write(content)

        return f"/uploads/{filename}"
