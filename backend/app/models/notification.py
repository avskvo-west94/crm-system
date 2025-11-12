"""
Notification model
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class NotificationType(str, enum.Enum):
    """Notification type enum"""
    CARD_ASSIGNED = "card_assigned"
    CARD_COMPLETED = "card_completed"
    CARD_COMMENTED = "card_commented"
    CARD_DUE_SOON = "card_due_soon"
    CARD_OVERDUE = "card_overdue"
    MENTION = "mention"
    SYSTEM = "system"


class Notification(Base):
    """Notification model"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    # Links
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=True)
    link = Column(String, nullable=True)
    
    # Status
    is_read = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification {self.title}>"

