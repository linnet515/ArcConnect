from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(255), nullable=False)
    domain = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    criteria = Column(Text)
    slots = Column(Integer, default=1)
    duration = Column(String(100))

    is_open = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ✅ Relationships
    mentor = relationship("User", back_populates="opportunities")
    applications = relationship("Application", back_populates="opportunity", cascade="all, delete-orphan")
