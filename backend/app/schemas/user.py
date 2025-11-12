"""
User schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_serializer
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.EXECUTOR
    
    @field_serializer('role')
    def serialize_role(self, value: UserRole) -> str:
        """Serialize role enum to lowercase value"""
        return value.value if hasattr(value, 'value') else value


class UserCreate(UserBase):
    """Schema for creating user"""
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    """Schema for updating user"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[bool] = None
    is_approved: Optional[bool] = None  # Согласование пользователя
    theme: Optional[str] = None
    language: Optional[str] = None
    avatar: Optional[str] = None


class UserInDB(UserBase):
    """Schema for user in database"""
    id: int
    is_active: bool
    is_approved: bool
    avatar: Optional[str] = None
    theme: str
    language: str
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class User(UserInDB):
    """Schema for user response"""
    pass


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for authentication token"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema for token data"""
    user_id: Optional[int] = None


class AdminCreate(BaseModel):
    """Schema for creating first admin"""
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str

