from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    opportunity_id: int
    cover_note: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationOut(BaseModel):
    id: int
    opportunity_id: int
    student_id: int
    status: str
    cover_note: Optional[str] = None
    stage: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Enriched fields
    student_name: Optional[str] = None
    mentor_name: Optional[str] = None
    opportunity_title: Optional[str] = None

    class Config:
        from_attributes = True

