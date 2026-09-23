from fastapi import APIRouter, Depends

from ..dependencies import AuthenticatedUser, require_superadmin
from ..schemas import DriveImportRequest, DriveImportResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/drive/import", response_model=DriveImportResponse)
async def import_drive_folder(
    payload: DriveImportRequest,
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> DriveImportResponse:
    """Queue a Drive import; the worker will be connected after provider setup."""
    return DriveImportResponse(
        status="queued",
        message="Drive import endpoint is authenticated and ready for the importer worker.",
        folder_id=payload.folder_id,
    )
