"""
app/routers/notifications.py
-------------------------------
Notification routes:
  GET   /notifications/             — list current user's notifications (newest first)
  PATCH /notifications/{id}/read    — mark a single notification as read
  PATCH /notifications/read-all     — mark all notifications as read
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.deps import get_db, get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=List[NotificationOut])
def list_notifications(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """List all notifications for the current user (newest first)."""
    items = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return items


@router.patch("/{notif_id}/read", response_model=NotificationOut)
def mark_read(
    notif_id: int,
    db:       Session = Depends(get_db),
    user:     User    = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    if notif.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only update your own notifications.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.patch("/read-all")
def mark_all_read(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Mark all notifications for the current user as read."""
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}
