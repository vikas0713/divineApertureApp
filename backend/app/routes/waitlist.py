from fastapi import APIRouter, Depends, HTTPException, status

from ..schemas import WaitlistCreate, WaitlistResponse
from ..supabase_client import get_admin_client

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


@router.post("", response_model=WaitlistResponse, status_code=status.HTTP_201_CREATED)
async def join_waitlist(payload: WaitlistCreate) -> WaitlistResponse:
    data = payload.model_dump(mode="json")
    data["email"] = str(payload.email).lower()
    if payload.website_url:
        data["website_url"] = str(payload.website_url)
    try:
        result = get_admin_client().table("creator_waitlist").insert(data).execute()
    except Exception as exc:
        message = str(exc).lower()
        if "duplicate" in message or "unique" in message:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already on the waitlist") from exc
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to save waitlist request") from exc
    if not result.data:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Waitlist request was not saved")
    record = result.data[0]
    return WaitlistResponse(id=record["id"], status=record["status"], created_at=record["created_at"])
