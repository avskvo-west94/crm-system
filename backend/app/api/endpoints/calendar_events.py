"""
Calendar event endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.calendar_event import CalendarEvent, calendar_event_shared_users
from app.schemas.calendar_event import CalendarEvent as CalendarEventSchema, CalendarEventCreate, CalendarEventUpdate

router = APIRouter()


@router.get("/", response_model=List[CalendarEventSchema])
async def get_calendar_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить события календаря (только созданные текущим пользователем или расшаренные с ним)
    """
    query = db.query(CalendarEvent).options(
        joinedload(CalendarEvent.created_by),
        joinedload(CalendarEvent.shared_with_users)
    ).filter(
        (CalendarEvent.created_by_id == current_user.id) |
        (CalendarEvent.id.in_(
            db.query(calendar_event_shared_users.c.event_id).filter(
                calendar_event_shared_users.c.user_id == current_user.id
            )
        ))
    )
    
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(CalendarEvent.start_date >= start_dt)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(CalendarEvent.start_date <= end_dt)
        except ValueError:
            pass
    
    events = query.order_by(CalendarEvent.start_date).offset(skip).limit(limit).all()
    return events


@router.post("/", response_model=CalendarEventSchema, status_code=status.HTTP_201_CREATED)
async def create_calendar_event(
    event_in: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Создать событие календаря
    """
    event_data = event_in.dict(exclude={"shared_user_ids"})
    event = CalendarEvent(
        **event_data,
        created_by_id=current_user.id
    )
    
    db.add(event)
    db.flush()
    
    # Add shared users
    if event_in.shared_user_ids:
        for user_id in event_in.shared_user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                event.shared_with_users.append(user)
    
    db.commit()
    
    # Загружаем relationships для возврата
    db.refresh(event, attribute_names=['created_by', 'shared_with_users'])
    
    return event


@router.get("/{event_id}", response_model=CalendarEventSchema)
async def get_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить событие по ID
    """
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Событие не найдено"
        )
    return event


@router.put("/{event_id}", response_model=CalendarEventSchema)
async def update_calendar_event(
    event_id: int,
    event_in: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Обновить событие
    """
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Событие не найдено"
        )
    
    # Update event fields
    update_data = event_in.dict(exclude_unset=True, exclude={"shared_user_ids"})
    for field, value in update_data.items():
        setattr(event, field, value)
    
    # Update shared users if provided
    if "shared_user_ids" in event_in.dict(exclude_unset=True):
        # Clear existing shared users
        event.shared_with_users = []
        db.flush()
        
        # Add new shared users
        if event_in.shared_user_ids:
            for user_id in event_in.shared_user_ids:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    event.shared_with_users.append(user)
    
    db.commit()
    
    # Загружаем relationships для возврата
    db.refresh(event, attribute_names=['created_by', 'shared_with_users'])
    
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Удалить событие
    """
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Событие не найдено"
        )
    
    db.delete(event)
    db.commit()
    
    return None
