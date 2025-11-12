"""
Notification schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.notification import NotificationType


class NotificationBase(BaseModel):
    """Base notification schema"""
    type: NotificationType
    title: str
    message: str
    link: Optional[str] = None


class NotificationCreate(NotificationBase):
    """Schema for creating notification"""
    user_id: int
    card_id: Optional[int] = None


class NotificationInDB(NotificationBase):
    """Schema for notification in database"""
    id: int
    user_id: int
    card_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Notification(NotificationInDB):
    """Schema for notification response"""
    pass


class NotificationUpdate(BaseModel):
    """Schema for updating notification"""
    is_read: bool

