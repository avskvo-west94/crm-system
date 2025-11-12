"""
Authentication endpoints
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.user import Token, UserLogin, User as UserSchema, AdminCreate
from datetime import datetime

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Вход в систему
    """
    # Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь неактивен"
        )
    
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь не согласован администратором"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserSchema)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Получить информацию о текущем пользователе
    """
    return current_user


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Выход из системы
    """
    return {"message": "Успешный выход"}


@router.get("/check-admin")
async def check_admin_exists(db: Session = Depends(get_db)):
    """
    Проверить наличие администратора в системе
    """
    from app.models.user import UserRole
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    return {"admin_exists": admin is not None}


@router.post("/create-admin", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_first_admin(
    admin_data: AdminCreate,
    db: Session = Depends(get_db)
):
    """
    Создать первого администратора (только если админов нет)
    """
    from app.models.user import UserRole
    from app.core.security import get_password_hash
    
    # Check if admin already exists
    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Администратор уже существует. Используйте существующего администратора для создания пользователей."
        )
    
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == admin_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Пользователь с email {admin_data.email} уже существует"
        )
    
    # Create admin user
    admin = User(
        email=admin_data.email,
        full_name=admin_data.full_name,
        hashed_password=get_password_hash(admin_data.password),
        role=UserRole.ADMIN,
        is_active=True,
        is_approved=True  # Администратор автоматически согласован
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return admin


@router.post("/reset-admin-password")
async def reset_admin_password(
    reset_data: dict,
    db: Session = Depends(get_db)
):
    """
    Сброс пароля администратора по токену безопасности
    """
    from app.models.user import UserRole
    from app.core.security import get_password_hash
    
    # Проверка токена безопасности (можно хранить в настройках или переменной окружения)
    SECURITY_TOKEN = "admin_reset_token_2024"  # В проде использовать более сложный токен
    
    if reset_data.get("security_token") != SECURITY_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неверный токен безопасности"
        )
    
    # Найти администратора
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Администратор не найден"
        )
    
    # Проверка нового пароля
    new_password = reset_data.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароль должен быть не менее 6 символов"
        )
    
    # Обновить пароль
    admin.hashed_password = get_password_hash(new_password)
    db.commit()
    db.refresh(admin)
    
    return {
        "message": "Пароль администратора успешно сброшен",
        "email": admin.email
    }
