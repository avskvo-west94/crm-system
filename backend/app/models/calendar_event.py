"""
Calendar event model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


# Association table for calendar event shared users
calendar_event_shared_users = Table(
    "calendar_event_shared_users",
    Base.metadata,
    Column("event_id", Integer, ForeignKey("calendar_events.id", ondelete="CASCADE")),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"))
)


class CalendarEvent(Base):
    """Calendar event model"""
    __tablename__ = "calendar_events"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Date and time
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    all_day = Column(Boolean, default=False)
    
    # Links
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Color for display
    color = Column(String, default="#3B82F6")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", back_populates="calendar_events")
    shared_with_users = relationship("User", secondary=calendar_event_shared_users, back_populates="shared_calendar_events")
    
    def __repr__(self):
        return f"<CalendarEvent {self.title}>"

