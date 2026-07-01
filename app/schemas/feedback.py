from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FeedbackCreate(BaseModel):
    application_id: int
    rating: int
    comment: Optional[str] = None

class FeedbackOut(BaseModel):
    id: int
    application_id: int
    student_id: int
    mentor_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime

    # Enriched fields
    student_name: Optional[str] = None
    mentor_name: Optional[str] = None
    opportunity_title: Optional[str] = None

    class Config:
        from_attributes = True
