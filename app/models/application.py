from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base
import enum


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    ongoing = "ongoing"
    completed = "completed"
    withdrawn = "withdrawn"


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.pending, nullable=False)
    cover_note = Column(Text, nullable=True)
    stage = Column(String(50), nullable=True)   # ✅ String is now imported

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("opportunity_id", "student_id", name="uq_application_student_opportunity"),
    )

    student = relationship("User", back_populates="applications")
    opportunity = relationship("Opportunity", back_populates="applications")

    feedback = relationship("Feedback", back_populates="application", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="application", cascade="all, delete-orphan")
