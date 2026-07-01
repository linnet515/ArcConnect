from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration_mins: int
    meeting_link: Optional[str] = None
    student_id: int
    opportunity_id: Optional[int] = None

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_mins: Optional[int] = None
    meeting_link: Optional[str] = None
    status: Optional[str] = None

class SessionOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    scheduled_at: datetime
    duration_mins: int
    meeting_link: Optional[str]
    domain: Optional[str]
    status: str
    mentor_id: int
    student_id: int
    opportunity_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
