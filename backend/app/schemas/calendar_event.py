"""
Calendar event schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import User


class CalendarEventBase(BaseModel):
    """Base calendar event schema"""
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    all_day: bool = False
    color: str = "#3B82F6"


class CalendarEventCreate(CalendarEventBase):
    """Schema for creating calendar event"""
    card_id: Optional[int] = None
    shared_user_ids: List[int] = []  # Users who can see this event


class CalendarEventUpdate(BaseModel):
    """Schema for updating calendar event"""
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    all_day: Optional[bool] = None
    color: Optional[str] = None
    card_id: Optional[int] = None
    shared_user_ids: Optional[List[int]] = None


class CalendarEventInDB(CalendarEventBase):
    """Schema for calendar event in database"""
    id: int
    card_id: Optional[int] = None
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CalendarEvent(CalendarEventInDB):
    """Schema for calendar event response"""
    created_by: User
    shared_with_users: List[User] = []

