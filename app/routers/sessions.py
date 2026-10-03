from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List

from app.db.deps import get_db, get_current_user, get_current_mentor
from app.models.user import User
from app.models.sessions import Session, SessionStatus
from app.models.opportunity import Opportunity
from app.models.notification import Notification, NotificationType
from app.schemas.sessions import SessionCreate, SessionUpdate, SessionOut

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def _enrich(s: Session) -> dict:
    """Helper to add mentor/student names to response."""
    data = {c.name: getattr(s, c.name) for c in s.__table__.columns}
    data["mentor_name"] = s.mentor.full_name if s.mentor else None
    data["student_name"] = s.student.full_name if s.student else None
    return data


@router.post("/", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: DBSession = Depends(get_db),
    mentor: User = Depends(get_current_mentor),
):
    session_obj = None
    try:
        session_obj = Session(
            title=payload.title,
            description=payload.description,
            scheduled_at=payload.scheduled_at,
            duration_mins=payload.duration_mins,
            meeting_link=payload.meeting_link,
            mentor_id=mentor.id,
            student_id=payload.student_id,
            opportunity_id=payload.opportunity_id,
        )

        if payload.opportunity_id:
            opp = db.query(Opportunity).filter(Opportunity.id == payload.opportunity_id).first()
            if opp:
                session_obj.domain = opp.domain

        db.add(session_obj)
        db.add(
            Notification(
                user_id=payload.student_id,
                title="Session scheduled",
                message=f"{mentor.full_name} scheduled '{payload.title}' on {payload.scheduled_at.strftime('%b %d, %Y at %I:%M %p')}.",
                type=NotificationType.session_scheduled,
            )
        )

        db.commit()
        db.refresh(session_obj)
        return _enrich(session_obj)
    except HTTPException:
        if db:
            db.rollback()
        raise
    except SQLAlchemyError:
        if db:
            db.rollback()
        raise HTTPException(status_code=500, detail="Database error while creating session.")


@router.get("/my", response_model=List[SessionOut])
def my_sessions(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        if user.role == "mentor":
            sessions = db.query(Session).filter(Session.mentor_id == user.id).all()
        else:
            sessions = db.query(Session).filter(Session.student_id == user.id).all()
        return [_enrich(s) for s in sessions]
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error while fetching sessions.")


@router.patch("/{session_id}", response_model=SessionOut)
def update_session(
    session_id: int,
    payload: SessionUpdate,
    db: DBSession = Depends(get_db),
    mentor: User = Depends(get_current_mentor),
):
    try:
        session_obj = db.query(Session).filter(Session.id == session_id).first()
        if not session_obj:
            raise HTTPException(status_code=404, detail="Session not found.")
        if session_obj.mentor_id != mentor.id:
            raise HTTPException(status_code=403, detail="You can only update your own sessions.")

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(session_obj, field, value)

        db.commit()
        db.refresh(session_obj)
        return _enrich(session_obj)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while updating session.")

