"""
Chat endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import ChatConversation, ChatMessage
from app.schemas.chat import (
    ChatConversation as ChatConversationSchema,
    ChatConversationCreate,
    ChatConversationList,
    ChatMessage as ChatMessageSchema,
    ChatMessageCreate,
    ChatMessageWithSender
)

router = APIRouter()


@router.get("/conversations", response_model=List[ChatConversationList])
async def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить список всех чатов пользователя
    """
    # Get all conversations where user is a participant
    conversations = db.query(ChatConversation).filter(
        ChatConversation.participants.contains(current_user)
    ).all()
    
    result = []
    for conv in conversations:
        # Get unread count
        unread_count = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conv.id,
            ChatMessage.sender_id != current_user.id,
            ChatMessage.is_read == False
        ).count()
        
        # Get last message
        last_message = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conv.id
        ).order_by(ChatMessage.created_at.desc()).first()
        
        result.append(ChatConversationList(
            id=conv.id,
            type=conv.type,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            participants=conv.participants,
            messages=[last_message] if last_message else [],
            unread_count=unread_count,
            last_message=last_message
        ))
    
    return result


@router.post("/conversations", response_model=ChatConversationSchema, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ChatConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Создать новый чат
    """
    # For direct chat, ensure only 2 participants
    if conversation_data.type == "direct":
        if len(conversation_data.participant_ids) != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Direct chat должен иметь ровно одного собеседника"
            )
    
    # Get all participants including current user
    participant_ids = [current_user.id] + conversation_data.participant_ids
    participants = db.query(User).filter(User.id.in_(participant_ids)).all()
    
    # Check if direct chat already exists
    if conversation_data.type == "direct":
        existing = db.query(ChatConversation).filter(
            ChatConversation.type == "direct",
            ChatConversation.participants.contains(current_user),
            ChatConversation.participants.contains(participants[0])
        ).first()
        if existing:
            return existing
    
    # Create new conversation
    conversation = ChatConversation(
        type=conversation_data.type,
        title=conversation_data.title
    )
    conversation.participants = participants
    
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    return conversation


@router.get("/conversations/{conversation_id}", response_model=ChatConversationSchema)
async def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить чат по ID
    """
    conversation = db.query(ChatConversation).filter(ChatConversation.id == conversation_id).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден"
        )
    
    # Check if user is participant
    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому чату"
        )
    
    # Load messages with senders
    messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    conversation.messages = messages
    
    return conversation


@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessageSchema, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    message_data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Отправить сообщение в чат
    """
    conversation = db.query(ChatConversation).filter(ChatConversation.id == conversation_id).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден"
        )
    
    # Check if user is participant
    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому чату"
        )
    
    # Create message
    message = ChatMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=message_data.content,
        linked_card_id=message_data.linked_card_id
    )
    
    db.add(message)
    
    # Update conversation timestamp
    from datetime import datetime
    conversation.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    
    return message


@router.post("/messages/{message_id}/read")
async def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Пометить сообщение как прочитанное
    """
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сообщение не найдено"
        )
    
    # Check if user has access
    conversation = db.query(ChatConversation).filter(ChatConversation.id == message.conversation_id).first()
    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому сообщению"
        )
    
    message.is_read = True
    db.commit()
    
    return {"message": "Сообщение помечено как прочитанное"}


@router.post("/conversations/{conversation_id}/read-all")
async def mark_all_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Пометить все сообщения в чате как прочитанные
    """
    conversation = db.query(ChatConversation).filter(ChatConversation.id == conversation_id).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден"
        )
    
    # Check if user is participant
    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому чату"
        )
    
    # Mark all messages as read
    db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id,
        ChatMessage.sender_id != current_user.id
    ).update({"is_read": True})
    
    db.commit()
    
    return {"message": "Все сообщения помечены как прочитанные"}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Удалить чат
    """
    conversation = db.query(ChatConversation).filter(ChatConversation.id == conversation_id).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден"
        )
    
    # Check if user is participant
    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому чату"
        )
    
    db.delete(conversation)
    db.commit()
    
    return {"message": "Чат удален"}

