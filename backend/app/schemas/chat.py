"""
Chat schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.schemas.user import User as UserSchema


class ChatMessageBase(BaseModel):
    """Base chat message schema"""
    content: str
    linked_card_id: Optional[int] = None


class ChatMessageCreate(ChatMessageBase):
    """Schema for creating chat message"""
    pass


class ChatMessage(ChatMessageBase):
    """Schema for chat message response"""
    id: int
    conversation_id: int
    sender_id: int
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatMessageWithSender(ChatMessage):
    """Schema for chat message with sender info"""
    sender: UserSchema
    
    class Config:
        from_attributes = True


class ChatConversationBase(BaseModel):
    """Base chat conversation schema"""
    type: str = "direct"
    title: Optional[str] = None


class ChatConversationCreate(ChatConversationBase):
    """Schema for creating chat conversation"""
    participant_ids: List[int] = []


class ChatConversation(ChatConversationBase):
    """Schema for chat conversation response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    participants: List[UserSchema] = []
    messages: List[ChatMessageWithSender] = []
    
    class Config:
        from_attributes = True


class ChatConversationList(ChatConversation):
    """Schema for conversation list response"""
    unread_count: int = 0
    last_message: Optional[ChatMessageWithSender] = None
    
    class Config:
        from_attributes = True

