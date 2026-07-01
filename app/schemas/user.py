from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


class UserSignup(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str
    institution: str
    linkedin: Optional[str] = None
    tags: Optional[List[str]] = []

    years_experience: Optional[int] = None
    availability: Optional[int] = None
    bio: Optional[str] = None
    motivation: Optional[str] = None

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v):
        if v not in ("mentor", "student"):
            raise ValueError("role must be 'mentor' or 'student'")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: str
    institution: Optional[str] = None
    linkedin: Optional[str] = None
    tags: Optional[List[str]] = None   # ✅ changed from str → List[str]
    mentor_status: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SignupResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user: UserOut


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
