from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OpportunityCreate(BaseModel):
    title: str
    domain: str
    description: str
    criteria: Optional[str] = None
    slots: int = 1
    duration: Optional[str] = None


class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    criteria: Optional[str] = None
    slots: Optional[int] = None
    duration: Optional[str] = None
    is_open: Optional[bool] = None


class MentorSummary(BaseModel):
    id: int
    first_name: str
    last_name: str
    institution: Optional[str] = None
    linkedin: Optional[str] = None
    tags: Optional[str] = None

    class Config:
        from_attributes = True


class OpportunityOut(BaseModel):
    id: int
    mentor_id: int
    title: str
    domain: str
    description: str
    criteria: Optional[str] = None
    slots: int
    duration: Optional[str] = None
    is_open: bool
    created_at: datetime
    mentor: Optional[MentorSummary] = None
    application_count: Optional[int] = 0

    class Config:
        from_attributes = True
