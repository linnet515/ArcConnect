from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    role = Column(String(50), nullable=False)  # "mentor" or "student"
    institution = Column(String(255), nullable=False)
    linkedin = Column(String(255), nullable=True)

    # ✅ tags stored as PostgreSQL array
    tags = Column(ARRAY(String), nullable=True)

    years_experience = Column(Integer, nullable=True)
    availability = Column(Integer, nullable=True)  # e.g. hours per week
    bio = Column(Text, nullable=True)
    motivation = Column(Text, nullable=True)

    mentor_status = Column(String(50), nullable=True)  # e.g. "active", "pending"
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # ── Relationships ──
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")
    opportunities = relationship("Opportunity", back_populates="mentor", cascade="all, delete-orphan")

    feedback_given = relationship("Feedback", foreign_keys="Feedback.student_id", cascade="all, delete-orphan")
    feedback_received = relationship("Feedback", foreign_keys="Feedback.mentor_id", cascade="all, delete-orphan")

    sessions_as_student = relationship("Session", foreign_keys="Session.student_id", cascade="all, delete-orphan")
    sessions_as_mentor = relationship("Session", foreign_keys="Session.mentor_id", cascade="all, delete-orphan")

    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
