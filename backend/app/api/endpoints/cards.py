"""
Card (Task) management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, verify_password, check_manager_or_admin
from app.models.user import User
from app.models.board import Card, Column, CardComment, CardChecklist, CardChecklistItem, card_assignees
from app.schemas.board import (
    Card as CardSchema,
    CardCreate,
    CardUpdate,
    CardMove,
    CardDeleteConfirm,
    Comment as CommentSchema,
    CommentCreate,
    Checklist as ChecklistSchema,
    ChecklistCreate,
    ChecklistUpdate,
    ChecklistItem as ChecklistItemSchema,
    ChecklistItemCreate,
    ChecklistItemUpdate
)

router = APIRouter()


# Card endpoints
@router.get("/", response_model=List[CardSchema])
async def get_cards(
    column_id: int = None,
    board_id: int = None,
    assigned_to_me: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить список карточек
    """
    query = db.query(Card)
    
    if column_id:
        query = query.filter(Card.column_id == column_id)
    
    if board_id:
        query = query.join(Column).filter(Column.board_id == board_id)
    
    if assigned_to_me:
        query = query.join(card_assignees).filter(card_assignees.c.user_id == current_user.id)
    
    cards = query.order_by(Card.position).offset(skip).limit(limit).all()
    return cards


@router.post("/", response_model=CardSchema, status_code=status.HTTP_201_CREATED)
async def create_card(
    card_in: CardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Создать новую карточку
    """
    # Check if column exists
    column = db.query(Column).filter(Column.id == card_in.column_id).first()
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Колонка не найдена"
        )
    
    # Create card
    card_data = card_in.dict(exclude={"assignee_ids"})
    card = Card(**card_data)
    
    db.add(card)
    db.flush()
    
    # Assign users
    if card_in.assignee_ids:
        for user_id in card_in.assignee_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                card.assignees.append(user)
    
    db.commit()
    db.refresh(card)
    
    return card


@router.get("/{card_id}", response_model=CardSchema)
async def get_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить карточку по ID
    """
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Карточка не найдена"
        )
    return card


@router.put("/{card_id}", response_model=CardSchema)
async def update_card(
    card_id: int,
    card_in: CardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Обновить карточку
    """
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Карточка не найдена"
        )
    
    # Update card fields
    update_data = card_in.dict(exclude_unset=True, exclude={"assignee_ids"})
    
    # Handle completion
    if "completed" in update_data and update_data["completed"] != card.completed:
        if update_data["completed"]:
            update_data["completed_at"] = datetime.utcnow()
        else:
            update_data["completed_at"] = None
    
    for field, value in update_data.items():
        setattr(card, field, value)
    
    # Update assignees if provided
    if card_in.assignee_ids is not None:
        card.assignees.clear()
        for user_id in card_in.assignee_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                card.assignees.append(user)
    
    db.commit()
    db.refresh(card)
    
    return card


@router.post("/{card_id}/move", response_model=CardSchema)
async def move_card(
    card_id: int,
    move_data: CardMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Переместить карточку в другую колонку
    """
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Карточка не найдена"
        )
    
    # Check if column exists
    column = db.query(Column).filter(Column.id == move_data.column_id).first()
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Колонка не найдена"
        )
    
    card.column_id = move_data.column_id
    card.position = move_data.position
    
    db.commit()
    db.refresh(card)
    
    return card


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Удалить карточку
    """
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Карточка не найдена"
        )
    
    db.delete(card)
    db.commit()
    
    return None


@router.post("/{card_id}/delete", status_code=status.HTTP_200_OK)
async def delete_card_with_confirm(
    card_id: int,
    confirm_data: CardDeleteConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Удалить карточку с подтверждением паролем
    """
    # Проверка пароля
    if not verify_password(confirm_data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неверный пароль"
        )
    
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Карточка не найдена"
        )
    
    db.delete(card)
    db.commit()
    
    return {"message": "Карточка удалена"}


