from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserSignup
from app.core.security import hash_password

router = APIRouter()

@router.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    new_user = User(
        username=user.username,
        email=user.email,
        password=hash_password(user.password),
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Redirect based on role
    if new_user.role == "student":
        return RedirectResponse(url="/student-dashboard.html", status_code=303)
    elif new_user.role == "mentor":
        return RedirectResponse(url="/mentor-dashboard.html", status_code=303)
    else:
        raise HTTPException(status_code=400, detail="Invalid role")
