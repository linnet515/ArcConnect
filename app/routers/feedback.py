from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List

from app.db.deps import get_db, get_current_student, get_current_mentor
from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.models.feedback import Feedback
from app.models.notification import Notification, NotificationType
from app.schemas.feedback import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["Feedback"])


def _enrich(fb: Feedback) -> dict:
    """Helper to add student/mentor names and opportunity title to response."""
    data = {c.name: getattr(fb, c.name) for c in fb.__table__.columns}
    data["student_name"] = fb.student.full_name if fb.student else None
    data["mentor_name"] = fb.mentor.full_name if fb.mentor else None
    data["opportunity_title"] = (
        fb.application.opportunity.title
        if fb.application and fb.application.opportunity
        else None
    )
    return data


@router.post("/", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    student: User = Depends(get_current_student),
):
    try:
        application = db.query(Application).filter(Application.id == payload.application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found.")
        if application.student_id != student.id:
            raise HTTPException(status_code=403, detail="You can only leave feedback on your own mentorships.")
        if application.status not in [ApplicationStatus.accepted, ApplicationStatus.ongoing, ApplicationStatus.completed]:
            raise HTTPException(status_code=400, detail="You can only leave feedback after being accepted into a mentorship.")

        existing = db.query(Feedback).filter(Feedback.application_id == payload.application_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="You have already submitted feedback for this mentorship.")

        mentor_id = application.opportunity.mentor_id

        feedback_obj = Feedback(
            application_id=payload.application_id,
            student_id=student.id,
            mentor_id=mentor_id,
            rating=payload.rating,
            comment=payload.comment,
        )
        db.add(feedback_obj)

        db.add(
            Notification(
                user_id=mentor_id,
                title=f"New feedback from {student.full_name}",
                message=f"{student.full_name} left a {payload.rating}-star review for '{application.opportunity.title}'.",
                type=NotificationType.feedback_received,
            )
        )

        db.commit()
        db.refresh(feedback_obj)
        return _enrich(feedback_obj)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while submitting feedback.")


@router.get("/mine", response_model=List[FeedbackOut])
def my_feedback(
    db: Session = Depends(get_db),
    student: User = Depends(get_current_student),
):
    try:
        items = db.query(Feedback).filter(Feedback.student_id == student.id).all()
        return [_enrich(f) for f in items]
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error while fetching my feedback.")


@router.get("/received", response_model=List[FeedbackOut])
def received_feedback(
    db: Session = Depends(get_db),
    mentor: User = Depends(get_current_mentor),
):
    try:
        items = db.query(Feedback).filter(Feedback.mentor_id == mentor.id).all()
        return [_enrich(f) for f in items]
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error while fetching received feedback.")


@router.get("/eligible", response_model=List[int])
def eligible_applications(
    db: Session = Depends(get_db),
    student: User = Depends(get_current_student),
):
    try:
        apps = db.query(Application).filter(
            Application.student_id == student.id,
            Application.status.in_([
                ApplicationStatus.accepted,
                ApplicationStatus.ongoing,
                ApplicationStatus.completed,
            ]),
        ).all()

        reviewed_ids = {
            f.application_id
            for f in db.query(Feedback).filter(Feedback.student_id == student.id).all()
        }

        return [a.id for a in apps if a.id not in reviewed_ids]
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error while fetching eligible applications.")

