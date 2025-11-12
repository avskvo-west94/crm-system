"""
Script to initialize database with sample data
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.board import Board, Column
from app.models.contact import Contact, ContactType
from app.core.database import Base


def init_db():
    """Initialize database with sample data"""
    print("Создание таблиц...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(User).first():
            print("База данных уже инициализирована!")
            return
        
        print("Создание пользователей...")
        
        # Create admin
        admin = User(
            email="admin@crm.local",
            full_name="Администратор",
            hashed_password=get_password_hash("Admin123!"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        
        # Create manager
        manager = User(
            email="manager@crm.local",
            full_name="Менеджер",
            hashed_password=get_password_hash("Manager123!"),
            role=UserRole.MANAGER,
            is_active=True
        )
        db.add(manager)
        
        # Create executor
        executor = User(
            email="executor@crm.local",
            full_name="Исполнитель",
            hashed_password=get_password_hash("Executor123!"),
            role=UserRole.EXECUTOR,
            is_active=True
        )
        db.add(executor)
        
        db.flush()
        
        print("Создание демо-доски...")
        
        # Create demo board
        board = Board(
            title="Демонстрационный проект",
            description="Пример проекта для знакомства с системой",
            owner_id=admin.id,
            color="#3B82F6"
        )
        db.add(board)
        db.flush()
        
        # Create columns
        columns_data = [
            {"title": "Запланировано", "position": 0, "color": "#9CA3AF"},
            {"title": "В работе", "position": 1, "color": "#3B82F6"},
            {"title": "На проверке", "position": 2, "color": "#F59E0B"},
            {"title": "Готово", "position": 3, "color": "#10B981"},
        ]
        
        for col_data in columns_data:
            column = Column(board_id=board.id, **col_data)
            db.add(column)
        
        print("Создание демо-контактов...")
        
        # Create demo contacts
        contacts_data = [
            {
                "company_name": "ООО Компания 1",
                "contact_person": "Иванов Иван Иванович",
                "type": ContactType.CLIENT,
                "email": "ivanov@company1.ru",
                "phone": "+7 (999) 123-45-67",
            },
            {
                "company_name": "ИП Петров",
                "contact_person": "Петров Петр Петрович",
                "type": ContactType.PARTNER,
                "email": "petrov@partner.ru",
                "phone": "+7 (999) 234-56-78",
            }
        ]
        
        for contact_data in contacts_data:
            contact = Contact(**contact_data, created_by_id=manager.id)
            db.add(contact)
        
        db.commit()
        
        print("\n✓ База данных успешно инициализирована!")
        print("\nСозданные пользователи:")
        print("  Администратор: admin@crm.local / Admin123!")
        print("  Менеджер: manager@crm.local / Manager123!")
        print("  Исполнитель: executor@crm.local / Executor123!")
        print("\n⚠ Не забудьте изменить пароли после первого входа!")
        
    except Exception as e:
        print(f"Ошибка при инициализации базы данных: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

