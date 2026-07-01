from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base
import enum

class SessionStatus(str, enum.Enum):
    scheduled = "scheduled"
    ongoing = "ongoing"
    completed = "completed"
    cancelled = "cancelled"

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    duration_mins = Column(Integer, nullable=False)
    meeting_link = Column(String(255), nullable=True)
    domain = Column(String(100), nullable=True)

    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)

    status = Column(String(50), default=SessionStatus.scheduled.value)
    created_at = Column(DateTime, default=datetime.utcnow)

    mentor = relationship("User", foreign_keys=[mentor_id])
    student = relationship("User", foreign_keys=[student_id])
    opportunity = relationship("Opportunity", back_populates="sessions")
