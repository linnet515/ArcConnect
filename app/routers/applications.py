from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List

from app.db.deps import get_db, get_current_user, get_current_student, get_current_mentor
from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.models.opportunity import Opportunity
from app.schemas.application import ApplicationCreate, ApplicationOut, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["Applications"])


def _enrich(app: Application) -> dict:
    """Helper to add student/mentor/opportunity info to response."""
    data = {c.name: getattr(app, c.name) for c in app.__table__.columns}
    data["student_name"] = app.student.full_name if app.student else None
    data["opportunity_title"] = app.opportunity.title if app.opportunity else None
    data["mentor_name"] = (
        app.opportunity.mentor.full_name
        if app.opportunity and app.opportunity.mentor
        else None
    )
    return data


@router.post("/", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_to_opportunity(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    student: User = Depends(get_current_student),
):
    try:
        opp = db.query(Opportunity).filter(Opportunity.id == payload.opportunity_id).first()
        if not opp:
            raise HTTPException(status_code=404, detail="Opportunity not found.")

        existing = db.query(Application).filter(
            Application.opportunity_id == payload.opportunity_id,
            Application.student_id == student.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="You have already applied to this opportunity.")

        app_obj = Application(
            opportunity_id=payload.opportunity_id,
            student_id=student.id,
            cover_note=payload.cover_note,
            status=ApplicationStatus.pending,
        )
        db.add(app_obj)
        db.commit()
        db.refresh(app_obj)
        return _enrich(app_obj)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while applying to opportunity.")


@router.get("/my", response_model=List[ApplicationOut])
def my_applications(
    db: Session = Depends(get_db),
    student: User = Depends(get_current_student),
):
    try:
        apps = db.query(Application).filter(Application.student_id == student.id).all()
        return [_enrich(a) for a in apps]
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error while fetching my applications.")


@router.get("/opportunity/{opp_id}", response_model=List[ApplicationOut])
def applications_for_opportunity(
    opp_id: int,
    db: Session = Depends(get_db),
    mentor: User = Depends(get_current_mentor),
):
    try:
        opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        if not opp:
            raise HTTPException(status_code=404, detail="Opportunity not found.")
        if opp.mentor_id != mentor.id:
            raise HTTPException(status_code=403, detail="You can only view applications for your own opportunities.")

        apps = db.query(Application).filter(Application.opportunity_id == opp_id).all()
        return [_enrich(a) for a in apps]
    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error while fetching applications for opportunity.")


@router.patch("/{app_id}/status", response_model=ApplicationOut)
def update_application_status(
    app_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    mentor: User = Depends(get_current_mentor),
):
    try:
        app_obj = db.query(Application).filter(Application.id == app_id).first()
        if not app_obj:
            raise HTTPException(status_code=404, detail="Application not found.")

        if app_obj.opportunity.mentor_id != mentor.id:
            raise HTTPException(status_code=403, detail="You can only update applications for your own opportunities.")

        app_obj.status = payload.status
        db.commit()
        db.refresh(app_obj)
        return _enrich(app_obj)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while updating application status.")


@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(
    app_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        app_obj = db.query(Application).filter(Application.id == app_id).first()
        if not app_obj:
            raise HTTPException(status_code=404, detail="Application not found.")

        if user.role == "student" and app_obj.student_id != user.id:
            raise HTTPException(status_code=403, detail="You can only view your own applications.")
        if user.role == "mentor" and app_obj.opportunity.mentor_id != user.id:
            raise HTTPException(status_code=403, detail="You can only view applications for your own opportunities.")

        return _enrich(app_obj)
    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error while fetching application.")

