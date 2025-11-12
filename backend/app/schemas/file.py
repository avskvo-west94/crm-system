"""
File schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import User


class FileBase(BaseModel):
    """Base file schema"""
    original_filename: str
    mime_type: Optional[str] = None


class FileInDB(FileBase):
    """Schema for file in database"""
    id: int
    filename: str
    file_path: str
    file_size: int
    card_id: Optional[int] = None
    uploaded_by_id: int
    retention_days: Optional[int] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class File(FileInDB):
    """Schema for file response"""
    uploaded_by: User

