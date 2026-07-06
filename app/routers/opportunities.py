from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.db.deps import get_db
from app.models.opportunity import Opportunity
from app.models.application import Application
from app.models.user import User
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate, OpportunityOut
from app.auth.jwt import get_current_user, require_mentor


router = APIRouter(prefix="/opportunities", tags=["opportunities"])


def enrich(opp: Opportunity, db: Session) -> dict:
    count = db.query(Application).filter(Application.opportunity_id == opp.id).count()
    data = OpportunityOut.model_validate(opp).model_dump()
    data["application_count"] = count
    return data


@router.get("", response_model=List[OpportunityOut])
def list_opportunities(
    domain: Optional[str] = Query(None),
    open_only: bool = Query(True),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Opportunity).options(joinedload(Opportunity.mentor))
    if open_only:
        q = q.filter(Opportunity.is_open == True)
    if domain:
        q = q.filter(Opportunity.domain.ilike(f"%{domain}%"))
    opps = q.order_by(Opportunity.created_at.desc()).offset(skip).limit(limit).all()
    return [enrich(o, db) for o in opps]


@router.get("/mine/list", response_model=List[OpportunityOut])
def my_opportunities(
    current_user: User = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    opps = (
        db.query(Opportunity)
        .options(joinedload(Opportunity.mentor))
        .filter(Opportunity.mentor_id == current_user.id)
        .order_by(Opportunity.created_at.desc())
        .all()
    )
    return [enrich(o, db) for o in opps]


@router.get("/{opp_id}", response_model=OpportunityOut)
def get_opportunity(opp_id: int, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).options(joinedload(Opportunity.mentor)).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return enrich(opp, db)


@router.post("", response_model=OpportunityOut, status_code=status.HTTP_201_CREATED)
def create_opportunity(
    payload: OpportunityCreate,
    current_user: User = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    opp = Opportunity(mentor_id=current_user.id, **payload.model_dump())
    db.add(opp)
    db.commit()
    db.refresh(opp)
    db.refresh(opp, ["mentor"])
    return enrich(opp, db)


@router.patch("/{opp_id}", response_model=OpportunityOut)
def update_opportunity(
    opp_id: int,
    payload: OpportunityUpdate,
    current_user: User = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    opp = db.query(Opportunity).filter(
        Opportunity.id == opp_id,
        Opportunity.mentor_id == current_user.id
    ).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found or not yours")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(opp, k, v)
    db.commit()
    db.refresh(opp)
    return enrich(opp, db)


@router.delete("/{opp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opportunity(
    opp_id: int,
    current_user: User = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    opp = db.query(Opportunity).filter(
        Opportunity.id == opp_id,
        Opportunity.mentor_id == current_user.id
    ).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found or not yours")
    db.delete(opp)
    db.commit()
