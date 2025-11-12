"""
Chat models
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base

# Association table for chat participants
chat_participants = Table(
    'chat_participants',
    Base.metadata,
    Column('conversation_id', Integer, ForeignKey('chat_conversations.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
)


class ChatConversation(Base):
    """Chat conversation model"""
    __tablename__ = "chat_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False, default="direct")  # direct, group
    title = Column(String, nullable=True)  # Название для группового чата
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    participants = relationship("User", secondary=chat_participants, back_populates="chat_conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Chat message model"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    
    # Link to task/card (опционально)
    linked_card_id = Column(Integer, ForeignKey("cards.id"), nullable=True)
    
    # Read status
    is_read = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    conversation = relationship("ChatConversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="chat_messages_sent")
    linked_card = relationship("Card", foreign_keys=[linked_card_id])

