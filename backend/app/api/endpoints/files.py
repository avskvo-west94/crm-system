"""
File management endpoints
"""
import os
import uuid
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.file import File
from app.schemas.file import File as FileSchema

router = APIRouter()


@router.get("/", response_model=List[FileSchema])
async def get_files(
    card_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить список файлов
    """
    query = db.query(File)
    
    if card_id:
        query = query.filter(File.card_id == card_id)
    
    files = query.offset(skip).limit(limit).all()
    return files


@router.post("/upload", response_model=FileSchema, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    card_id: Optional[int] = Form(None),
    retention_days: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Загрузить файл
    retention_days: Количество дней хранения файла (None = бессрочно)
    """
    # Check file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Файл слишком большой. Максимальный размер: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
        )
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Calculate expiration date - всегда устанавливаем срок, по умолчанию полгода
    expires_at = None
    if retention_days is not None:
        expires_at = datetime.utcnow() + timedelta(days=retention_days)
    else:
        # По умолчанию полгода если не указано
        expires_at = datetime.utcnow() + timedelta(days=180)
    
    # Create file record
    file_record = File(
        filename=unique_filename,
        original_filename=file.filename,
        file_path=file_path,
        mime_type=file.content_type,
        file_size=file_size,
        card_id=card_id,
        uploaded_by_id=current_user.id,
        retention_days=retention_days,
        expires_at=expires_at
    )
    
    db.add(file_record)
    db.commit()
    db.refresh(file_record)
    
    return file_record


@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Скачать файл
    """
    file_record = db.query(File).filter(File.id == file_id).first()
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден"
        )
    
    if not os.path.exists(file_record.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден на диске"
        )
    
    return FileResponse(
        file_record.file_path,
        media_type=file_record.mime_type,
        filename=file_record.original_filename
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Удалить файл
    """
    file_record = db.query(File).filter(File.id == file_id).first()
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден"
        )
    
    # Delete physical file
    if os.path.exists(file_record.file_path):
        os.remove(file_record.file_path)
    
    # Delete database record
    db.delete(file_record)
    db.commit()
    
    return None

