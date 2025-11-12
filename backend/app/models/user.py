"""
User model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    """User role enum"""
    ADMIN = "admin"
    MANAGER = "manager"
    EXECUTOR = "executor"


class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.EXECUTOR, nullable=False)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)  # Согласование пользователя администратором
    avatar = Column(String, nullable=True)
    
    # Preferences
    theme = Column(String, default="light")  # light or dark
    language = Column(String, default="ru")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    owned_boards = relationship("Board", back_populates="owner", foreign_keys="Board.owner_id")
    assigned_cards = relationship("Card", secondary="card_assignees", back_populates="assignees")
    comments = relationship("CardComment", back_populates="author", foreign_keys="CardComment.author_id")
    notifications = relationship("Notification", back_populates="user")
    created_contacts = relationship("Contact", back_populates="created_by")
    shared_contacts = relationship("Contact", secondary="contact_shared_users", back_populates="shared_with_users")
    files = relationship("File", back_populates="uploaded_by")
    calendar_events = relationship("CalendarEvent", back_populates="created_by")
    shared_calendar_events = relationship("CalendarEvent", secondary="calendar_event_shared_users", back_populates="shared_with_users")
    chat_messages_sent = relationship("ChatMessage", foreign_keys="ChatMessage.sender_id", back_populates="sender")
    chat_conversations = relationship("ChatConversation", secondary="chat_participants", back_populates="participants")
    
    def __repr__(self):
        return f"<User {self.email}>"