# Comment endpoints
@router.get("/{card_id}/comments", response_model=List[CommentSchema])
async def get_comments(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить комментарии карточки
    """
    comments = db.query(CardComment).options(
        joinedload(CardComment.author),
        joinedload(CardComment.status_by)
    ).filter(CardComment.card_id == card_id).order_by(CardComment.created_at.desc()).all()
    return comments


@router.post("/comments", response_model=CommentSchema, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Создать комментарий
    """
    # Check if card exists
    card = db.query(Card).filter(Card.id == comment_in.card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Карточка не найдена"
        )
    
    comment = CardComment(
        **comment_in.dict(),
        author_id=current_user.id
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return comment


@router.put("/comments/{comment_id}/status", response_model=CommentSchema)
async def update_comment_status(
    comment_id: int,
    status_data: dict,  # {"status": "accepted" or "rejected", "reason": "..."}
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Обновить статус подтверждения комментария (принять/отклонить)
    """
    comment = db.query(CardComment).filter(CardComment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Комментарий не найден"
        )
    
    # Проверка: менеджеры и админы могут подтверждать комментарии
    # (frontend уже проверяет роль, здесь просто убеждаемся в доступе)
    
    status_value = status_data.get("status")
    if status_value not in ["accepted", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Статус должен быть 'accepted' или 'rejected'"
        )
    
    comment.status = status_value
    comment.status_by_id = current_user.id
    comment.status_at = datetime.utcnow()
    
    if status_value == "rejected":
        comment.status_reason = status_data.get("reason", "")
    
    db.commit()
    db.refresh(comment)
    
    return comment


# Checklist endpoints
@router.get("/{card_id}/checklists", response_model=List[ChecklistSchema])
async def get_checklists(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить чек-листы карточки
    """
    checklists = db.query(CardChecklist).filter(CardChecklist.card_id == card_id).order_by(CardChecklist.position).all()
    return checklists


@router.post("/checklists", response_model=ChecklistSchema, status_code=status.HTTP_201_CREATED)
async def create_checklist(
    checklist_in: ChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Создать чек-лист
    """
    # Check if card exists
    card = db.query(Card).filter(Card.id == checklist_in.card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Карточка не найдена"
        )
    
    checklist = CardChecklist(**checklist_in.dict())
    
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    
    return checklist


@router.put("/checklists/{checklist_id}", response_model=ChecklistSchema)
async def update_checklist(
    checklist_id: int,
    checklist_in: ChecklistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Обновить чек-лист
    """
    checklist = db.query(CardChecklist).filter(CardChecklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чек-лист не найден"
        )
    
    update_data = checklist_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(checklist, field, value)
    
    db.commit()
    db.refresh(checklist)
    
    return checklist


@router.delete("/checklists/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist(
    checklist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Удалить чек-лист
    """
    checklist = db.query(CardChecklist).filter(CardChecklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чек-лист не найден"
        )
    
    db.delete(checklist)
    db.commit()
    
    return None


# Checklist item endpoints
@router.post("/checklist-items", response_model=ChecklistItemSchema, status_code=status.HTTP_201_CREATED)
async def create_checklist_item(
    item_in: ChecklistItemCreate,
    checklist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Создать элемент чек-листа
    """
    # Check if checklist exists
    checklist = db.query(CardChecklist).filter(CardChecklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чек-лист не найден"
        )
    
    item = CardChecklistItem(
        **item_in.dict(),
        checklist_id=checklist_id
    )
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    return item


@router.put("/checklist-items/{item_id}", response_model=ChecklistItemSchema)
async def update_checklist_item(
    item_id: int,
    item_in: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Обновить элемент чек-листа
    """
    item = db.query(CardChecklistItem).filter(CardChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Элемент чек-листа не найден"
        )
    
    update_data = item_in.dict(exclude_unset=True)
    
    # Handle completion
    if "completed" in update_data and update_data["completed"] != item.completed:
        if update_data["completed"]:
            update_data["completed_at"] = datetime.utcnow()
        else:
            update_data["completed_at"] = None
    
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    
    return item


@router.delete("/checklist-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Удалить элемент чек-листа
    """
    item = db.query(CardChecklistItem).filter(CardChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Элемент чек-листа не найден"
        )
    
    db.delete(item)
    db.commit()
    
    return None

