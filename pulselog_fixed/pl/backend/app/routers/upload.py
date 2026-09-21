from fastapi import APIRouter, Depends, UploadFile, File
from app.dependencies.auth import require_admin
from app.models.user import User
from app.services.upload_service import UploadService

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Upload"])


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    admin_user: User = Depends(require_admin)
):
    url = await UploadService.save_image(file)
    return {
        "success": True,
        "message": "Image uploaded successfully",
        "data": {
            "url": url,
            "filename": file.filename
        }
    }
