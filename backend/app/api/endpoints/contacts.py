"""
Contact management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, check_manager_or_admin
from app.models.user import User
from app.models.contact import Contact, contact_shared_users
from app.schemas.contact import Contact as ContactSchema, ContactCreate, ContactUpdate

router = APIRouter()


@router.get("/", response_model=List[ContactSchema])
async def get_contacts(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить список контактов (только те, которые созданы текущим пользователем или расшарены с ним)
    """
    query = db.query(Contact).filter(
        (Contact.created_by_id == current_user.id) |
        (Contact.id.in_(
            db.query(contact_shared_users.c.contact_id).filter(
                contact_shared_users.c.user_id == current_user.id
            )
        ))
    )
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Contact.company_name.ilike(search_pattern)) |
            (Contact.contact_person.ilike(search_pattern)) |
            (Contact.email.ilike(search_pattern))
        )
    
    contacts = query.offset(skip).limit(limit).all()
    return contacts


@router.post("/", response_model=ContactSchema, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact_in: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Создать новый контакт
    """
    contact_data = contact_in.dict(exclude={"shared_user_ids"})
    contact = Contact(
        **contact_data,
        created_by_id=current_user.id
    )
    
    db.add(contact)
    db.flush()
    
    # Add shared users
    if contact_in.shared_user_ids:
        for user_id in contact_in.shared_user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                contact.shared_with_users.append(user)
    
    db.commit()
    db.refresh(contact)
    
    return contact


@router.get("/{contact_id}", response_model=ContactSchema)
async def get_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить контакт по ID
    """
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Контакт не найден"
        )
    return contact


@router.put("/{contact_id}", response_model=ContactSchema)
async def update_contact(
    contact_id: int,
    contact_in: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Обновить контакт
    """
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Контакт не найден"
        )
    
    # Update contact fields
    update_data = contact_in.dict(exclude_unset=True, exclude={"shared_user_ids"})
    for field, value in update_data.items():
        setattr(contact, field, value)
    
    # Update shared users if provided
    if "shared_user_ids" in contact_in.dict(exclude_unset=True):
        # Clear existing shared users
        contact.shared_with_users = []
        db.flush()
        
        # Add new shared users
        if contact_in.shared_user_ids:
            for user_id in contact_in.shared_user_ids:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    contact.shared_with_users.append(user)
    
    db.commit()
    db.refresh(contact)
    
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Удалить контакт
    """
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Контакт не найден"
        )
    
    db.delete(contact)
    db.commit()
    
    return None

