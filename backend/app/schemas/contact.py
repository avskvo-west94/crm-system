"""
Contact schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.contact import ContactType
from app.schemas.user import User


class ContactBase(BaseModel):
    """Base contact schema"""
    company_name: str
    contact_person: Optional[str] = None
    type: ContactType = ContactType.CLIENT
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ContactCreate(ContactBase):
    """Schema for creating contact"""
    shared_user_ids: List[int] = []  # Users who can see this contact


class ContactUpdate(BaseModel):
    """Schema for updating contact"""
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    type: Optional[ContactType] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    shared_user_ids: Optional[List[int]] = None


class ContactInDB(ContactBase):
    """Schema for contact in database"""
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Contact(ContactInDB):
    """Schema for contact response"""
    created_by: User
    shared_with_users: List[User] = []

