"""
app/routers/applications.py
----------------------------
Application routes:
  POST   /applications/           — student applies to an opportunity
  GET    /applications/my         — student views their applications
  GET    /applications/opportunity/{id} — mentor views applications for their opportunity
  PATCH  /applications/{id}/status — mentor updates application status
  GET    /applications/{id}       — get details of a single application
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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
    data["mentor_name"] = app.opportunity.mentor.full_name if app.opportunity and app.opportunity.mentor else None
    return data


# ── Student applies to an opportunity ──
@router.post("/", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_to_opportunity(
    payload: ApplicationCreate,
    db:      Session = Depends(get_db),
    student: User    = Depends(get_current_student),
):
    # Ensure opportunity exists
    opp = db.query(Opportunity).filter(Opportunity.id == payload.opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found.")

    # Prevent duplicate applications
    existing = db.query(Application).filter(
        Application.opportunity_id == payload.opportunity_id,
        Application.student_id == student.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this opportunity.")

    app = Application(
        opportunity_id = payload.opportunity_id,
        student_id     = student.id,
        cover_note     = payload.cover_note,
        status         = ApplicationStatus.pending,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return _enrich(app)


# ── Student views their applications ──
@router.get("/my", response_model=List[ApplicationOut])
def my_applications(
    db:      Session = Depends(get_db),
    student: User    = Depends(get_current_student),
):
    apps = db.query(Application).filter(Application.student_id == student.id).all()
    return [_enrich(a) for a in apps]


# ── Mentor views applications for their opportunity ──
@router.get("/opportunity/{opp_id}", response_model=List[ApplicationOut])
def applications_for_opportunity(
    opp_id: int,
    db:     Session = Depends(get_db),
    mentor: User    = Depends(get_current_mentor),
):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found.")
    if opp.mentor_id != mentor.id:
        raise HTTPException(status_code=403, detail="You can only view applications for your own opportunities.")

    apps = db.query(Application).filter(Application.opportunity_id == opp_id).all()
    return [_enrich(a) for a in apps]


# ── Mentor updates application status ──
@router.patch("/{app_id}/status", response_model=ApplicationOut)
def update_application_status(
    app_id: int,
    payload: ApplicationUpdate,
    db:     Session = Depends(get_db),
    mentor: User    = Depends(get_current_mentor),
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    if app.opportunity.mentor_id != mentor.id:
        raise HTTPException(status_code=403, detail="You can only update applications for your own opportunities.")

    app.status = payload.status
    db.commit()
    db.refresh(app)
    return _enrich(app)


# ── Get details of a single application ──
@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(
    app_id: int,
    db:     Session = Depends(get_db),
    user:   User    = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Access control: student can view their own, mentor can view their opportunity’s
    if user.role == "student" and app.student_id != user.id:
        raise HTTPException(status_code=403, detail="You can only view your own applications.")
    if user.role == "mentor" and app.opportunity.mentor_id != user.id:
        raise HTTPException(status_code=403, detail="You can only view applications for your own opportunities.")

    return _enrich(app)
