"""
Script to create the first admin user
"""
import sys
import os
from getpass import getpass

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole


def create_admin():
    """Create admin user"""
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if admin:
            print(f"Администратор уже существует: {admin.email}")
            response = input("Хотите создать ещё одного администратора? (y/n): ")
            if response.lower() != 'y':
                return
        
        # Get admin details
        print("\n=== Создание администратора ===\n")
        email = input("Email: ").strip()
        
        # Check if user with this email exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"Пользователь с email {email} уже существует!")
            return
        
        full_name = input("Полное имя: ").strip()
        password = getpass("Пароль: ")
        password_confirm = getpass("Подтвердите пароль: ")
        
        if password != password_confirm:
            print("Пароли не совпадают!")
            return
        
        if len(password) < 6:
            print("Пароль должен быть не менее 6 символов!")
            return
        
        if len(password.encode('utf-8')) > 72:
            print("⚠️  Внимание: Пароль будет обрезан до 72 байт (ограничение bcrypt)")
            print("Рекомендуется использовать пароль длиной не более 72 символов.")
        
        # Create admin user
        admin = User(
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        
        print(f"\n✓ Администратор успешно создан!")
        print(f"Email: {email}")
        print(f"Имя: {full_name}")
        print(f"Роль: {admin.role.value}")
        
    except Exception as e:
        print(f"Ошибка при создании администратора: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()

